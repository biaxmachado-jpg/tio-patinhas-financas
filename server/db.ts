import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  categories, 
  bankAccounts, 
  transactions, 
  budgets, 
  categorizationRules,
  creditCards,
  creditCardTransactions,
  type Category,
  type BankAccount,
  type Transaction,
  type Budget,
  type CategorizationRule,
  type CreditCard,
  type CreditCardTransaction,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= CATEGORIES =============

export async function getCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.name));
}

export async function getCategoryById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(and(eq(categories.id, id), eq(categories.userId, userId))).limit(1);
  return result[0];
}

export async function createCategory(userId: number, data: { name: string; type: "income" | "expense"; color: string; icon: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values({ userId, ...data });
  return result;
}

export async function updateCategory(id: number, userId: number, data: Partial<{ name: string; color: string; icon: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(categories).set(data).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

export async function deleteCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

// ============= BANK ACCOUNTS =============

export async function getBankAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId)).orderBy(asc(bankAccounts.name));
}

export async function getBankAccountById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId))).limit(1);
  return result[0];
}

export async function createBankAccount(userId: number, data: { name: string; bank: string; accountNumber?: string; initialBalance: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bankAccounts).values({ 
    userId, 
    ...data,
    balance: data.initialBalance,
    finalBalance: data.initialBalance,
  });
  return result;
}

export async function updateBankAccount(id: number, userId: number, data: Partial<{ name: string; bank: string; accountNumber: string; balance: string; finalBalance: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(bankAccounts).set(data).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
}

export async function deleteBankAccount(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId)));
}

// ============= TRANSACTIONS =============

export async function getTransactions(userId: number, filters?: { accountId?: number; categoryId?: number; type?: "income" | "expense"; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(transactions).where(eq(transactions.userId, userId)).$dynamic();
  
  if (filters?.accountId) {
    query = query.where(eq(transactions.accountId, filters.accountId));
  }
  if (filters?.categoryId) {
    query = query.where(eq(transactions.categoryId, filters.categoryId));
  }
  if (filters?.type) {
    query = query.where(eq(transactions.type, filters.type));
  }
  if (filters?.startDate) {
    query = query.where(gte(transactions.date, filters.startDate));
  }
  if (filters?.endDate) {
    query = query.where(lte(transactions.date, filters.endDate));
  }
  
  return query.orderBy(desc(transactions.date));
}

export async function getTransactionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).limit(1);
  return result[0];
}

export async function createTransaction(userId: number, data: { categoryId: number; accountId: number; type: "income" | "expense"; description: string; amount: string; date: Date; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(transactions).values({ userId, ...data });
}

export async function updateTransaction(id: number, userId: number, data: Partial<{ categoryId: number; description: string; amount: string; date: Date; notes: string; reconciled: boolean; reconciledAt: Date }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(transactions).set(data).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function deleteTransaction(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

// ============= BUDGETS =============

export async function getBudgets(userId: number, month?: number, year?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(budgets).where(eq(budgets.userId, userId)).$dynamic();
  
  if (month !== undefined) {
    query = query.where(eq(budgets.month, month));
  }
  if (year !== undefined) {
    query = query.where(eq(budgets.year, year));
  }
  
  return query.orderBy(asc(budgets.categoryId));
}

export async function getBudgetById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId))).limit(1);
  return result[0];
}

export async function createBudget(userId: number, data: { categoryId: number; month: number; year: number; limit: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(budgets).values({ userId, ...data });
}

export async function updateBudget(id: number, userId: number, data: Partial<{ limit: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(budgets).set(data).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
}

export async function deleteBudget(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
}

// ============= CATEGORIZATION RULES =============

export async function getCategorizationRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categorizationRules).where(eq(categorizationRules.userId, userId)).orderBy(desc(categorizationRules.priority));
}

export async function getCategorizationRuleById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categorizationRules).where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId))).limit(1);
  return result[0];
}

export async function createCategorizationRule(userId: number, data: { categoryId: number; keywords: string; matchType: "contains" | "exact" | "startsWith" | "endsWith"; caseSensitive: boolean; priority: number; enabled: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(categorizationRules).values({ userId, ...data });
}

export async function updateCategorizationRule(id: number, userId: number, data: Partial<{ categoryId: number; keywords: string; matchType: "contains" | "exact" | "startsWith" | "endsWith"; caseSensitive: boolean; priority: number; enabled: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(categorizationRules).set(data).where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)));
}

export async function deleteCategorizationRule(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(categorizationRules).where(and(eq(categorizationRules.id, id), eq(categorizationRules.userId, userId)));
}

// ============= CREDIT CARDS =============

export async function getCreditCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditCards).where(eq(creditCards.userId, userId)).orderBy(asc(creditCards.name));
}

export async function getCreditCardById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(creditCards).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId))).limit(1);
  return result[0];
}

export async function createCreditCard(userId: number, data: { name: string; brand: string; limit: string; dueDay: number; closingDay: number; color: string; lastFourDigits?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(creditCards).values({ userId, ...data });
}

export async function updateCreditCard(id: number, userId: number, data: Partial<{ name: string; brand: string; limit: string; dueDay: number; closingDay: number; color: string; lastFourDigits: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(creditCards).set(data).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));
}

export async function deleteCreditCard(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(creditCards).where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)));
}

// ============= CREDIT CARD TRANSACTIONS =============

export async function getCreditCardTransactions(userId: number, cardId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(creditCardTransactions).where(eq(creditCardTransactions.userId, userId)).$dynamic();
  
  if (cardId) {
    query = query.where(eq(creditCardTransactions.cardId, cardId));
  }
  
  return query.orderBy(desc(creditCardTransactions.date));
}

export async function getCreditCardTransactionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(creditCardTransactions).where(and(eq(creditCardTransactions.id, id), eq(creditCardTransactions.userId, userId))).limit(1);
  return result[0];
}

export async function createCreditCardTransaction(userId: number, data: { cardId: number; categoryId: number; description: string; amount: string; date: Date; dueDate?: Date; installments?: number; currentInstallment?: number; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(creditCardTransactions).values({ userId, ...data });
}

export async function updateCreditCardTransaction(id: number, userId: number, data: Partial<{ categoryId: number; description: string; amount: string; date: Date; dueDate: Date; installments: number; currentInstallment: number; paid: boolean; paidAt: Date; notes: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(creditCardTransactions).set(data).where(and(eq(creditCardTransactions.id, id), eq(creditCardTransactions.userId, userId)));
}

export async function deleteCreditCardTransaction(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(creditCardTransactions).where(and(eq(creditCardTransactions.id, id), eq(creditCardTransactions.userId, userId)));
}

// ============= DASHBOARD STATS =============

export async function getDashboardStats(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return { totalIncome: "0", totalExpense: "0", totalBalance: "0" };
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const transactionStats = await db.select({
    type: transactions.type,
    total: sql<string>`SUM(${transactions.amount})`,
  }).from(transactions).where(
    and(
      eq(transactions.userId, userId),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    )
  ).groupBy(transactions.type);
  
  let totalIncome = "0";
  let totalExpense = "0";
  
  for (const stat of transactionStats) {
    if (stat.type === "income") totalIncome = stat.total || "0";
    if (stat.type === "expense") totalExpense = stat.total || "0";
  }
  
  const accounts = await db.select({ balance: sql<string>`SUM(${bankAccounts.balance})` }).from(bankAccounts).where(eq(bankAccounts.userId, userId));
  const totalBalance = accounts[0]?.balance || "0";
  
  return { totalIncome, totalExpense, totalBalance };
}
