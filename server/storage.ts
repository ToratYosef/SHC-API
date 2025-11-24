import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import type { 
  User, InsertUser,
  Company, InsertCompany,
  CompanyUser, InsertCompanyUser,
  DeviceCategory, InsertDeviceCategory,
  DeviceModel, InsertDeviceModel,
  DeviceVariant, InsertDeviceVariant,
  InventoryItem, InsertInventoryItem,
  PriceTier, InsertPriceTier,
  Cart, InsertCart,
  CartItem, InsertCartItem,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  ShippingAddress, InsertShippingAddress,
  BillingAddress, InsertBillingAddress,
  Quote, InsertQuote,
  QuoteItem, InsertQuoteItem,
  SavedList, InsertSavedList,
  SavedListItem, InsertSavedListItem,
  Payment, InsertPayment,
  Shipment, InsertShipment,
  Faq, InsertFaq,
  Announcement, InsertAnnouncement,
  SupportTicket, InsertSupportTicket,
  AuditLog, InsertAuditLog,
} from "@shared/schema";
import * as schema from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Company methods
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  
  // CompanyUser methods
  createCompanyUser(companyUser: InsertCompanyUser): Promise<CompanyUser>;
  getCompanyUsersByUserId(userId: string): Promise<CompanyUser[]>;
  getCompanyUsersByCompanyId(companyId: string): Promise<CompanyUser[]>;
  
  // Device Category methods
  getAllCategories(): Promise<DeviceCategory[]>;
  getCategory(id: string): Promise<DeviceCategory | undefined>;
  getCategoryBySlug(slug: string): Promise<DeviceCategory | undefined>;
  createCategory(category: InsertDeviceCategory): Promise<DeviceCategory>;
  
  // Device Model methods
  getAllDeviceModels(): Promise<DeviceModel[]>;
  getDeviceModel(id: string): Promise<DeviceModel | undefined>;
  getDeviceModelBySlug(slug: string): Promise<DeviceModel | undefined>;
  createDeviceModel(model: InsertDeviceModel): Promise<DeviceModel>;
  
  // Device Variant methods
  getDeviceVariant(id: string): Promise<DeviceVariant | undefined>;
  getDeviceVariantsByModelId(modelId: string): Promise<DeviceVariant[]>;
  createDeviceVariant(variant: InsertDeviceVariant): Promise<DeviceVariant>;
  updateDeviceVariant(id: string, updates: Partial<DeviceVariant>): Promise<DeviceVariant | undefined>;
  deleteDeviceVariant(id: string): Promise<void>;
  
  // Inventory methods
  getInventoryByVariantId(variantId: string): Promise<InventoryItem | undefined>;
  createInventory(inventory: InsertInventoryItem): Promise<InventoryItem>;
  updateInventory(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryByVariantId(variantId: string): Promise<void>;

  // Price Tier methods
  getPriceTiersByVariantId(variantId: string): Promise<PriceTier[]>;
  createPriceTier(tier: InsertPriceTier): Promise<PriceTier>;
  updatePriceTier(id: string, updates: Partial<PriceTier>): Promise<PriceTier | undefined>;
  deletePriceTiersByVariantId(variantId: string): Promise<void>;

  // Cart methods
  getCartByUserId(userId: string): Promise<Cart | undefined>;
  createCart(cart: InsertCart): Promise<Cart>;
  getCartItems(cartId: string): Promise<CartItem[]>;
  addCartItem(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, updates: Partial<CartItem>): Promise<CartItem | undefined>;
  removeCartItem(id: string): Promise<void>;
  clearCart(cartId: string): Promise<void>;
  
  // Order methods
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByCompanyId(companyId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  
  // Shipping/Billing Address methods
  getShippingAddressesByCompanyId(companyId: string): Promise<ShippingAddress[]>;
  createShippingAddress(address: InsertShippingAddress): Promise<ShippingAddress>;
  updateShippingAddress(id: string, updates: Partial<ShippingAddress>): Promise<ShippingAddress | undefined>;
  getBillingAddressesByCompanyId(companyId: string): Promise<BillingAddress[]>;
  createBillingAddress(address: InsertBillingAddress): Promise<BillingAddress>;
  
  // Quote methods
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByCompanyId(companyId: string): Promise<Quote[]>;
  updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  getQuoteItems(quoteId: string): Promise<QuoteItem[]>;
  
  // Saved List methods
  getSavedListsByCompanyId(companyId: string): Promise<SavedList[]>;
  createSavedList(list: InsertSavedList): Promise<SavedList>;
  getSavedListItems(listId: string): Promise<SavedListItem[]>;
  addSavedListItem(item: InsertSavedListItem): Promise<SavedListItem>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByOrderId(orderId: string): Promise<Payment[]>;
  
  // Shipment methods
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  getShipmentsByOrderId(orderId: string): Promise<Shipment[]>;
  
  // FAQ methods
  getAllFaqs(): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  
  // Announcement methods
  getActiveAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Support Ticket methods
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTicketsByCompanyId(companyId: string): Promise<SupportTicket[]>;
  updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined>;
  
  // Audit Log methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(schema.users).set(updates).where(eq(schema.users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await db.select().from(schema.users);
    return users;
  }

  // Company methods
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(schema.companies).where(eq(schema.companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(schema.companies).values(insertCompany).returning();
    return company;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined> {
    const [company] = await db.update(schema.companies).set(updates).where(eq(schema.companies.id, id)).returning();
    return company || undefined;
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(schema.companies).orderBy(desc(schema.companies.createdAt));
  }

  // CompanyUser methods
  async createCompanyUser(insertCompanyUser: InsertCompanyUser): Promise<CompanyUser> {
    const [companyUser] = await db.insert(schema.companyUsers).values(insertCompanyUser).returning();
    return companyUser;
  }

  async getCompanyUsersByUserId(userId: string): Promise<CompanyUser[]> {
    return await db.select().from(schema.companyUsers).where(eq(schema.companyUsers.userId, userId));
  }

  async getCompanyUsersByCompanyId(companyId: string): Promise<CompanyUser[]> {
    return await db.select().from(schema.companyUsers).where(eq(schema.companyUsers.companyId, companyId));
  }

  // Device Category methods
  async getAllCategories(): Promise<DeviceCategory[]> {
    return await db.select().from(schema.deviceCategories);
  }

  async getCategory(id: string): Promise<DeviceCategory | undefined> {
    const [category] = await db.select().from(schema.deviceCategories).where(eq(schema.deviceCategories.id, id));
    return category || undefined;
  }

  async getCategoryBySlug(slug: string): Promise<DeviceCategory | undefined> {
    const [category] = await db.select().from(schema.deviceCategories).where(eq(schema.deviceCategories.slug, slug));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertDeviceCategory): Promise<DeviceCategory> {
    const [category] = await db.insert(schema.deviceCategories).values(insertCategory).returning();
    return category;
  }

  // Device Model methods
  async getAllDeviceModels(): Promise<DeviceModel[]> {
    return await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.isActive, true));
  }

  async getDeviceModel(id: string): Promise<DeviceModel | undefined> {
    const [model] = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.id, id));
    return model || undefined;
  }

  async getDeviceModelBySlug(slug: string): Promise<DeviceModel | undefined> {
    const [model] = await db.select().from(schema.deviceModels).where(eq(schema.deviceModels.slug, slug));
    return model || undefined;
  }

  async createDeviceModel(insertModel: InsertDeviceModel): Promise<DeviceModel> {
    const [model] = await db.insert(schema.deviceModels).values(insertModel).returning();
    return model;
  }

  // Device Variant methods
  async getDeviceVariant(id: string): Promise<DeviceVariant | undefined> {
    const [variant] = await db.select().from(schema.deviceVariants).where(eq(schema.deviceVariants.id, id));
    return variant || undefined;
  }

  async getDeviceVariantsByModelId(modelId: string): Promise<DeviceVariant[]> {
    return await db.select().from(schema.deviceVariants).where(eq(schema.deviceVariants.deviceModelId, modelId));
  }

  async createDeviceVariant(insertVariant: InsertDeviceVariant): Promise<DeviceVariant> {
    const [variant] = await db.insert(schema.deviceVariants).values(insertVariant).returning();
    return variant;
  }

  async updateDeviceVariant(id: string, updates: Partial<DeviceVariant>): Promise<DeviceVariant | undefined> {
    const [variant] = await db.update(schema.deviceVariants).set(updates).where(eq(schema.deviceVariants.id, id)).returning();
    return variant || undefined;
  }

  async deleteDeviceVariant(id: string): Promise<void> {
    await db.delete(schema.deviceVariants).where(eq(schema.deviceVariants.id, id));
  }

  // Inventory methods
  async getInventoryByVariantId(variantId: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.deviceVariantId, variantId));
    return item || undefined;
  }

  async createInventory(insertInventory: InsertInventoryItem): Promise<InventoryItem> {
    const [item] = await db.insert(schema.inventoryItems).values(insertInventory).returning();
    return item;
  }

  async updateInventory(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const [item] = await db.update(schema.inventoryItems).set(updates).where(eq(schema.inventoryItems.id, id)).returning();
    return item || undefined;
  }

  async deleteInventoryByVariantId(variantId: string): Promise<void> {
    await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.deviceVariantId, variantId));
  }

  // Price Tier methods
  async getPriceTiersByVariantId(variantId: string): Promise<PriceTier[]> {
    return await db.select().from(schema.priceTiers)
      .where(and(
        eq(schema.priceTiers.deviceVariantId, variantId),
        eq(schema.priceTiers.isActive, true)
      ))
      .orderBy(schema.priceTiers.minQuantity);
  }

  async createPriceTier(insertTier: InsertPriceTier): Promise<PriceTier> {
    const [tier] = await db.insert(schema.priceTiers).values(insertTier).returning();
    return tier;
  }

  async updatePriceTier(id: string, updates: Partial<PriceTier>): Promise<PriceTier | undefined> {
    const [tier] = await db.update(schema.priceTiers).set(updates).where(eq(schema.priceTiers.id, id)).returning();
    return tier || undefined;
  }

  async deletePriceTiersByVariantId(variantId: string): Promise<void> {
    await db.delete(schema.priceTiers).where(eq(schema.priceTiers.deviceVariantId, variantId));
  }

  // Cart methods
  async getCartByUserId(userId: string): Promise<Cart | undefined> {
    const [cart] = await db.select().from(schema.carts).where(eq(schema.carts.userId, userId));
    return cart || undefined;
  }

  async createCart(insertCart: InsertCart): Promise<Cart> {
    const [cart] = await db.insert(schema.carts).values(insertCart).returning();
    return cart;
  }

  async getCartItems(cartId: string): Promise<CartItem[]> {
    return await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
  }

  async addCartItem(insertItem: InsertCartItem): Promise<CartItem> {
    const [item] = await db.insert(schema.cartItems).values(insertItem).returning();
    return item;
  }

  async updateCartItem(id: string, updates: Partial<CartItem>): Promise<CartItem | undefined> {
    const [item] = await db.update(schema.cartItems).set(updates).where(eq(schema.cartItems.id, id)).returning();
    return item || undefined;
  }

  async removeCartItem(id: string): Promise<void> {
    await db.delete(schema.cartItems).where(eq(schema.cartItems.id, id));
  }

  async clearCart(cartId: string): Promise<void> {
    await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
  }

  // Order methods
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(schema.orders).values(insertOrder).returning();
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async getOrdersByCompanyId(companyId: string): Promise<Order[]> {
    return await db.select().from(schema.orders)
      .where(eq(schema.orders.companyId, companyId))
      .orderBy(desc(schema.orders.createdAt));
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db.update(schema.orders).set(updates).where(eq(schema.orders.id, id)).returning();
    return order || undefined;
  }

  async getAllOrders(): Promise<Order[]> {
    const orders = await db.select().from(schema.orders);
    return orders;
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db.insert(schema.orderItems).values(insertItem).returning();
    return item;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  }

  // Shipping/Billing Address methods
  async getShippingAddressesByCompanyId(companyId: string): Promise<ShippingAddress[]> {
    return await db.select().from(schema.shippingAddresses).where(eq(schema.shippingAddresses.companyId, companyId));
  }

  async createShippingAddress(insertAddress: InsertShippingAddress): Promise<ShippingAddress> {
    const [address] = await db.insert(schema.shippingAddresses).values(insertAddress).returning();
    return address;
  }

  async updateShippingAddress(id: string, updates: Partial<ShippingAddress>): Promise<ShippingAddress | undefined> {
    const [address] = await db.update(schema.shippingAddresses).set(updates).where(eq(schema.shippingAddresses.id, id)).returning();
    return address || undefined;
  }

  async getBillingAddressesByCompanyId(companyId: string): Promise<BillingAddress[]> {
    return await db.select().from(schema.billingAddresses).where(eq(schema.billingAddresses.companyId, companyId));
  }

  async createBillingAddress(insertAddress: InsertBillingAddress): Promise<BillingAddress> {
    const [address] = await db.insert(schema.billingAddresses).values(insertAddress).returning();
    return address;
  }

  // Quote methods
  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await db.insert(schema.quotes).values(insertQuote).returning();
    return quote;
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByCompanyId(companyId: string): Promise<Quote[]> {
    return await db.select().from(schema.quotes)
      .where(eq(schema.quotes.companyId, companyId))
      .orderBy(desc(schema.quotes.createdAt));
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const [quote] = await db.update(schema.quotes).set(updates).where(eq(schema.quotes.id, id)).returning();
    return quote || undefined;
  }

  async createQuoteItem(insertItem: InsertQuoteItem): Promise<QuoteItem> {
    const [item] = await db.insert(schema.quoteItems).values(insertItem).returning();
    return item;
  }

  async getQuoteItems(quoteId: string): Promise<QuoteItem[]> {
    return await db.select().from(schema.quoteItems).where(eq(schema.quoteItems.quoteId, quoteId));
  }

  // Saved List methods
  async getSavedListsByCompanyId(companyId: string): Promise<SavedList[]> {
    return await db.select().from(schema.savedLists).where(eq(schema.savedLists.companyId, companyId));
  }

  async createSavedList(insertList: InsertSavedList): Promise<SavedList> {
    const [list] = await db.insert(schema.savedLists).values(insertList).returning();
    return list;
  }

  async getSavedListItems(listId: string): Promise<SavedListItem[]> {
    return await db.select().from(schema.savedListItems).where(eq(schema.savedListItems.savedListId, listId));
  }

  async addSavedListItem(insertItem: InsertSavedListItem): Promise<SavedListItem> {
    const [item] = await db.insert(schema.savedListItems).values(insertItem).returning();
    return item;
  }

  async getSavedList(id: string): Promise<SavedList | undefined> {
    const [list] = await db.select().from(schema.savedLists).where(eq(schema.savedLists.id, id));
    return list || undefined;
  }

  async deleteSavedList(id: string): Promise<void> {
    await db.delete(schema.savedLists).where(eq(schema.savedLists.id, id));
  }

  async deleteSavedListItem(id: string): Promise<void> {
    await db.delete(schema.savedListItems).where(eq(schema.savedListItems.id, id));
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(schema.payments).values(insertPayment).returning();
    return payment;
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    return await db.select().from(schema.payments).where(eq(schema.payments.orderId, orderId));
  }

  // Shipment methods
  async createShipment(insertShipment: InsertShipment): Promise<Shipment> {
    const [shipment] = await db.insert(schema.shipments).values(insertShipment).returning();
    return shipment;
  }

  async getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
    return await db.select().from(schema.shipments).where(eq(schema.shipments.orderId, orderId));
  }

  // FAQ methods
  async getAllFaqs(): Promise<Faq[]> {
    return await db.select().from(schema.faqs)
      .where(eq(schema.faqs.isActive, true))
      .orderBy(schema.faqs.category, schema.faqs.displayOrder);
  }

  async createFaq(insertFaq: InsertFaq): Promise<Faq> {
    const [faq] = await db.insert(schema.faqs).values(insertFaq).returning();
    return faq;
  }

  // Announcement methods
  async getActiveAnnouncements(): Promise<Announcement[]> {
    const now = new Date();
    return await db.select().from(schema.announcements)
      .where(
        and(
          eq(schema.announcements.isActive, true),
          sql`${schema.announcements.startsAt} <= ${now}`,
          sql`(${schema.announcements.endsAt} IS NULL OR ${schema.announcements.endsAt} >= ${now})`
        )
      );
  }

  async createAnnouncement(insertAnnouncement: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db.insert(schema.announcements).values(insertAnnouncement).returning();
    return announcement;
  }

  // Support Ticket methods
  async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db.insert(schema.supportTickets).values(insertTicket).returning();
    return ticket;
  }

  async getSupportTicketsByCompanyId(companyId: string): Promise<SupportTicket[]> {
    return await db.select().from(schema.supportTickets)
      .where(eq(schema.supportTickets.companyId, companyId))
      .orderBy(desc(schema.supportTickets.createdAt));
  }

  async updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
    const [ticket] = await db.update(schema.supportTickets).set(updates).where(eq(schema.supportTickets.id, id)).returning();
    return ticket || undefined;
  }

  // Audit Log methods
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(schema.auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db.select().from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
