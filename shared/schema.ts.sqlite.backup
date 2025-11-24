import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  real,
  text,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums (as const arrays)
export const userRoleEnum = ["buyer", "admin", "super_admin"] as const;
export const companyStatusEnum = ["pending_review", "approved", "rejected", "suspended"] as const;
export const companyUserRoleEnum = ["owner", "admin", "buyer"] as const;
export const conditionGradeEnum = ["A", "B", "C", "D"] as const;
export const networkLockStatusEnum = ["unlocked", "locked", "other"] as const;
export const inventoryStatusEnum = ["in_stock", "reserved", "incoming", "discontinued"] as const;
export const orderStatusEnum = ["pending_payment", "payment_review", "processing", "shipped", "completed", "cancelled"] as const;
export const paymentStatusEnum = ["unpaid", "paid", "partially_paid", "refunded"] as const;
export const paymentMethodEnum = ["card", "wire", "ach", "terms", "other"] as const;
export const quoteStatusEnum = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export const supportTicketStatusEnum = ["open", "in_progress", "closed"] as const;
export const supportTicketPriorityEnum = ["low", "medium", "high"] as const;

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: userRoleEnum }).notNull().default("buyer"),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  resetToken: text("reset_token"),
  resetTokenExpiry: integer("reset_token_expiry", { mode: "timestamp" }),
});

export const usersRelations = relations(users, ({ many }) => ({
  companyUsers: many(companyUsers),
  createdOrders: many(orders, { relationName: "orderCreator" }),
  createdQuotes: many(quotes, { relationName: "quoteCreator" }),
  createdSavedLists: many(savedLists),
  supportTickets: many(supportTickets),
  auditLogs: many(auditLogs),
}));

// Companies table
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  taxId: text("tax_id"),
  resellerCertificateUrl: text("reseller_certificate_url"),
  website: text("website"),
  primaryPhone: text("primary_phone"),
  billingEmail: text("billing_email"),
  status: text("status", { enum: companyStatusEnum }).notNull().default("pending_review"),
  creditLimit: real("credit_limit").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  companyUsers: many(companyUsers),
  carts: many(carts),
  orders: many(orders),
  quotes: many(quotes),
  savedLists: many(savedLists),
  shippingAddresses: many(shippingAddresses),
  billingAddresses: many(billingAddresses),
  supportTickets: many(supportTickets),
}));

// Company Users (join table)
export const companyUsers = sqliteTable("company_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleInCompany: text("role_in_company", { enum: companyUserRoleEnum }).notNull().default("buyer"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyUsers.userId],
    references: [users.id],
  }),
}));

// Device Categories
export const deviceCategories = sqliteTable("device_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const deviceCategoriesRelations = relations(deviceCategories, ({ many }) => ({
  deviceModels: many(deviceModels),
}));

// Device Models
export const deviceModels = sqliteTable("device_models", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  brand: text("brand").notNull(),
  name: text("name").notNull(),
  marketingName: text("marketing_name"),
  sku: text("sku").notNull().unique(),
  slug: text("slug").notNull().unique(),
  categoryId: text("category_id").notNull().references(() => deviceCategories.id),
  imageUrl: text("image_url"),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const deviceModelsRelations = relations(deviceModels, ({ one, many }) => ({
  category: one(deviceCategories, {
    fields: [deviceModels.categoryId],
    references: [deviceCategories.id],
  }),
  variants: many(deviceVariants),
}));

// Device Variants
export const deviceVariants = sqliteTable("device_variants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceModelId: text("device_model_id").notNull().references(() => deviceModels.id, { onDelete: "cascade" }),
  storage: text("storage").notNull(),
  color: text("color").notNull(),
  networkLockStatus: text("network_lock_status", { enum: networkLockStatusEnum }).notNull().default("unlocked"),
  conditionGrade: text("condition_grade", { enum: conditionGradeEnum }).notNull(),
  internalCode: text("internal_code"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const deviceVariantsRelations = relations(deviceVariants, ({ one, many }) => ({
  deviceModel: one(deviceModels, {
    fields: [deviceVariants.deviceModelId],
    references: [deviceModels.id],
  }),
  inventoryItems: many(inventoryItems),
  priceTiers: many(priceTiers),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  quoteItems: many(quoteItems),
  savedListItems: many(savedListItems),
}));

// Inventory Items
export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceVariantId: text("device_variant_id").notNull().references(() => deviceVariants.id, { onDelete: "cascade" }),
  quantityAvailable: integer("quantity_available").notNull().default(0),
  minOrderQuantity: integer("min_order_quantity").notNull().default(1),
  location: text("location"),
  status: text("status", { enum: inventoryStatusEnum }).notNull().default("in_stock"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  deviceVariant: one(deviceVariants, {
    fields: [inventoryItems.deviceVariantId],
    references: [deviceVariants.id],
  }),
}));

// Price Tiers
export const priceTiers = sqliteTable("price_tiers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  deviceVariantId: text("device_variant_id").notNull().references(() => deviceVariants.id, { onDelete: "cascade" }),
  minQuantity: integer("min_quantity").notNull(),
  maxQuantity: integer("max_quantity"),
  unitPrice: real("unit_price").notNull(),
  currency: text("currency").notNull().default("USD"),
  effectiveFrom: integer("effective_from", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  effectiveTo: integer("effective_to", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const priceTiersRelations = relations(priceTiers, ({ one }) => ({
  deviceVariant: one(deviceVariants, {
    fields: [priceTiers.deviceVariantId],
    references: [deviceVariants.id],
  }),
}));

// Carts
export const carts = sqliteTable("carts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [carts.companyId],
    references: [companies.id],
  }),
  items: many(cartItems),
}));

// Cart Items
export const cartItems = sqliteTable("cart_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cartId: text("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  deviceVariantId: text("device_variant_id").notNull().references(() => deviceVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  unitPriceSnapshot: real("unit_price_snapshot").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  deviceVariant: one(deviceVariants, {
    fields: [cartItems.deviceVariantId],
    references: [deviceVariants.id],
  }),
}));

// Orders
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderNumber: text("order_number").notNull().unique(),
  companyId: text("company_id").notNull().references(() => companies.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  status: text("status", { enum: orderStatusEnum }).notNull().default("pending_payment"),
  subtotal: real("subtotal").notNull(),
  shippingCost: real("shipping_cost").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  total: real("total").notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentStatus: text("payment_status", { enum: paymentStatusEnum }).notNull().default("unpaid"),
  paymentMethod: text("payment_method", { enum: paymentMethodEnum }),
  shippingAddressId: text("shipping_address_id").references(() => shippingAddresses.id),
  billingAddressId: text("billing_address_id").references(() => billingAddresses.id),
  notesInternal: text("notes_internal"),
  notesCustomer: text("notes_customer"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  company: one(companies, {
    fields: [orders.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [orders.createdByUserId],
    references: [users.id],
    relationName: "orderCreator",
  }),
  items: many(orderItems),
  payments: many(payments),
  shipments: many(shipments),
}));

// Order Items
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  deviceVariantId: text("device_variant_id").notNull().references(() => deviceVariants.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  deviceVariant: one(deviceVariants, {
    fields: [orderItems.deviceVariantId],
    references: [deviceVariants.id],
  }),
}));

// Shipping Addresses
export const shippingAddresses = sqliteTable("shipping_addresses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  label: text("label"),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  street1: text("street1").notNull(),
  street2: text("street2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("USA"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const shippingAddressesRelations = relations(shippingAddresses, ({ one }) => ({
  company: one(companies, {
    fields: [shippingAddresses.companyId],
    references: [companies.id],
  }),
}));

// Billing Addresses
export const billingAddresses = sqliteTable("billing_addresses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  label: text("label"),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  street1: text("street1").notNull(),
  street2: text("street2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("USA"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const billingAddressesRelations = relations(billingAddresses, ({ one }) => ({
  company: one(companies, {
    fields: [billingAddresses.companyId],
    references: [companies.id],
  }),
}));

// Quotes
export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  quoteNumber: text("quote_number").notNull().unique(),
  companyId: text("company_id").notNull().references(() => companies.id),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  status: text("status", { enum: quoteStatusEnum }).notNull().default("draft"),
  validUntil: integer("valid_until", { mode: "timestamp" }),
  subtotal: real("subtotal").notNull().default(0),
  shippingEstimate: real("shipping_estimate").notNull().default(0),
  taxEstimate: real("tax_estimate").notNull().default(0),
  totalEstimate: real("total_estimate").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  company: one(companies, {
    fields: [quotes.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [quotes.createdByUserId],
    references: [users.id],
    relationName: "quoteCreator",
  }),
  items: many(quoteItems),
}));

// Quote Items
export const quoteItems = sqliteTable("quote_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  quoteId: text("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  deviceVariantId: text("device_variant_id").notNull().references(() => deviceVariants.id),
  quantity: integer("quantity").notNull(),
  proposedUnitPrice: real("proposed_unit_price").notNull(),
  lineTotalEstimate: real("line_total_estimate").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  deviceVariant: one(deviceVariants, {
    fields: [quoteItems.deviceVariantId],
    references: [deviceVariants.id],
  }),
}));

// Saved Lists
export const savedLists = sqliteTable("saved_lists", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const savedListsRelations = relations(savedLists, ({ one, many }) => ({
  company: one(companies, {
    fields: [savedLists.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [savedLists.createdByUserId],
    references: [users.id],
  }),
  items: many(savedListItems),
}));

// Saved List Items
export const savedListItems = sqliteTable("saved_list_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  savedListId: text("saved_list_id").notNull().references(() => savedLists.id, { onDelete: "cascade" }),
  deviceVariantId: text("device_variant_id").notNull().references(() => deviceVariants.id, { onDelete: "cascade" }),
  defaultQuantity: integer("default_quantity").notNull().default(1),
});

export const savedListItemsRelations = relations(savedListItems, ({ one }) => ({
  savedList: one(savedLists, {
    fields: [savedListItems.savedListId],
    references: [savedLists.id],
  }),
  deviceVariant: one(deviceVariants, {
    fields: [savedListItems.deviceVariantId],
    references: [deviceVariants.id],
  }),
}));

// Payments
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull(),
  method: text("method", { enum: paymentMethodEnum }).notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

// Shipments
export const shipments = sqliteTable("shipments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  carrier: text("carrier").notNull(),
  serviceLevel: text("service_level"),
  trackingNumber: text("tracking_number"),
  shippingLabelUrl: text("shipping_label_url"),
  shippedAt: integer("shipped_at", { mode: "timestamp" }),
  estimatedDeliveryDate: integer("estimated_delivery_date", { mode: "timestamp" }),
});

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
}));

// FAQs
export const faqs = sqliteTable("faqs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Announcements
export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  body: text("body").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp" }),
  endsAt: integer("ends_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Support Tickets
export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: supportTicketStatusEnum }).notNull().default("open"),
  priority: text("priority", { enum: supportTicketPriorityEnum }).notNull().default("medium"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  company: one(companies, {
    fields: [supportTickets.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [supportTickets.createdByUserId],
    references: [users.id],
  }),
}));

// Audit Logs
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorUserId: text("actor_user_id").references(() => users.id),
  companyId: text("company_id").references(() => companies.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  previousValues: text("previous_values"),
  newValues: text("new_values"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyUserSchema = createInsertSchema(companyUsers).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceCategorySchema = createInsertSchema(deviceCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeviceModelSchema = createInsertSchema(deviceModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeviceVariantSchema = createInsertSchema(deviceVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceTierSchema = createInsertSchema(priceTiers).omit({
  id: true,
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

export const insertShippingAddressSchema = createInsertSchema(shippingAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingAddressSchema = createInsertSchema(billingAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
  createdAt: true,
});

export const insertSavedListSchema = createInsertSchema(savedLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSavedListItemSchema = createInsertSchema(savedListItems).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertCompanyUser = z.infer<typeof insertCompanyUserSchema>;
export type CompanyUser = typeof companyUsers.$inferSelect;

export type InsertDeviceCategory = z.infer<typeof insertDeviceCategorySchema>;
export type DeviceCategory = typeof deviceCategories.$inferSelect;

export type InsertDeviceModel = z.infer<typeof insertDeviceModelSchema>;
export type DeviceModel = typeof deviceModels.$inferSelect;

export type InsertDeviceVariant = z.infer<typeof insertDeviceVariantSchema>;
export type DeviceVariant = typeof deviceVariants.$inferSelect;

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export type InsertPriceTier = z.infer<typeof insertPriceTierSchema>;
export type PriceTier = typeof priceTiers.$inferSelect;

export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof carts.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertShippingAddress = z.infer<typeof insertShippingAddressSchema>;
export type ShippingAddress = typeof shippingAddresses.$inferSelect;

export type InsertBillingAddress = z.infer<typeof insertBillingAddressSchema>;
export type BillingAddress = typeof billingAddresses.$inferSelect;

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

export type InsertSavedList = z.infer<typeof insertSavedListSchema>;
export type SavedList = typeof savedLists.$inferSelect;

export type InsertSavedListItem = z.infer<typeof insertSavedListItemSchema>;
export type SavedListItem = typeof savedListItems.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;

export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Faq = typeof faqs.$inferSelect;

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
