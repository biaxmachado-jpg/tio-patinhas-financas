import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Identificador único do usuário (login por senha, dono do app). */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  profilePhoto: text("profilePhoto"), // Base64 encoded image or URL
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categories table for organizing transactions (income/expense)
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1").notNull(), // Hex color
  icon: varchar("icon", { length: 50 }).default("tag").notNull(), // Lucide icon name

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Bank accounts table
 */
export const bankAccounts = mysqlTable("bankAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  bank: varchar("bank", { length: 100 }).notNull(), // e.g., "Itaú", "Bradesco", "BRB"
  accountNumber: varchar("accountNumber", { length: 50 }),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  initialBalance: decimal("initialBalance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  finalBalance: decimal("finalBalance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  color: varchar("color", { length: 7 }).default("#3b82f6").notNull(), // Hex color for card/account
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/**
 * Monthly balances table for storing initial balance per month/year
 */
export const monthlyBalances = mysqlTable("monthlyBalances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accountId: int("accountId").notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  initialBalance: decimal("initialBalance", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyBalance = typeof monthlyBalances.$inferSelect;
export type InsertMonthlyBalance = typeof monthlyBalances.$inferInsert;

/**
 * Transactions table (expenses and income)
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  accountId: int("accountId").notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  reconciled: boolean("reconciled").default(false).notNull(),
  reconciledAt: timestamp("reconciledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Budgets table for monthly budget limits per category
 */
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  limit: decimal("limit", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

/**
 * Categorization rules table for automatic category assignment based on keywords
 */
export const categorizationRules = mysqlTable("categorizationRules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  keywords: text("keywords").notNull(), // JSON array of keywords
  matchType: mysqlEnum("matchType", ["contains", "exact", "startsWith", "endsWith"]).default("contains").notNull(),
  caseSensitive: boolean("caseSensitive").default(false).notNull(),
  priority: int("priority").default(0).notNull(), // Higher priority rules are checked first
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CategorizationRule = typeof categorizationRules.$inferSelect;
export type InsertCategorizationRule = typeof categorizationRules.$inferInsert;


/**
 * Credit cards table for managing credit card accounts
 */
export const creditCards = mysqlTable("creditCards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Cartão Master", "Visa Platinum"
  brand: varchar("brand", { length: 50 }).notNull(), // e.g., "Visa", "Mastercard", "Elo", "American Express"
  limit: decimal("limit", { precision: 12, scale: 2 }).notNull(),
  dueDay: int("dueDay").notNull(), // Day of month when bill is due (1-31)
  closingDay: int("closingDay").notNull(), // Day of month when billing cycle closes (1-31)
  color: varchar("color", { length: 7 }).default("#3b82f6").notNull(), // Hex color for brand
  lastFourDigits: varchar("lastFourDigits", { length: 4 }), // Last 4 digits of card
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditCard = typeof creditCards.$inferSelect;
export type InsertCreditCard = typeof creditCards.$inferInsert;

/**
 * Credit card transactions table
 */
export const creditCardTransactions = mysqlTable("creditCardTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cardId: int("cardId").notNull(),
  categoryId: int("categoryId"),
  description: varchar("description", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("dueDate"), // When the charge is due
  installments: int("installments").default(1).notNull(), // For installment purchases
  currentInstallment: int("currentInstallment").default(1).notNull(),
  paid: boolean("paid").default(false).notNull(),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditCardTransaction = typeof creditCardTransactions.$inferSelect;
export type InsertCreditCardTransaction = typeof creditCardTransactions.$inferInsert;


/**
 * Profile history table for tracking user profile changes
 */
export const profileHistory = mysqlTable("profileHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fieldName: varchar("fieldName", { length: 100 }).notNull(), // e.g., "name", "email"
  oldValue: text("oldValue"), // Previous value
  newValue: text("newValue"), // New value
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProfileHistory = typeof profileHistory.$inferSelect;
export type InsertProfileHistory = typeof profileHistory.$inferInsert;

/**
 * Import history table for auditing file imports
 */
export const importHistory = mysqlTable("importHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["creditCard", "bankAccount"]).notNull(),
  entityId: int("entityId").notNull(), // creditCard ID or bankAccount ID
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // pdf, xlsx, xls, ofx, etc
  bankDetected: varchar("bankDetected", { length: 100 }), // Bradesco, Itaú, Nubank, etc
  transactionsImported: int("transactionsImported").default(0).notNull(),
  duplicatesFound: int("duplicatesFound").default(0).notNull(),
  duplicatesSkipped: int("duplicatesSkipped").default(0).notNull(),
  status: mysqlEnum("status", ["success", "partial", "failed"]).default("success").notNull(),
  errorMessage: text("errorMessage"), // If failed, what went wrong
  importedAt: timestamp("importedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportHistory = typeof importHistory.$inferSelect;
export type InsertImportHistory = typeof importHistory.$inferInsert;
