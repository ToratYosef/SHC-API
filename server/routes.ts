// @ts-nocheck
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import Stripe from "stripe";
import { z } from "zod";
import {
  insertUserSchema,
  insertCompanySchema,
  insertShippingAddressSchema,
  insertSavedListSchema,
  insertSavedListItemSchema,
} from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";

// Import route modules from functions folder
import { createEmailsRouter } from "./routes/emails";
import { createImeiRouter } from "./routes/imei";
import { createLabelsRouter } from "./routes/labels";
import { createOrdersRouter } from "./routes/orders";
import { createWebhookRouter } from "./routes/webhook";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

// Initialize Stripe (only if key is provided)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
  });
}

// Session user type
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Helper to fetch the first company a user belongs to
const getUserPrimaryCompany = async (userId: string) => {
  const companyUsers = await storage.getCompanyUsersByUserId(userId);
  if (companyUsers.length === 0) {
    return null;
  }

  return {
    companyId: companyUsers[0].companyId,
    roleInCompany: companyUsers[0].roleInCompany,
  } as const;
};

const selectPriceTierForQuantity = (tiers: any[], quantity: number) => {
  const activeTiers = tiers.filter((tier) => tier.isActive !== false);
  const sortedTiers = activeTiers.sort((a, b) => a.minQuantity - b.minQuantity);

  const exactMatch = sortedTiers.find((tier) => {
    const withinMin = quantity >= tier.minQuantity;
    const withinMax = tier.maxQuantity ? quantity <= tier.maxQuantity : true;
    return withinMin && withinMax;
  });

  if (exactMatch) return exactMatch;

  // If no explicit range matched, fall back to the highest eligible min quantity
  const fallback = [...sortedTiers]
    .filter((tier) => quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  return fallback || null;
};

// Middleware to check if user is admin or super_admin
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  // Configure session middleware
  const sessionSecret = process.env.SESSION_SECRET || 'default-secret-change-in-production';

  const MemoryStore = createMemoryStore(session);

  app.use(session({
    store: new MemoryStore({
      checkPeriod: 24 * 60 * 60 * 1000,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  // ==================== REGISTER MIGRATED ROUTES FROM FUNCTIONS FOLDER ====================
  
  // Register all migrated route modules
  app.use("/api", createEmailsRouter());
  app.use("/api", createImeiRouter());
  app.use("/api", createLabelsRouter());
  app.use("/api", createOrdersRouter());
  app.use("/api", createWebhookRouter());

  // ==================== HEALTH CHECK ====================
  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "SecondHandCell API",
      version: "1.0.0"
    });
  });

  // ==================== PUBLIC API ROUTES (No Auth Required) ====================
  
  // Site settings (public)
  app.get("/api/settings", async (req, res) => {
    try {
      const payload = {
        logoUrl: process.env.SITE_LOGO_URL || null,
        siteName: "SecondHandCell",
      };
      res.json(payload);
    } catch (error: any) {
      console.error("Get settings error:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  // Get public categories
  app.get("/api/public/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Get public categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get public catalog (devices without pricing)
  app.get("/api/public/catalog", async (req, res) => {
    try {
      const devices = await storage.getAllDeviceModels();
      
      // For public catalog, return device info without pricing details
      const publicDevices = await Promise.all(
        devices.map(async (device) => {
          const variants = await storage.getDeviceVariantsByModelId(device.id);
          const category = await storage.getCategory(device.categoryId);
          
          // Extract unique values (defensive filtering even though schema is .notNull())
          const conditionValues = variants.map(v => v.conditionGrade).filter(c => c !== null && c !== undefined);
          const storageValues = variants.map(v => v.storage).filter(s => s !== null && s !== undefined);
          const colorValues = variants.map(v => v.color).filter(c => c !== null && c !== undefined);
          
          return {
            id: device.id,
            brand: device.brand,
            marketingName: device.marketingName,
            slug: device.slug,
            categoryId: device.categoryId,
            categoryName: category?.name || "Unknown",
            imageUrl: device.imageUrl,
            description: device.description,
            variantCount: variants.length,
            // Don't include pricing for public view
            availableConditions: Array.from(new Set(conditionValues)),
            availableStorage: Array.from(new Set(storageValues)),
            availableColors: Array.from(new Set(colorValues)),
          };
        })
      );

      res.json(publicDevices);
    } catch (error: any) {
      console.error("Get public catalog error:", error);
      res.status(500).json({ error: "Failed to fetch catalog" });
    }
  });

  // ==================== AUTH ROUTES ====================
  
  // Register new user and company
  app.post("/api/auth/register", async (req, res) => {
    try {
      const registerSchema = z.object({
        // User data
        name: z.string(),
        email: z.string().email(),
        phone: z.string(),
        password: z.string().min(6),
        // Company data
        companyName: z.string(),
        legalName: z.string(),
        website: z.string().optional(),
        taxId: z.string().optional(),
        businessType: z.string(),
        // Address data
        contactName: z.string(),
        addressPhone: z.string(),
        street1: z.string(),
        street2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
      });

      const data = registerSchema.parse(req.body);

      // Check if user exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "buyer",
        isActive: true,
      });

      // Create company
      const company = await storage.createCompany({
        name: data.companyName,
        legalName: data.legalName,
        website: data.website || null,
        taxId: data.taxId || null,
        primaryPhone: data.phone,
        billingEmail: data.email,
        status: "pending_review",
        creditLimit: "0",
      });

      // Link user to company as owner
      await storage.createCompanyUser({
        userId: user.id,
        companyId: company.id,
        roleInCompany: "owner",
      });

      // Create first shipping address
      await storage.createShippingAddress({
        companyId: company.id,
        contactName: data.contactName,
        phone: data.addressPhone,
        street1: data.street1,
        street2: data.street2 || null,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: "USA",
        isDefault: true,
      });

      res.json({ success: true, userId: user.id, companyId: company.id });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is inactive" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Forgot Password - Request reset token
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists - security best practice
        return res.json({ success: true, message: "If the email exists, a reset link has been sent" });
      }

      // Generate a simple reset token (in production, use crypto.randomBytes)
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the reset token
      await storage.updateUser(user.id, { 
        resetToken,
        resetTokenExpiry,
      });

      // In a real application, send email here
      // For now, we'll just log it (you can integrate with SendGrid, AWS SES, etc.)
      console.log(`Password reset link for ${email}: /reset-password?token=${resetToken}`);
      
      // For development/demo, return the token in the response
      // REMOVE THIS IN PRODUCTION
      if (!isProduction) {
        return res.json({ 
          success: true, 
          message: "Reset link generated",
          devToken: resetToken // Only for development
        });
      }

      res.json({ success: true, message: "If the email exists, a reset link has been sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset Password - Validate token and update password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Find user by reset token
      const users = await storage.getAllUsers();
      const user = users.find(u => u.resetToken === token);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Get current user
  const getMeHandler = async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's company
      const companyUsers = await storage.getCompanyUsersByUserId(user.id);
      let companyId = null;
      if (companyUsers.length > 0) {
        companyId = companyUsers[0].companyId;
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        companyId,
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  };
  
  app.get("/api/auth/me", requireAuth, getMeHandler);
  app.get("/api/me", requireAuth, getMeHandler);

  // Get the company for the authenticated user
  app.get("/api/auth/company", requireAuth, async (req, res) => {
    try {
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext) {
        return res.status(404).json({ error: "User does not belong to a company" });
      }

      const company = await storage.getCompany(companyContext.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.json({
        ...company,
        roleInCompany: companyContext.roleInCompany,
      });
    } catch (error: any) {
      console.error("Get company error:", error);
      res.status(500).json({ error: "Failed to load company" });
    }
  });

  // ==================== PROFILE ROUTES ====================
  
  // Get user profile with company details
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's company information
      const companyUsers = await storage.getCompanyUsersByUserId(user.id);
      let company = null;
      let roleInCompany = null;

      if (companyUsers.length > 0) {
        company = await storage.getCompany(companyUsers[0].companyId);
        roleInCompany = companyUsers[0].roleInCompany;
      }

      // Exclude password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      res.json({
        ...userWithoutPassword,
        company,
        roleInCompany,
      });
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  // Update user profile
  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
      });

      const updates = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(req.session.userId!, updates);

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { passwordHash, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Update profile error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Change password
  app.post("/api/profile/password", requireAuth, async (req, res) => {
    try {
      const passwordSchema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      });

      const { currentPassword, newPassword } = passwordSchema.parse(req.body);

      // Get user and verify current password
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password and update
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { passwordHash: newPasswordHash });

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Change password error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid password data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // ==================== CATALOG ROUTES ====================
  
  // Get all device models
  app.get("/api/catalog/models", async (req, res) => {
    try {
      const models = await storage.getAllDeviceModels();
      res.json(models);
    } catch (error: any) {
      console.error("Get models error:", error);
      res.status(500).json({ error: "Failed to get models" });
    }
  });

  // Get device model by slug
  app.get("/api/catalog/models/:slug", async (req, res) => {
    try {
      const model = await storage.getDeviceModelBySlug(req.params.slug);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }

      const variants = await storage.getDeviceVariantsByModelId(model.id);
      
      // Get inventory and price tiers for each variant
      const variantsWithDetails = await Promise.all(
        variants.map(async (variant) => {
          const inventory = await storage.getInventoryByVariantId(variant.id);
          const priceTiers = await storage.getPriceTiersByVariantId(variant.id);
          return { ...variant, inventory, priceTiers };
        })
      );

      res.json({ ...model, variants: variantsWithDetails });
    } catch (error: any) {
      console.error("Get model error:", error);
      res.status(500).json({ error: "Failed to get model" });
    }
  });

  // Get full catalog with variants
  app.get("/api/catalog", async (req, res) => {
    try {
      const models = await storage.getAllDeviceModels();
      
      const modelsWithVariants = await Promise.all(
        models.map(async (model) => {
          const variants = await storage.getDeviceVariantsByModelId(model.id);
          
          // Get inventory and price tiers for each variant
          const variantsWithDetails = await Promise.all(
            variants.map(async (variant) => {
              const inventory = await storage.getInventoryByVariantId(variant.id);
              const priceTiers = await storage.getPriceTiersByVariantId(variant.id);
              return { ...variant, inventory, priceTiers, deviceModel: model };
            })
          );
          
          return { ...model, variants: variantsWithDetails };
        })
      );

      res.json(modelsWithVariants);
    } catch (error: any) {
      console.error("Get catalog error:", error);
      res.status(500).json({ error: "Failed to get catalog" });
    }
  });

  // Get all categories
  const getCategoriesHandler = async (req: any, res: any) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Failed to get categories" });
    }
  };
  
  app.get("/api/catalog/categories", getCategoriesHandler);
  app.get("/api/categories", getCategoriesHandler);

  // Get brands (unique brands from device models)
  app.get("/api/brands", async (req, res) => {
    try {
      const models = await storage.getAllDeviceModels();
      const brandsSet = new Set(models.map(m => m.brand));
      // Sort alphabetically for consistent indexing
      const brandsArray = Array.from(brandsSet).sort();
      const brands = brandsArray.map((brand, index) => ({
        id: `brand-${index}`,
        name: brand,
        slug: brand.toLowerCase().replace(/\s+/g, '-'),
      }));
      res.json(brands);
    } catch (error: any) {
      console.error("Get brands error:", error);
      res.status(500).json({ error: "Failed to get brands" });
    }
  });

  // Get models by brand (RESTful route: /api/brands/:brandSlug/models)
  app.get("/api/brands/:brandSlug/models", async (req, res) => {
    try {
      const { brandSlug } = req.params;
      const models = await storage.getAllDeviceModels();
      
      // Convert slug to brand name (e.g., "apple" -> "Apple", "samsung" -> "Samsung")
      const brandName = brandSlug.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      const filteredModels = models.filter(m => 
        m.brand.toLowerCase() === brandSlug.toLowerCase()
      );
      
      const result = filteredModels.map(m => ({
        id: m.id,
        brandId: `brand-${m.brand.toLowerCase().replace(/\s+/g, '-')}`,
        name: m.marketingName || m.name,
        slug: m.slug,
        year: null,
      }));
      
      res.json(result);
    } catch (error: any) {
      console.error("Get models by brand slug error:", error);
      res.status(500).json({ error: "Failed to get models" });
    }
  });

  // Get models by brand (query param route: /api/models?brandId=brand-0)
  app.get("/api/models", async (req, res) => {
    try {
      const { brandId } = req.query;
      const models = await storage.getAllDeviceModels();
      
      console.log('[/api/models] Total models:', models.length);
      console.log('[/api/models] brandId param:', brandId);
      
      // If no brandId, return all models
      if (!brandId || typeof brandId !== 'string') {
        const result = models.map(m => ({
          id: m.id,
          brandId: `brand-${m.brand.toLowerCase().replace(/\s+/g, '-')}`,
          name: m.marketingName || m.name,
          slug: m.slug,
          year: null,
        }));
        return res.json(result);
      }
      
      // Extract brand name from brandId
      let brandName = '';
      if (brandId.startsWith('brand-')) {
        const brandPart = brandId.replace('brand-', '');
        // Check if it's a number (brand-0) or slug (brand-apple)
        if (/^\d+$/.test(brandPart)) {
          // Get brand by index - sort brands alphabetically for consistency
          const brandsSet = new Set(models.map(m => m.brand));
          const brandsArray = Array.from(brandsSet).sort();
          const index = parseInt(brandPart, 10);
          brandName = brandsArray[index] || '';
          console.log('[/api/models] Brands array:', brandsArray);
          console.log('[/api/models] Selected brand by index', index, ':', brandName);
        } else {
          // Convert slug to proper name (apple -> Apple, samsung -> Samsung)
          brandName = brandPart.charAt(0).toUpperCase() + brandPart.slice(1);
          console.log('[/api/models] Selected brand by slug:', brandName);
        }
      }
      
      if (!brandName) {
        console.log('[/api/models] No brand name found, returning empty');
        return res.json([]);
      }
      
      // Filter models by brand (case-insensitive)
      const filteredModels = models.filter(m => 
        m.brand.toLowerCase() === brandName.toLowerCase()
      );
      
      console.log('[/api/models] Filtered models count:', filteredModels.length);
      
      const result = filteredModels.map(m => ({
        id: m.id,
        brandId: `brand-${m.brand.toLowerCase().replace(/\s+/g, '-')}`,
        name: m.marketingName || m.name,
        slug: m.slug,
        year: null,
      }));
      
      res.json(result);
    } catch (error: any) {
      console.error("Get models error:", error);
      res.status(500).json({ error: "Failed to get models" });
    }
  });

  // Get device conditions
  app.get("/api/conditions", async (req, res) => {
    try {
      const conditions = [
        { id: 'A', name: 'Like New', description: 'Flawless condition, no visible wear' },
        { id: 'B', name: 'Good', description: 'Minor signs of use, fully functional' },
        { id: 'C', name: 'Fair', description: 'Moderate wear, fully functional' },
        { id: 'D', name: 'Poor', description: 'Heavy wear but works' },
      ];
      res.json(conditions);
    } catch (error: any) {
      console.error("Get conditions error:", error);
      res.status(500).json({ error: "Failed to get conditions" });
    }
  });

  // ==================== CART ROUTES ====================
  
  // Get user's cart
  app.get("/api/cart", requireAuth, async (req, res) => {
    try {
      let cart = await storage.getCartByUserId(req.session.userId!);
      
      // Create cart if it doesn't exist
      if (!cart) {
        const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
        if (companyUsers.length === 0) {
          return res.status(400).json({ error: "No company found for user" });
        }
        
        cart = await storage.createCart({
          userId: req.session.userId!,
          companyId: companyUsers[0].companyId,
        });
      }

      const items = await storage.getCartItems(cart.id);
      
      // Get full details for each cart item
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          const variant = await storage.getDeviceVariant(item.deviceVariantId);
          const model = variant ? await storage.getDeviceModel(variant.deviceModelId) : null;
          
          return { 
            ...item, 
            unitPrice: item.unitPriceSnapshot, // Map to unitPrice for frontend
            variant: variant ? {
              ...variant,
              deviceModel: model
            } : null
          };
        })
      );

      res.json({ cart, items: itemsWithDetails });
    } catch (error: any) {
      console.error("Get cart error:", error);
      res.status(500).json({ error: "Failed to get cart" });
    }
  });

  // Add item to cart
  app.post("/api/cart/items", requireAuth, async (req, res) => {
    try {
      const { deviceVariantId, quantity } = req.body;

      let cart = await storage.getCartByUserId(req.session.userId!);
      if (!cart) {
        const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
        cart = await storage.createCart({
          userId: req.session.userId!,
          companyId: companyUsers[0].companyId,
        });
      }

      // Get price tier for quantity with smart fallback logic
      const priceTiers = await storage.getPriceTiersByVariantId(deviceVariantId);
      const applicableTier = priceTiers.find(
        tier => quantity >= tier.minQuantity && (!tier.maxQuantity || quantity <= tier.maxQuantity)
      );
      
      let unitPrice = applicableTier?.unitPrice;
      
      // Fallback logic for mismatched quantities
      if (!unitPrice && priceTiers.length > 0) {
        const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity);
        const lowestTier = sortedTiers[0];
        const highestTier = sortedTiers[sortedTiers.length - 1];
        
        // If quantity is below the lowest tier minimum, use lowest tier price
        if (quantity < lowestTier.minQuantity) {
          unitPrice = lowestTier.unitPrice;
        }
        // If quantity exceeds the highest tier's minimum, use highest tier price (bulk discount)
        else if (quantity >= highestTier.minQuantity) {
          unitPrice = highestTier.unitPrice;
        }
        // Quantity is in a gap between tiers, use lowest tier as safe default
        else {
          unitPrice = lowestTier.unitPrice;
        }
      }
      
      // Fallback: if no tiers exist, use variant's minPrice
      if (!unitPrice) {
        const variant = await storage.getDeviceVariant(deviceVariantId);
        unitPrice = variant?.minPrice;
      }
      
      // If still no price, reject the request
      if (!unitPrice) {
        return res.status(400).json({ 
          error: "Unable to determine price for this item. Please contact support." 
        });
      }

      const item = await storage.addCartItem({
        cartId: cart.id,
        deviceVariantId,
        quantity,
        unitPriceSnapshot: unitPrice,
      });

      res.json(item);
    } catch (error: any) {
      console.error("Add cart item error:", error);
      res.status(500).json({ error: "Failed to add item to cart" });
    }
  });

  // Update cart item quantity
  app.patch("/api/cart/items/:id", requireAuth, async (req, res) => {
    try {
      const { quantity } = req.body;
      const item = await storage.updateCartItem(req.params.id, { quantity });
      res.json(item);
    } catch (error: any) {
      console.error("Update cart item error:", error);
      res.status(500).json({ error: "Failed to update cart item" });
    }
  });

  // Remove item from cart
  app.delete("/api/cart/items/:id", requireAuth, async (req, res) => {
    try {
      await storage.removeCartItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Remove cart item error:", error);
      res.status(500).json({ error: "Failed to remove cart item" });
    }
  });

  // ==================== ORDER ROUTES ====================
  
  // Create order from cart
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const { paymentMethod, shippingAddressId, billingAddressId, notes } = req.body;

      // Validate required fields
      if (!shippingAddressId) {
        return res.status(400).json({ error: "Shipping address is required" });
      }

      if (!billingAddressId) {
        return res.status(400).json({ error: "Billing address is required" });
      }

      // Validate payment method
      if (paymentMethod === "card" && !stripe) {
        return res.status(503).json({ error: "Card payment is not available. Please select another payment method." });
      }

      const cart = await storage.getCartByUserId(req.session.userId!);
      if (!cart) {
        return res.status(400).json({ error: "Cart not found" });
      }

      const items = await storage.getCartItems(cart.id);
      if (items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        subtotal += parseFloat(item.unitPriceSnapshot) * item.quantity;
      }

      const shippingCost = 25; // Flat rate for now
      const taxAmount = subtotal * 0.08; // 8% tax
      const total = subtotal + shippingCost + taxAmount;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      // Create order
      const order = await storage.createOrder({
        orderNumber,
        companyId: cart.companyId,
        createdByUserId: req.session.userId!,
        status: "pending_payment",
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: "0",
        total: total.toFixed(2),
        currency: "USD",
        paymentStatus: "unpaid",
        paymentMethod: paymentMethod || "card",
        shippingAddressId: shippingAddressId || null,
        billingAddressId: billingAddressId || null,
        notesCustomer: notes || null,
      });

      // Create order items
      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          deviceVariantId: item.deviceVariantId,
          quantity: item.quantity,
          unitPrice: item.unitPriceSnapshot,
          lineTotal: (parseFloat(item.unitPriceSnapshot) * item.quantity).toFixed(2),
        });
      }

      // Clear cart
      await storage.clearCart(cart.id);

      res.json(order);
    } catch (error: any) {
      console.error("Create order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Get user's company orders
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
      if (companyUsers.length === 0) {
        return res.json([]);
      }

      const orders = await storage.getOrdersByCompanyId(companyUsers[0].companyId);
      res.json(orders);
    } catch (error: any) {
      console.error("Get orders error:", error);
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  // Get order by number
  app.get("/api/orders/:orderNumber", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrderByNumber(req.params.orderNumber);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const items = await storage.getOrderItems(order.id);
      const payments = await storage.getPaymentsByOrderId(order.id);
      const shipments = await storage.getShipmentsByOrderId(order.id);

      res.json({ ...order, items, payments, shipments });
    } catch (error: any) {
      console.error("Get order error:", error);
      res.status(500).json({ error: "Failed to get order" });
    }
  });

  // ==================== STRIPE PAYMENT ROUTES ====================
  
  // Create payment intent
  app.post("/api/create-payment-intent", requireAuth, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Payment processing is not configured" });
      }

      const { amount, orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      // Verify order exists and user has access
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
      const hasAccess = companyUsers.some((cu) => cu.companyId === order.companyId);
      if (!hasAccess && req.session.userRole !== "admin" && req.session.userRole !== "super_admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: "usd",
        metadata: { 
          orderId,
          userId: req.session.userId!,
          orderNumber: order.orderNumber,
        },
      });

      // Store payment intent ID on order for later verification
      await storage.updateOrder(orderId, {
        notesInternal: `Stripe Payment Intent: ${paymentIntent.id}`,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Create payment intent error:", error);
      res.status(500).json({ error: "Failed to create payment intent: " + error.message });
    }
  });

  // Confirm payment and update order
  app.post("/api/confirm-payment", requireAuth, async (req, res) => {
    try {
      const { orderId, paymentIntentId } = req.body;

      if (!orderId || !paymentIntentId) {
        return res.status(400).json({ error: "Order ID and payment intent ID are required" });
      }

      if (!stripe) {
        return res.status(503).json({ error: "Payment processing is not configured" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Verify user has access to this order
      const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
      const hasAccess = companyUsers.some((cu) => cu.companyId === order.companyId);
      if (!hasAccess && req.session.userRole !== "admin" && req.session.userRole !== "super_admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Retrieve and validate payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Verify payment intent belongs to this order
      if (paymentIntent.metadata.orderId !== orderId) {
        return res.status(400).json({ error: "Payment intent does not match order" });
      }

      // Verify payment succeeded
      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ error: "Payment has not succeeded" });
      }

      // Verify amount matches order total (in cents)
      const orderTotalCents = Math.round(parseFloat(order.total) * 100);
      if (paymentIntent.amount !== orderTotalCents) {
        return res.status(400).json({ error: "Payment amount does not match order total" });
      }

      // Update order status
      await storage.updateOrder(orderId, {
        status: "processing",
        paymentStatus: "paid",
      });

      // Record payment
      await storage.createPayment({
        orderId,
        amount: (paymentIntent.amount / 100).toFixed(2),
        currency: paymentIntent.currency.toUpperCase(),
        method: "card",
        status: "paid",
        stripePaymentIntentId: paymentIntent.id,
        processedAt: new Date(),
      });

      res.json({ success: true, order });
    } catch (error: any) {
      console.error("Confirm payment error:", error);
      res.status(500).json({ error: "Failed to confirm payment: " + error.message });
    }
  });

  // ==================== COMPANY ROUTES ====================
  
  // Get company by ID (buyer can only access their own)
  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Check if user is admin or member of this company
      if (req.session.userRole !== "admin" && req.session.userRole !== "super_admin") {
        const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
        const isMember = companyUsers.some((cu) => cu.companyId === req.params.id);
        if (!isMember) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      // Get addresses
      const shippingAddresses = await storage.getShippingAddressesByCompanyId(company.id);
      const billingAddresses = await storage.getBillingAddressesByCompanyId(company.id);

      res.json({
        ...company,
        shippingAddresses,
        billingAddresses,
      });
    } catch (error: any) {
      console.error("Get company error:", error);
      res.status(500).json({ error: "Failed to get company" });
    }
  });
  
  // ==================== ADMIN ROUTES ====================
  
  // Get all companies (admin only)
  app.get("/api/admin/companies", requireAdmin, async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error: any) {
      console.error("Get companies error:", error);
      res.status(500).json({ error: "Failed to get companies" });
    }
  });

  // Bulk update companies (atomic) - e.g. approve many companies at once
  app.post("/api/admin/companies/bulk", requireAdmin, async (req, res) => {
    try {
      const { companyIds, status, creditLimit } = req.body;

      if (!Array.isArray(companyIds) || companyIds.length === 0) {
        return res.status(400).json({ error: "companyIds must be a non-empty array" });
      }

      // Perform atomic transaction using drizzle `db.transaction`
      const results = await db.transaction(async (tx) => {
        const updated: any[] = [];

        for (const id of companyIds) {
          const updates: any = {};
          if (status) updates.status = status;
          if (creditLimit !== undefined) updates.creditLimit = creditLimit;

          // Use direct update against tx for atomicity
          const [company] = await tx.update(schema.companies).set(updates).where(schema.companies.id.equals(id)).returning();
          if (company) {
            await tx.insert(schema.auditLogs).values({
              actorUserId: req.session.userId || null,
              companyId: id,
              action: "company_bulk_updated",
              entityType: "company",
              entityId: id,
              previousValues: null,
              newValues: JSON.stringify(updates),
            });
            updated.push(company);
          }
        }

        return updated;
      });

      res.json({ updated: results });
    } catch (error: any) {
      console.error("Bulk update companies error:", error);
      res.status(500).json({ error: "Failed to bulk update companies" });
    }
  });

  // Update company status (admin only)
  app.patch("/api/admin/companies/:id", requireAdmin, async (req, res) => {
    try {
      const { status, creditLimit } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (creditLimit !== undefined) updates.creditLimit = creditLimit;

      const company = await storage.updateCompany(req.params.id, updates);
      
      // Log the action
      await storage.createAuditLog({
        actorUserId: req.session.userId!,
        companyId: req.params.id,
        action: "company_updated",
        entityType: "company",
        entityId: req.params.id,
        newValues: JSON.stringify(updates),
      });

      res.json(company);
    } catch (error: any) {
      console.error("Update company error:", error);
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  // Add a single device (model + variant + inventory) (admin only)
  app.post("/api/admin/device-models", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        brand: z.string(),
        name: z.string(),
        marketingName: z.string().optional(),
        sku: z.string(),
        categorySlug: z.string().optional(),
        categoryName: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        variant: z.object({
          storage: z.string(),
          color: z.string(),
          conditionGrade: z.string(),
          networkLockStatus: z.string().default("unlocked"),
          internalCode: z.string().optional(),
          unitPrice: z.number(),
          quantity: z.number().min(0),
          minOrderQuantity: z.number().min(1).default(1),
        }),
      });

      const data = schema.parse(req.body);

      // Get or create category
      let categoryId: string | undefined;
      if (data.categorySlug) {
        const category = await storage.getCategoryBySlug(data.categorySlug);
        categoryId = category?.id;
      }

      if (!categoryId) {
        const fallbackName = data.categoryName || "smartphones";
        const fallbackSlug = slugify(fallbackName);
        const existing = await storage.getCategoryBySlug(fallbackSlug);
        if (existing) {
          categoryId = existing.id;
        } else {
          const created = await storage.createCategory({
            name: fallbackName,
            slug: fallbackSlug,
          });
          categoryId = created.id;
        }
      }

      const baseSlug = slugify(`${data.brand}-${data.name}-${data.sku}`);
      const model = await storage.createDeviceModel({
        brand: data.brand,
        name: data.name,
        marketingName: data.marketingName || data.name,
        sku: data.sku,
        slug: baseSlug,
        categoryId: categoryId!,
        imageUrl: data.imageUrl || null,
        description: data.description || null,
        isActive: true,
      });

      const variant = await storage.createDeviceVariant({
        deviceModelId: model.id,
        storage: data.variant.storage,
        color: data.variant.color,
        conditionGrade: data.variant.conditionGrade as any,
        networkLockStatus: data.variant.networkLockStatus as any,
        internalCode: data.variant.internalCode || null,
        isActive: true,
      });

      await storage.createInventory({
        deviceVariantId: variant.id,
        quantityAvailable: data.variant.quantity,
        minOrderQuantity: data.variant.minOrderQuantity,
        status: "in_stock",
      });

      await storage.createPriceTier({
        deviceVariantId: variant.id,
        minQuantity: 1,
        maxQuantity: null,
        unitPrice: data.variant.unitPrice,
        currency: "USD",
        isActive: true,
      });

      res.json({ model, variant });
    } catch (error: any) {
      console.error("Create device error:", error);
      res.status(500).json({ error: "Failed to create device" });
    }
  });

  // Update a variant and its pricing/inventory
  app.patch("/api/admin/device-variants/:id", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        storage: z.string().optional(),
        color: z.string().optional(),
        conditionGrade: z.string().optional(),
        networkLockStatus: z.string().optional(),
        unitPrice: z.number().optional(),
        quantity: z.number().optional(),
        minOrderQuantity: z.number().optional(),
      });

      const data = schema.parse(req.body);
      const variantId = req.params.id;

      const variant = await storage.getDeviceVariant(variantId);
      if (!variant) {
        return res.status(404).json({ error: "Variant not found" });
      }

      const updatedVariant = await storage.updateDeviceVariant(variantId, {
        storage: data.storage ?? variant.storage,
        color: data.color ?? variant.color,
        conditionGrade: (data.conditionGrade as any) ?? variant.conditionGrade,
        networkLockStatus: (data.networkLockStatus as any) ?? variant.networkLockStatus,
      });

      let inventory = await storage.getInventoryByVariantId(variantId);
      if (data.quantity !== undefined || data.minOrderQuantity !== undefined) {
        if (inventory) {
          inventory = await storage.updateInventory(inventory.id, {
            quantityAvailable: data.quantity ?? inventory.quantityAvailable,
            minOrderQuantity: data.minOrderQuantity ?? inventory.minOrderQuantity,
          });
        } else {
          inventory = await storage.createInventory({
            deviceVariantId: variantId,
            quantityAvailable: data.quantity ?? 0,
            minOrderQuantity: data.minOrderQuantity ?? 1,
            status: "in_stock",
          });
        }
      }

      let priceTier;
      if (data.unitPrice !== undefined) {
        const tiers = await storage.getPriceTiersByVariantId(variantId);
        if (tiers.length > 0) {
          priceTier = await storage.updatePriceTier(tiers[0].id, { unitPrice: data.unitPrice });
        } else {
          priceTier = await storage.createPriceTier({
            deviceVariantId: variantId,
            minQuantity: 1,
            maxQuantity: null,
            unitPrice: data.unitPrice,
            currency: "USD",
            isActive: true,
          });
        }
      }

      res.json({ variant: updatedVariant, inventory, priceTier });
    } catch (error: any) {
      console.error("Update variant error:", error);
      res.status(500).json({ error: "Failed to update variant" });
    }
  });

  // Delete a variant entirely
  app.delete("/api/admin/device-variants/:id", requireAdmin, async (req, res) => {
    try {
      const variantId = req.params.id;
      await storage.deletePriceTiersByVariantId(variantId);
      await storage.deleteInventoryByVariantId(variantId);
      await storage.deleteDeviceVariant(variantId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete variant error:", error);
      res.status(500).json({ error: "Failed to delete variant" });
    }
  });

  // Bulk import devices (admin only)
  app.post("/api/admin/device-import", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        devices: z.array(
          z.object({
            brand: z.string(),
            name: z.string(),
            marketingName: z.string().optional(),
            sku: z.string(),
            categorySlug: z.string().optional(),
            categoryName: z.string().optional(),
            variants: z.array(
              z.object({
                storage: z.string(),
                color: z.string(),
                conditionGrade: z.string(),
                networkLockStatus: z.string().default("unlocked"),
                unitPrice: z.number(),
                quantity: z.number().min(0),
              })
            ),
          })
        ),
      });

      const data = schema.parse(req.body);
      const created: any[] = [];

      for (const device of data.devices) {
        // Reuse single-create logic
        const categorySlug = device.categorySlug || slugify(device.categoryName || "smartphones");
        let categoryId: string | undefined;
        const existingCategory = await storage.getCategoryBySlug(categorySlug);
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const createdCategory = await storage.createCategory({
            name: device.categoryName || device.brand,
            slug: categorySlug,
          });
          categoryId = createdCategory.id;
        }

        const model = await storage.createDeviceModel({
          brand: device.brand,
          name: device.name,
          marketingName: device.marketingName || device.name,
          sku: device.sku,
          slug: slugify(`${device.brand}-${device.name}-${device.sku}`),
          categoryId: categoryId!,
          isActive: true,
        });

        for (const variantData of device.variants) {
          const variant = await storage.createDeviceVariant({
            deviceModelId: model.id,
            storage: variantData.storage,
            color: variantData.color,
            conditionGrade: variantData.conditionGrade as any,
            networkLockStatus: variantData.networkLockStatus as any,
            isActive: true,
          });

          await storage.createInventory({
            deviceVariantId: variant.id,
            quantityAvailable: variantData.quantity,
            minOrderQuantity: 1,
            status: "in_stock",
          });

          await storage.createPriceTier({
            deviceVariantId: variant.id,
            minQuantity: 1,
            maxQuantity: null,
            unitPrice: variantData.unitPrice,
            currency: "USD",
            isActive: true,
          });

          created.push({ model, variant });
        }
      }

      res.json({ created });
    } catch (error: any) {
      console.error("Import devices error:", error);
      res.status(500).json({ error: "Failed to import devices" });
    }
  });

  // ==================== QUOTE ROUTES ====================
  
  // Create quote
  app.post("/api/quotes", requireAuth, async (req, res) => {
    try {
      const { items, notes, validUntil } = req.body;

      // Get user's company
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext) {
        return res.status(400).json({ error: "No company found for user" });
      }
      const companyId = companyContext.companyId;
      
      // Generate quote number
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const quoteNumber = `QT-${timestamp}-${random}`;
      
      // Determine pricing for each item
      let subtotal = 0;
      const preparedItems = [] as { deviceVariantId: string; quantity: number; unitPrice: number; }[];

      for (const item of items) {
        const tiers = await storage.getPriceTiersByVariantId(item.deviceVariantId);
        const matchingTier = selectPriceTierForQuantity(tiers, item.quantity);

        if (!matchingTier) {
          return res.status(400).json({ error: "No pricing available for one or more items" });
        }

        const unitPrice = parseFloat(matchingTier.unitPrice);
        if (isNaN(unitPrice)) {
          return res.status(400).json({ error: "Invalid pricing data for selected item" });
        }

        preparedItems.push({
          deviceVariantId: item.deviceVariantId,
          quantity: item.quantity,
          unitPrice,
        });

        subtotal += unitPrice * item.quantity;
      }

      const shippingEstimate = 0;
      const taxEstimate = 0;
      const totalEstimate = subtotal + shippingEstimate + taxEstimate;

      // Create quote with calculated totals
      const quote = await storage.createQuote({
        quoteNumber,
        companyId,
        createdByUserId: req.session.userId!,
        status: "draft",
        validUntil: validUntil ? new Date(validUntil) : null,
        subtotal: subtotal.toFixed(2),
        shippingEstimate: shippingEstimate.toFixed(2),
        taxEstimate: taxEstimate.toFixed(2),
        totalEstimate: totalEstimate.toFixed(2),
        currency: "USD",
      });

      // Create quote items with pricing
      for (const item of preparedItems) {
        await storage.createQuoteItem({
          quoteId: quote.id,
          deviceVariantId: item.deviceVariantId,
          quantity: item.quantity,
          proposedUnitPrice: item.unitPrice.toFixed(2),
          lineTotalEstimate: (item.unitPrice * item.quantity).toFixed(2),
        });
      }

      res.json(quote);
    } catch (error: any) {
      console.error("Create quote error:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });
  
  // Get quote by ID
  app.get("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Check authorization
      if (req.session.userRole !== "admin" && req.session.userRole !== "super_admin") {
        const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
        const isMember = companyUsers.some((cu) => cu.companyId === quote.companyId);
        if (!isMember) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const items = await storage.getQuoteItems(quote.id);
      
      // Get full details for each quote item
      const itemsWithDetails = await Promise.all(
        items.map(async (item) => {
          const variant = await storage.getDeviceVariant(item.deviceVariantId);
          const model = variant ? await storage.getDeviceModel(variant.deviceModelId) : null;
          return { ...item, variant, model };
        })
      );
      
      res.json({ ...quote, items: itemsWithDetails });
    } catch (error: any) {
      console.error("Get quote error:", error);
      res.status(500).json({ error: "Failed to get quote" });
    }
  });
  
  // Get quotes for a company
  app.get("/api/companies/:companyId/quotes", requireAuth, async (req, res) => {
    try {
      // Check authorization
      if (req.session.userRole !== "admin" && req.session.userRole !== "super_admin") {
        const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
        const isMember = companyUsers.some((cu) => cu.companyId === req.params.companyId);
        if (!isMember) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const quotes = await storage.getQuotesByCompanyId(req.params.companyId);
      res.json(quotes);
    } catch (error: any) {
      console.error("Get company quotes error:", error);
      res.status(500).json({ error: "Failed to get company quotes" });
    }
  });
  
  // Update quote (admin only for pricing, buyers can update notes)
  app.patch("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Buyers can only update their own company's quotes
      if (req.session.userRole !== "admin" && req.session.userRole !== "super_admin") {
        const companyUsers = await storage.getCompanyUsersByUserId(req.session.userId!);
        const isMember = companyUsers.some((cu) => cu.companyId === quote.companyId);
        if (!isMember) {
          return res.status(403).json({ error: "Access denied" });
        }
        
        // Buyers can only update status to accepted/rejected
        const allowedUpdates = ["status"];
        const updates: any = {};
        if (req.body.status && ["accepted", "rejected"].includes(req.body.status)) {
          updates.status = req.body.status;
        }
        
        const updatedQuote = await storage.updateQuote(req.params.id, updates);
        return res.json(updatedQuote);
      }
      
      // Admins can update anything
      const updates: any = {};
      if (req.body.status) updates.status = req.body.status;
      if (req.body.validUntil) updates.validUntil = new Date(req.body.validUntil);
      
      // Validate and parse pricing fields - reject if invalid
      const validatePricing = (value: any, fieldName: string): string | null => {
        if (value === undefined || value === null) return null; // Not being updated
        if (value === "") {
          return `${fieldName} cannot be empty`;
        }
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
          return `${fieldName} must be a valid number`;
        }
        if (parsed < 0) {
          return `${fieldName} cannot be negative`;
        }
        return null; // Valid
      };
      
      // Validate all pricing fields if provided
      const errors: string[] = [];
      if (req.body.subtotal !== undefined) {
        const error = validatePricing(req.body.subtotal, "Subtotal");
        if (error) errors.push(error);
        else updates.subtotal = parseFloat(req.body.subtotal).toFixed(2);
      }
      if (req.body.shippingEstimate !== undefined) {
        const error = validatePricing(req.body.shippingEstimate, "Shipping estimate");
        if (error) errors.push(error);
        else updates.shippingEstimate = parseFloat(req.body.shippingEstimate).toFixed(2);
      }
      if (req.body.taxEstimate !== undefined) {
        const error = validatePricing(req.body.taxEstimate, "Tax estimate");
        if (error) errors.push(error);
        else updates.taxEstimate = parseFloat(req.body.taxEstimate).toFixed(2);
      }
      if (req.body.totalEstimate !== undefined) {
        const error = validatePricing(req.body.totalEstimate, "Total estimate");
        if (error) errors.push(error);
        else updates.totalEstimate = parseFloat(req.body.totalEstimate).toFixed(2);
      }
      
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(", ") });
      }
      
      // If transitioning to "sent" status, ensure pricing is complete
      if (updates.status === "sent") {
        const finalSubtotal = updates.subtotal || quote.subtotal;
        const finalTotal = updates.totalEstimate || quote.totalEstimate;
        
        if (parseFloat(finalTotal) <= 0) {
          return res.status(400).json({ 
            error: "Cannot send quote without valid pricing. Total estimate must be greater than 0." 
          });
        }
      }
      
      const updatedQuote = await storage.updateQuote(req.params.id, updates);
      
      // Log the action
      await storage.createAuditLog({
        actorUserId: req.session.userId!,
        companyId: quote.companyId,
        action: "quote_updated",
        entityType: "quote",
        entityId: req.params.id,
        newValues: JSON.stringify(updates),
      });
      
      res.json(updatedQuote);
    } catch (error: any) {
      console.error("Update quote error:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });
  
  // Get all quotes (admin only)
  app.get("/api/admin/quotes", requireAdmin, async (req, res) => {
    try {
      // Get all companies and their quotes
      const companies = await storage.getAllCompanies();
      const allQuotes = await Promise.all(
        companies.map(async (company) => {
          const quotes = await storage.getQuotesByCompanyId(company.id);
          return quotes.map((quote) => ({ ...quote, company }));
        })
      );
      
      res.json(allQuotes.flat());
    } catch (error: any) {
      console.error("Get all quotes error:", error);
      res.status(500).json({ error: "Failed to get quotes" });
    }
  });

  // Get all orders (admin only)
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      console.error("Get all orders error:", error);
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  // Stream orders as CSV (admin only)
  app.get("/api/admin/export/orders.csv", requireAdmin, async (req, res) => {
    try {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      const filename = `orders-${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      // Pagination for large exports
      const pageSize = parseInt(String(req.query.pageSize || "500"), 10) || 500;

      const csvEscape = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      // header
      res.write(["orderNumber", "companyName", "companyId", "status", "paymentStatus", "total", "currency", "createdAt", "shippingState", "shippingCity", "items"].join(",") + "\n");

      // Determine total rows
      const totalOrders = (await db.select().from(schema.orders)).length;
      res.setHeader("X-Total-Rows", String(totalOrders));

      // Use sqlite prepared statement iterate() for efficient cursor-like streaming
      const stmt = sqlite.prepare(`SELECT * FROM orders ORDER BY created_at ASC`);
      for (const order of stmt.iterate()) {
        const items = await storage.getOrderItems(order.id);
        const company = await storage.getCompany(order.companyId);

        let shippingState = "";
        let shippingCity = "";
        if (order.shipping_address_id) {
          const addrStmt = sqlite.prepare(`SELECT * FROM shipping_addresses WHERE id = ?`);
          const addr = addrStmt.get(order.shipping_address_id);
          if (addr) {
            shippingState = addr.state || "";
            shippingCity = addr.city || "";
          }
        }

        const itemsSummary = items.map(i => `${i.quantity}x ${i.deviceVariantId} @ ${i.unitPrice}`).join("; ");

        const row = [
          csvEscape(order.order_number || order.orderNumber),
          csvEscape(company?.name || ""),
          csvEscape(order.company_id || order.companyId),
          csvEscape(order.status),
          csvEscape(order.payment_status || order.paymentStatus),
          csvEscape(order.total),
          csvEscape(order.currency),
          csvEscape(new Date(order.created_at || order.createdAt).toISOString()),
          csvEscape(shippingState),
          csvEscape(shippingCity),
          csvEscape(itemsSummary),
        ];

        res.write(row.join(",") + "\n");
      }

      res.end();
    } catch (error: any) {
      console.error("Export orders CSV error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Failed to export orders" });
    }
  });

  // Stream inventory as CSV (admin only)
  app.get("/api/admin/export/inventory.csv", requireAdmin, async (req, res) => {
    try {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      const filename = `inventory-${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      // Pagination
      const pageSize = parseInt(String(req.query.pageSize || "500"), 10) || 500;

      const csvEscape = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      res.write(["modelSku", "brand", "modelName", "variantId", "storage", "color", "conditionGrade", "quantityAvailable", "minOrderQuantity", "unitPrice"].join(",") + "\n");

      // Determine total rows (rough estimate)
      const modelsCount = (await db.select().from(schema.deviceModels)).length;
      // sum variants count
      let totalRows = 0;
      const allModels = await db.select().from(schema.deviceModels);
      for (const m of allModels) {
        const variants = await db.select().from(schema.deviceVariants).where(schema.deviceVariants.deviceModelId.equals(m.id));
        totalRows += variants.length;
      }
      res.setHeader("X-Total-Rows", String(totalRows));

      // Stream models + variants in pages (paginate over device_models and their variants)
      // We'll paginate over device_models and pull variants per model to keep memory bounded.
      // Stream models and variants using sqlite iterator to avoid loading everything in memory
      const modelStmt = sqlite.prepare(`SELECT * FROM device_models ORDER BY created_at ASC`);
      for (const model of modelStmt.iterate()) {
        const variantStmt = sqlite.prepare(`SELECT * FROM device_variants WHERE device_model_id = ?`);
        for (const variant of variantStmt.iterate(model.id)) {
          const inventory = await storage.getInventoryByVariantId(variant.id);
          const tiers = await storage.getPriceTiersByVariantId(variant.id);
          const unitPrice = tiers && tiers.length > 0 ? tiers[0].unitPrice : "";

          const row = [
            csvEscape(model.sku),
            csvEscape(model.brand),
            csvEscape(model.name),
            csvEscape(variant.id),
            csvEscape(variant.storage),
            csvEscape(variant.color),
            csvEscape(variant.condition_grade || variant.conditionGrade),
            csvEscape(inventory?.quantityAvailable ?? 0),
            csvEscape(inventory?.minOrderQuantity ?? 1),
            csvEscape(unitPrice),
          ];

          res.write(row.join(",") + "\n");
        }
      }

      res.end();
    } catch (error: any) {
      console.error("Export inventory CSV error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Failed to export inventory" });
    }
  });

  // ====== ADMIN REPORTS (simple aggregates) ======

  // Top SKUs by quantity sold
  app.get("/api/admin/reports/top-skus", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || "20"), 10) || 20;
      const orders = await storage.getAllOrders();
      const skuMap = new Map();

      for (const order of orders) {
        const items = await storage.getOrderItems(order.id);
        for (const item of items) {
          const variant = await storage.getDeviceVariant(item.deviceVariantId);
          if (!variant) continue;
          const model = await storage.getDeviceModel(variant.deviceModelId);
          const key = model?.sku || variant.id;
          const existing = skuMap.get(key) || { sku: key, brand: model?.brand || "", name: model?.name || "", qty: 0, revenue: 0 };
          existing.qty += item.quantity;
          existing.revenue += (parseFloat(item.unitPrice) * item.quantity) || 0;
          skuMap.set(key, existing);
        }
      }

      const results = Array.from(skuMap.values()).sort((a, b) => b.qty - a.qty).slice(0, limit);
      res.json(results);
    } catch (error: any) {
      console.error("Top SKUs report error:", error);
      res.status(500).json({ error: "Failed to compute top SKUs" });
    }
  });

  // Sales by region (by shipping address state)
  app.get("/api/admin/reports/sales-by-region", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      const byState = new Map();

      for (const order of orders) {
        let state = "unknown";
        if (order.shippingAddressId) {
          const [addr] = await db.select().from(schema.shippingAddresses).where(schema.shippingAddresses.id.equals(order.shippingAddressId));
          if (addr) state = addr.state || "unknown";
        }

        const current = byState.get(state) || { state, total: 0, count: 0 };
        current.total += parseFloat(order.total) || 0;
        current.count += 1;
        byState.set(state, current);
      }

      res.json(Array.from(byState.values()).sort((a, b) => b.total - a.total));
    } catch (error: any) {
      console.error("Sales by region report error:", error);
      res.status(500).json({ error: "Failed to compute sales by region" });
    }
  });

  // Companies by status
  app.get("/api/admin/reports/companies-status", requireAdmin, async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      const map = new Map();
      for (const c of companies) {
        const key = c.status || "unknown";
        map.set(key, (map.get(key) || 0) + 1);
      }
      res.json(Array.from(map.entries()).map(([status, count]) => ({ status, count })));
    } catch (error: any) {
      console.error("Companies status report error:", error);
      res.status(500).json({ error: "Failed to compute companies status" });
    }
  });

  // Top suppliers by revenue (companies that act as suppliers)
  app.get("/api/admin/reports/top-suppliers", requireAdmin, async (req, res) => {
    try {
      // Aggregate order totals by company
      const orders = await storage.getAllOrders();
      const map = new Map();
      for (const o of orders) {
        const company = await storage.getCompany(o.companyId);
        const key = company?.id || o.companyId;
        const entry = map.get(key) || { companyId: key, name: company?.name || "Unknown", revenue: 0, orders: 0 };
        entry.revenue += parseFloat(o.total) || 0;
        entry.orders += 1;
        map.set(key, entry);
      }
      const results = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 50);
      res.json(results);
    } catch (error: any) {
      console.error("Top suppliers report error:", error);
      res.status(500).json({ error: "Failed to compute top suppliers" });
    }
  });

  // Sales time series (group by month)
  app.get("/api/admin/reports/sales-timeseries", requireAdmin, async (req, res) => {
    try {
      const { start, end } = req.query;
      const orders = await storage.getAllOrders();
      const byMonth = new Map();

      for (const o of orders) {
        const date = new Date(o.createdAt);
        const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        const entry = byMonth.get(month) || { month, total: 0, count: 0 };
        entry.total += parseFloat(o.total) || 0;
        entry.count += 1;
        byMonth.set(month, entry);
      }

      const series = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
      res.json(series);
    } catch (error: any) {
      console.error("Sales timeseries error:", error);
      res.status(500).json({ error: "Failed to compute sales timeseries" });
    }
  });

  // Update order status (admin only)
  app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const updates: any = {};
      if (status) updates.status = status;

      const order = await storage.updateOrder(req.params.id, updates);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Log the action
      await storage.createAuditLog({
        actorUserId: req.session.userId!,
        action: "order_updated",
        entityType: "order",
        entityId: req.params.id,
        newValues: JSON.stringify(updates),
      });

      res.json(order);
    } catch (error: any) {
      console.error("Update order error:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Get all users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { role, isActive } = req.body;
      const updates: any = {};
      if (role) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;

      const user = await storage.updateUser(req.params.id, updates);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log the action
      await storage.createAuditLog({
        actorUserId: req.session.userId!,
        action: "user_updated",
        entityType: "user",
        entityId: req.params.id,
        newValues: JSON.stringify(updates),
      });

      res.json(user);
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // ====== Saved Lists Routes ======
  
  // Get all saved lists for user's company
  app.get("/api/saved-lists", requireAuth, async (req, res) => {
    try {
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext) {
        return res.status(400).json({ error: "User does not belong to a company" });
      }

      const lists = await storage.getSavedListsByCompanyId(companyContext.companyId);
      res.json(lists);
    } catch (error: any) {
      console.error("Get saved lists error:", error);
      res.status(500).json({ error: "Failed to get saved lists" });
    }
  });
  
  // Create a new saved list
  app.post("/api/saved-lists", requireAuth, async (req, res) => {
    try {
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext) {
        return res.status(400).json({ error: "User does not belong to a company" });
      }

      const parsed = insertSavedListSchema.safeParse({
        ...req.body,
        companyId: companyContext.companyId,
        createdByUserId: req.session.userId!,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const list = await storage.createSavedList(parsed.data);

      await storage.createAuditLog({
        actorUserId: req.session.userId!,
        companyId: companyContext.companyId,
        action: "saved_list_created",
        entityType: "saved_list",
        entityId: list.id,
        newValues: JSON.stringify(list),
      });
      
      res.json(list);
    } catch (error: any) {
      console.error("Create saved list error:", error);
      res.status(500).json({ error: "Failed to create saved list" });
    }
  });
  
  // Get a saved list by ID with items
  app.get("/api/saved-lists/:id", requireAuth, async (req, res) => {
    try {
      const list = await storage.getSavedList(req.params.id);
      if (!list) {
        return res.status(404).json({ error: "Saved list not found" });
      }

      // Verify user has access to this list (same company)
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext || list.companyId !== companyContext.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const items = await storage.getSavedListItems(req.params.id);
      res.json({ ...list, items });
    } catch (error: any) {
      console.error("Get saved list error:", error);
      res.status(500).json({ error: "Failed to get saved list" });
    }
  });
  
  // Delete a saved list
  app.delete("/api/saved-lists/:id", requireAuth, async (req, res) => {
    try {
      const list = await storage.getSavedList(req.params.id);
      if (!list) {
        return res.status(404).json({ error: "Saved list not found" });
      }

      // Verify user has access to this list (same company)
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext || list.companyId !== companyContext.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteSavedList(req.params.id);

      await storage.createAuditLog({
        actorUserId: req.session.userId!,
        companyId: companyContext.companyId,
        action: "saved_list_deleted",
        entityType: "saved_list",
        entityId: req.params.id,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete saved list error:", error);
      res.status(500).json({ error: "Failed to delete saved list" });
    }
  });
  
  // Add an item to a saved list
  app.post("/api/saved-lists/:id/items", requireAuth, async (req, res) => {
    try {
      const list = await storage.getSavedList(req.params.id);
      if (!list) {
        return res.status(404).json({ error: "Saved list not found" });
      }

      // Verify user has access to this list (same company)
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext || list.companyId !== companyContext.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const parsed = insertSavedListItemSchema.safeParse({
        ...req.body,
        savedListId: req.params.id,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const item = await storage.addSavedListItem(parsed.data);
      res.json(item);
    } catch (error: any) {
      console.error("Add saved list item error:", error);
      res.status(500).json({ error: "Failed to add item to saved list" });
    }
  });
  
  // Remove an item from a saved list
  app.delete("/api/saved-lists/:listId/items/:itemId", requireAuth, async (req, res) => {
    try {
      const list = await storage.getSavedList(req.params.listId);
      if (!list) {
        return res.status(404).json({ error: "Saved list not found" });
      }

      // Verify user has access to this list (same company)
      const companyContext = await getUserPrimaryCompany(req.session.userId!);
      if (!companyContext || list.companyId !== companyContext.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteSavedListItem(req.params.itemId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Remove saved list item error:", error);
      res.status(500).json({ error: "Failed to remove item from saved list" });
    }
  });

  // Get all FAQs
  app.get("/api/faqs", async (req, res) => {
    try {
      const faqs = await storage.getAllFaqs();
      res.json(faqs);
    } catch (error: any) {
      console.error("Get FAQs error:", error);
      res.status(500).json({ error: "Failed to get FAQs" });
    }
  });

  // Create support ticket
  app.post("/api/support/tickets", async (req, res) => {
    try {
      const { name, email, company, subject, message } = req.body;
      
      // For non-authenticated users, create ticket without user/company link
      const ticket = await storage.createSupportTicket({
        companyId: req.session.userId ? undefined : null,
        createdByUserId: req.session.userId || null,
        subject,
        description: `From: ${name} (${email})\nCompany: ${company || 'N/A'}\n\n${message}`,
        status: "open",
        priority: "medium",
      });

      res.json(ticket);
    } catch (error: any) {
      console.error("Create ticket error:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
