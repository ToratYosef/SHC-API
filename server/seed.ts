import "dotenv/config";
import { storage } from "./storage";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Starting database seed...");

  try {
    // Create device categories
    console.log("Creating device categories...");
    const smartphones = await storage.createCategory({
      name: "Smartphones",
      slug: "smartphones",
    });

    const tablets = await storage.createCategory({
      name: "Tablets",
      slug: "tablets",
    });

    const laptops = await storage.createCategory({
      name: "Laptops",
      slug: "laptops",
    });

    const wearables = await storage.createCategory({
      name: "Wearables",
      slug: "wearables",
    });

    // Create device models
    console.log("Creating device models...");
    const iphone13Pro = await storage.createDeviceModel({
      brand: "Apple",
      name: "iPhone 13 Pro",
      marketingName: "iPhone 13 Pro",
      sku: "IPHONE-13-PRO",
      slug: "iphone-13-pro",
      categoryId: smartphones.id,
      imageUrl: "/images/iphone-13-pro.jpg",
      description: "Premium flagship smartphone with ProMotion display and triple-camera system",
      isActive: true,
    });

    const galaxyS21 = await storage.createDeviceModel({
      brand: "Samsung",
      name: "Galaxy S21",
      marketingName: "Samsung Galaxy S21",
      sku: "GALAXY-S21",
      slug: "galaxy-s21",
      categoryId: smartphones.id,
      imageUrl: "/images/galaxy-s21.jpg",
      description: "Flagship Android smartphone with high-refresh display and versatile camera",
      isActive: true,
    });

    const ipadAir = await storage.createDeviceModel({
      brand: "Apple",
      name: "iPad Air",
      marketingName: "iPad Air (5th Gen)",
      sku: "IPAD-AIR-5",
      slug: "ipad-air-5th-gen",
      categoryId: tablets.id,
      imageUrl: "/images/ipad-air.jpg",
      description: "Powerful tablet with M1 chip and stunning Liquid Retina display",
      isActive: true,
    });

    const macbookPro = await storage.createDeviceModel({
      brand: "Apple",
      name: "MacBook Pro",
      marketingName: "MacBook Pro 14-inch",
      sku: "MBP-14-M1",
      slug: "macbook-pro-14-m1",
      categoryId: laptops.id,
      imageUrl: "/images/macbook-pro.jpg",
      description: "Professional laptop with M1 Pro chip and ProMotion display",
      isActive: true,
    });

    const appleWatch = await storage.createDeviceModel({
      brand: "Apple",
      name: "Apple Watch Series 7",
      marketingName: "Apple Watch Series 7",
      sku: "WATCH-S7",
      slug: "apple-watch-series-7",
      categoryId: wearables.id,
      imageUrl: "/images/apple-watch-s7.jpg",
      description: "Advanced smartwatch with larger display and health monitoring",
      isActive: true,
    });

    // Create variants for iPhone 13 Pro
    console.log("Creating device variants...");
    const iphone13Pro128A = await storage.createDeviceVariant({
      deviceModelId: iphone13Pro.id,
      storage: "128GB",
      color: "Graphite",
      networkLockStatus: "unlocked",
      conditionGrade: "A",
      internalCode: "IP13P-128-GR-A",
      isActive: true,
    });

    const iphone13Pro256B = await storage.createDeviceVariant({
      deviceModelId: iphone13Pro.id,
      storage: "256GB",
      color: "Sierra Blue",
      networkLockStatus: "unlocked",
      conditionGrade: "B",
      internalCode: "IP13P-256-SB-B",
      isActive: true,
    });

    const galaxyS21128A = await storage.createDeviceVariant({
      deviceModelId: galaxyS21.id,
      storage: "128GB",
      color: "Phantom Gray",
      networkLockStatus: "unlocked",
      conditionGrade: "A",
      internalCode: "GS21-128-PG-A",
      isActive: true,
    });

    const ipadAir64B = await storage.createDeviceVariant({
      deviceModelId: ipadAir.id,
      storage: "64GB",
      color: "Space Gray",
      networkLockStatus: "unlocked",
      conditionGrade: "B",
      internalCode: "IPAD-AIR-64-SG-B",
      isActive: true,
    });

    // Create inventory for variants
    console.log("Creating inventory...");
    await storage.createInventory({
      deviceVariantId: iphone13Pro128A.id,
      quantityAvailable: 150,
      minOrderQuantity: 5,
      location: "Warehouse A",
      status: "in_stock",
    });

    await storage.createInventory({
      deviceVariantId: iphone13Pro256B.id,
      quantityAvailable: 85,
      minOrderQuantity: 5,
      location: "Warehouse A",
      status: "in_stock",
    });

    await storage.createInventory({
      deviceVariantId: galaxyS21128A.id,
      quantityAvailable: 120,
      minOrderQuantity: 10,
      location: "Warehouse B",
      status: "in_stock",
    });

    await storage.createInventory({
      deviceVariantId: ipadAir64B.id,
      quantityAvailable: 60,
      minOrderQuantity: 3,
      location: "Warehouse A",
      status: "in_stock",
    });

    // Create price tiers
    console.log("Creating price tiers...");
    // iPhone 13 Pro 128GB Grade A
    await storage.createPriceTier({
      deviceVariantId: iphone13Pro128A.id,
      minQuantity: 5,
      maxQuantity: 24,
      unitPrice: 425,
      currency: "USD",
      isActive: true,
    });
    await storage.createPriceTier({
      deviceVariantId: iphone13Pro128A.id,
      minQuantity: 25,
      maxQuantity: 49,
      unitPrice: 415,
      currency: "USD",
      isActive: true,
    });
    await storage.createPriceTier({
      deviceVariantId: iphone13Pro128A.id,
      minQuantity: 50,
      maxQuantity: null,
      unitPrice: 405,
      currency: "USD",
      isActive: true,
    });

    // iPhone 13 Pro 256GB Grade B
    await storage.createPriceTier({
      deviceVariantId: iphone13Pro256B.id,
      minQuantity: 5,
      maxQuantity: 24,
      unitPrice: 445,
      currency: "USD",
      isActive: true,
    });
    await storage.createPriceTier({
      deviceVariantId: iphone13Pro256B.id,
      minQuantity: 25,
      maxQuantity: null,
      unitPrice: 435,
      currency: "USD",
      isActive: true,
    });

    // Galaxy S21 128GB Grade A
    await storage.createPriceTier({
      deviceVariantId: galaxyS21128A.id,
      minQuantity: 10,
      maxQuantity: 29,
      unitPrice: 285,
      currency: "USD",
      isActive: true,
    });
    await storage.createPriceTier({
      deviceVariantId: galaxyS21128A.id,
      minQuantity: 30,
      maxQuantity: null,
      unitPrice: 275,
      currency: "USD",
      isActive: true,
    });

    // iPad Air 64GB Grade B
    await storage.createPriceTier({
      deviceVariantId: ipadAir64B.id,
      minQuantity: 3,
      maxQuantity: 9,
      unitPrice: 365,
      currency: "USD",
      isActive: true,
    });
    await storage.createPriceTier({
      deviceVariantId: ipadAir64B.id,
      minQuantity: 10,
      maxQuantity: null,
      unitPrice: 355,
      currency: "USD",
      isActive: true,
    });

    // Create demo admin user
    console.log("Creating demo admin user...");
    const adminPassword = await bcrypt.hash("Admin123!", 10);
    const adminUser = await storage.createUser({
      name: "Admin User",
      email: "admin@secondhandcell.com",
      passwordHash: adminPassword,
      role: "super_admin",
      phone: "+1-555-0100",
      isActive: true,
    });

    // Create demo buyer user and company
    console.log("Creating demo buyer user and company...");
    const buyerPassword = await bcrypt.hash("Buyer123!", 10);
    const buyerUser = await storage.createUser({
      name: "John Smith",
      email: "buyer@testcompany.test",
      passwordHash: buyerPassword,
      role: "buyer",
      phone: "+1-555-0200",
      isActive: true,
    });

    const demoCompany = await storage.createCompany({
      name: "TechResale Pro",
      legalName: "TechResale Pro LLC",
      taxId: "12-3456789",
      website: "https://techresalepro.example.com",
      primaryPhone: "+1-555-0200",
      billingEmail: "billing@testcompany.test",
      status: "approved",
      creditLimit: 50000,
    });

    await storage.createCompanyUser({
      userId: buyerUser.id,
      companyId: demoCompany.id,
      roleInCompany: "owner",
    });

    await storage.createShippingAddress({
      companyId: demoCompany.id,
      label: "Main Warehouse",
      contactName: "John Smith",
      phone: "+1-555-0200",
      street1: "123 Business Park Dr",
      street2: "Building B",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "USA",
      isDefault: true,
    });

    await storage.createBillingAddress({
      companyId: demoCompany.id,
      label: "Main Office",
      contactName: "John Smith",
      phone: "+1-555-0200",
      street1: "123 Business Park Dr",
      street2: "Building B",
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "USA",
      isDefault: true,
    });

    // Create some FAQs
    console.log("Creating FAQs...");
    await storage.createFaq({
      question: "How do I create a wholesale account?",
      answer: "Click 'Apply Now' in the header and complete the registration form with your company details. You'll need to provide your business information, reseller certificate (if applicable), and first shipping address. Our team typically reviews applications within one business day.",
      category: "Getting Started",
      displayOrder: 1,
      isActive: true,
    });

    await storage.createFaq({
      question: "What payment methods do you accept?",
      answer: "We accept credit cards (via Stripe), wire transfers, ACH payments, and offer net terms (Net 15/30) for qualified approved accounts. Payment method availability depends on your account status and credit approval.",
      category: "Orders & Payments",
      displayOrder: 1,
      isActive: true,
    });

    await storage.createFaq({
      question: "How do you grade device condition?",
      answer: "Every device goes through a 60+ point inspection by certified technicians. Grade A is excellent with minimal wear, Grade B is very good with light use, Grade C is good with moderate wear, and Grade D is fair with heavy cosmetic wear but full functionality. All grades are fully functional.",
      category: "Grading & Devices",
      displayOrder: 1,
      isActive: true,
    });

    console.log("Seed completed successfully!");
    console.log("\nDemo accounts created:");
    console.log("  Super Admin: admin@secondhandcell.com / Admin123!");
    console.log("  Buyer: buyer@testcompany.test / Buyer123!");
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  }
}

export { seed };

// Run seed
seed()
  .then(() => {
    console.log("\nSeed completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
