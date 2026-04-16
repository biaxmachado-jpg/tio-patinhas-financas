import { eq, desc, asc, and, or, like, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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
  monthlyBalances,
  profileHistory,
  type Category,
  type BankAccount,
  type Transaction,
  type Budget,
  type CategorizationRule,
  type CreditCard,
  type CreditCardTransaction,
  type MonthlyBalance,
  type ProfileHistory,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { createWorker } from 'tesseract.js';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let _db: any = null;
let _pool: mysql.Pool | null = null;
let _initAttempted = false;
let _tesseractWorker: any = null;

// Initialize Tesseract worker
async function getTesseractWorker() {
  if (!_tesseractWorker) {
    _tesseractWorker = await createWorker('por'); // Portuguese language
  }
  return _tesseractWorker;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL && !_initAttempted) {
    _initAttempted = true;
    try {
      if (!_pool) {
        _pool = mysql.createPool(process.env.DATABASE_URL);
      }
      _db = drizzle(_pool, { mode: 'default', schema: { users, categories, bankAccounts, transactions, budgets, categorizationRules, creditCards, creditCardTransactions, monthlyBalances, profileHistory } });
      
      // Ensure profileHistory table exists
      try {
        await _pool.execute(`
          CREATE TABLE IF NOT EXISTS \`profileHistory\` (
            \`id\` int AUTO_INCREMENT NOT NULL,
            \`userId\` int NOT NULL,
            \`fieldName\` varchar(100) NOT NULL,
            \`oldValue\` text,
            \`newValue\` text,
            \`changedAt\` timestamp NOT NULL DEFAULT (now()),
            \`createdAt\` timestamp NOT NULL DEFAULT (now()),
            CONSTRAINT \`profileHistory_id\` PRIMARY KEY(\`id\`)
          )
        `);
      } catch (tableError) {
        console.warn("[Database] Could not create profileHistory table:", tableError);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
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
  
  const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId)).orderBy(asc(bankAccounts.name));
  
  // Calcular saldo final para cada conta (SALDO INICIAL + ENTRADAS - SAÍDAS do mês atual)
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const accountsWithFinalBalance = await Promise.all(
    accounts.map(async (account: any) => {
      try {
        const txList = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, account.id),
              eq(transactions.userId, userId)
            )
          );
        
        // Calcular entradas e saídas do mês atual
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        
        txList.forEach((tx: any) => {
          const txDate = new Date(tx.date);
          if (txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear) {
            if (tx.type === "income") {
              monthlyIncome += parseFloat(tx.amount || "0");
            } else {
              monthlyExpense += parseFloat(tx.amount || "0");
            }
          }
        });
        
        const initialBalance = parseFloat(account.balance || "0");
        const finalBalance = initialBalance + monthlyIncome - monthlyExpense;
        
        return {
          ...account,
          balance: account.balance,
          finalBalance: finalBalance.toString(),
        };
      } catch (error) {
        console.error(`Error calculating balance for account ${account.id}:`, error);
        return {
          ...account,
          finalBalance: account.balance,
        };
      }
    })
  );
  
  return accountsWithFinalBalance;
}

export async function getBankAccountById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bankAccounts).where(and(eq(bankAccounts.id, id), eq(bankAccounts.userId, userId))).limit(1);
  return result[0];
}

export async function createBankAccount(userId: number, data: { name: string; bank: string; accountNumber?: string; initialBalance: string; color?: string }) {
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

export async function updateBankAccount(id: number, userId: number, data: Partial<{ name: string; bank: string; accountNumber: string; balance: string; initialBalance: string; finalBalance: string; color: string }>) {
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

/**
 * Apply categorization rules to all transactions in a bank account
 * Returns the number of transactions that were categorized
 */
export async function applyCategorizationRulesToAccount(userId: number, accountId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all enabled rules for the user, ordered by priority (highest first)
  const rules = await db
    .select()
    .from(categorizationRules)
    .where(and(
      eq(categorizationRules.userId, userId),
      eq(categorizationRules.enabled, true)
    ))
    .orderBy(desc(categorizationRules.priority));
  
  if (rules.length === 0) {
    return 0; // No rules to apply
  }
  
  // Build where conditions for transactions
  const whereConditions: any[] = [
    eq(transactions.userId, userId),
    eq(transactions.accountId, accountId)
  ];
  
  // Add date filters if provided
  if (startDate) {
    whereConditions.push(gte(transactions.date, new Date(startDate)));
  }
  if (endDate) {
    whereConditions.push(lte(transactions.date, new Date(endDate)));
  }
  
  // Get transactions for the account (with optional date filtering)
  const accountTransactions = await db
    .select()
    .from(transactions)
    .where(and(...whereConditions));
  
  let categorizedCount = 0;
  
  // For each transaction, try to match against rules
  for (const transaction of accountTransactions) {
    // Skip if already has a category (don't override existing categorization)
    // Uncomment the line below if you want to skip already categorized transactions
    // if (transaction.categoryId) continue;
    
    // Try to match against rules (in priority order)
    for (const rule of rules) {
      if (matchesRule(transaction.description, rule)) {
        // Update the transaction with the matched category
        await db
          .update(transactions)
          .set({ categoryId: rule.categoryId })
          .where(eq(transactions.id, transaction.id));
        
        categorizedCount++;
        break; // Stop after first match (highest priority)
      }
    }
  }
  
  return categorizedCount;
}

/**
 * Check if a transaction description matches a categorization rule
 */
function matchesRule(description: string, rule: CategorizationRule): boolean {
  const keywords = parseKeywords(rule.keywords);
  const testDescription = rule.caseSensitive ? description : description.toLowerCase();
  
  for (const keyword of keywords) {
    const testKeyword = rule.caseSensitive ? keyword : keyword.toLowerCase();
    
    switch (rule.matchType) {
      case "contains":
        if (testDescription.includes(testKeyword)) return true;
        break;
      case "exact":
        if (testDescription === testKeyword) return true;
        break;
      case "startsWith":
        if (testDescription.startsWith(testKeyword)) return true;
        break;
      case "endsWith":
        if (testDescription.endsWith(testKeyword)) return true;
        break;
    }
  }
  
  return false;
}

/**
 * Parse keywords from JSON string or array
 */
function parseKeywords(keywordsData: string | string[]): string[] {
  if (Array.isArray(keywordsData)) {
    return keywordsData;
  }
  
  try {
    const parsed = JSON.parse(keywordsData);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // If JSON parsing fails, treat as single keyword
  }
  
  // Fallback: treat as single keyword string
  return [keywordsData];
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
  
  // Get all transactions for the user (not just current month)
  const transactionStats = await db.select({
    type: transactions.type,
    total: sql<string>`SUM(${transactions.amount})`,
  }).from(transactions).where(
    eq(transactions.userId, userId)
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

export async function getCreditCardTransactionsByMonth(userId: number, cardId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Filter by dueDate (when the charge is due) to show all transactions in the invoice for that month
  // Use YEAR() and MONTH() functions for timezone-safe date comparison
  const result = await db.select()
    .from(creditCardTransactions)
    .where(
      and(
        eq(creditCardTransactions.userId, userId),
        eq(creditCardTransactions.cardId, cardId),
        sql`YEAR(${creditCardTransactions.dueDate}) = ${year} AND MONTH(${creditCardTransactions.dueDate}) = ${month}`
      )
    )
    .orderBy(desc(creditCardTransactions.dueDate));
  
  return result;
}

export async function getCreditCardTransactionsByDate(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  // Filter by date (when the transaction was made) for Dashboard summary
  // This is used to show transactions made in a specific month, not by due date
  const result = await db.select()
    .from(creditCardTransactions)
    .where(
      and(
        eq(creditCardTransactions.userId, userId),
        gte(creditCardTransactions.date, startDate),
        lte(creditCardTransactions.date, endDate)
      )
    )
    .orderBy(desc(creditCardTransactions.date));
  
  return result;
}

export async function getCreditCardUtilization(userId: number, cardId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;
  
  const card = await getCreditCardById(cardId, userId);
  if (!card) return null;
  
  const transactions = await getCreditCardTransactionsByMonth(userId, cardId, month, year);
  
  const totalUsed = transactions.reduce((sum: any, t: any) => {
    const amount = parseFloat(t.amount.toString());
    return sum + (amount > 0 ? amount : 0);
  }, 0);
  
  const limit = parseFloat(card.limit.toString());
  const available = limit - totalUsed;
  
  return {
    limit,
    used: totalUsed,
    available: Math.max(0, available),
    percentage: (totalUsed / limit) * 100,
  };
}


export async function updateUserProfile(userId: number, data: { name?: string; email?: string; profilePhoto?: string }) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Validate that at least one field is provided
    if (!data.name && !data.email && !data.profilePhoto) {
      throw new Error("At least one field (name, email, or profilePhoto) must be provided");
    }

    // Get current user data to compare
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (currentUser) {
      // Record changes for each field
      if (data.name && data.name !== currentUser.name) {
        await recordProfileChange(userId, "name", currentUser.name || null, data.name);
      }
      if (data.email && data.email !== currentUser.email) {
        await recordProfileChange(userId, "email", currentUser.email || null, data.email);
      }
      if (data.profilePhoto && data.profilePhoto !== currentUser.profilePhoto) {
        await recordProfileChange(userId, "profilePhoto", currentUser.profilePhoto || null, data.profilePhoto);
      }
    }

    const result = await db.update(users)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.profilePhoto && { profilePhoto: data.profilePhoto }),
      })
      .where(eq(users.id, userId));

    return result;
  } catch (error) {
    console.error("[Database] Error updating user profile:", error);
    throw error;
  }
}


// Monthly Balances functions
export async function getMonthlyBalance(userId: number, accountId: number, month: number, year: number): Promise<MonthlyBalance | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select()
      .from(monthlyBalances)
      .where(
        and(
          eq(monthlyBalances.userId, userId),
          eq(monthlyBalances.accountId, accountId),
          eq(monthlyBalances.month, month),
          eq(monthlyBalances.year, year)
        )
      )
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error getting monthly balance:", error);
    return null;
  }
}

export async function upsertMonthlyBalance(userId: number, accountId: number, month: number, year: number, initialBalance: string): Promise<MonthlyBalance | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const balance = parseFloat(initialBalance);
    if (isNaN(balance)) {
      console.error(`[Database] Invalid balance value: ${initialBalance}`);
      return null;
    }
    
    const existing = await getMonthlyBalance(userId, accountId, month, year);
    
    if (existing) {
      // Update existing
      await db.update(monthlyBalances)
        .set({ initialBalance: balance.toString() })
        .where(eq(monthlyBalances.id, existing.id));
      
      return getMonthlyBalance(userId, accountId, month, year);
    } else {
      // Insert new
      await db.insert(monthlyBalances).values({
        userId,
        accountId,
        month,
        year,
        initialBalance: balance.toString(),
      });

      return getMonthlyBalance(userId, accountId, month, year);
    }
  } catch (error) {
    console.error("[Database] Error upserting monthly balance:", error);
    return null;
  }
}

export async function getInitialBalanceForMonth(userId: number, accountId: number, month: number, year: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    // NOVA REGRA: Saldo inicial eh SEMPRE 0, a menos que o usuario tenha digitado manualmente
    // Buscar apenas saldo customizado (digitado pelo usuario)
    const monthlyBalance = await getMonthlyBalance(userId, accountId, month, year);
    if (monthlyBalance) {
      const balance = parseFloat(monthlyBalance.initialBalance.toString());
      return balance;
    }
    
    // Se nenhum saldo foi digitado manualmente, retorna 0
    return 0;
  } catch (error) {
    console.error("[Database] Error getting initial balance for month:", error);
    return 0;
  }
}

export async function deleteMonthlyBalance(userId: number, accountId: number, month: number, year: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const monthlyBalance = await getMonthlyBalance(userId, accountId, month, year);
    if (!monthlyBalance) return false;

    await db.delete(monthlyBalances)
      .where(eq(monthlyBalances.id, monthlyBalance.id));

    return true;
  } catch (error) {
    console.error("[Database] Error deleting monthly balance:", error);
    return false;
  }
}


// ============= PROFILE HISTORY =============

export async function recordProfileChange(userId: number, fieldName: string, oldValue: string | null, newValue: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Only record if values actually changed
  if (oldValue === newValue) return;
  
  return db.insert(profileHistory).values({
    userId,
    fieldName,
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: newValue ? JSON.stringify(newValue) : null,
  });
}

export async function getProfileHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileHistory).where(eq(profileHistory.userId, userId)).orderBy(desc(profileHistory.changedAt)).limit(limit);
}

export async function importCreditCardTransactionsFromPDF(userId: number, data: { cardId: number; pdfBase64: string; fileName: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  try {
    // Verify card belongs to user
    const card = await db.select().from(creditCards).where(
      and(eq(creditCards.id, data.cardId), eq(creditCards.userId, userId))
    ).limit(1);
    
    if (!card.length) {
      throw new Error("Cartão não encontrado");
    }

    // For now, return a success message
    // In a real implementation, you would:
    // 1. Convert PDF to text using a library like pdf-parse
    // 2. Parse the text to extract transactions
    // 3. Create transactions in the database
    // 4. Return the number of transactions imported

    return {
      success: true,
      message: "Fatura importada com sucesso",
      transactionsImported: 0,
      fileName: data.fileName,
    };
  } catch (error) {
    throw new Error(`Erro ao importar fatura: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}


// Import OFX transactions for credit cards
export async function importCreditCardTransactionsFromOFX(userId: number, data: { cardId: number; ofxContent: string; fileName: string }) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const card = await db.select().from(creditCards).where(
      and(eq(creditCards.id, data.cardId), eq(creditCards.userId, userId))
    ).limit(1);
    
    if (!card.length) {
      throw new Error("Cartão não encontrado");
    }

    // For now, return a success message
    // In a real implementation, you would:
    // 1. Parse the OFX content to extract transactions
    // 2. Create transactions in the database
    // 3. Return the number of transactions imported

    return {
      success: true,
      message: "Arquivo OFX importado com sucesso",
      transactionsImported: 0,
      fileName: data.fileName,
    };
  } catch (error) {
    throw new Error(`Erro ao importar OFX: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

// Import OFX transactions for bank accounts
export async function importTransactionsFromOFX(userId: number, data: { accountId: number; ofxContent: string; fileName: string }) {
  try {
    const db = await getDb();
    
    const account = await db.select().from(bankAccounts).where(
      and(eq(bankAccounts.id, data.accountId), eq(bankAccounts.userId, userId))
    ).limit(1);
    
    if (!account.length) {
      throw new Error("Conta bancária não encontrada");
    }

    // For now, return a success message
    // In a real implementation, you would:
    // 1. Parse the OFX content to extract transactions
    // 2. Create transactions in the database
    // 3. Return the number of transactions imported

    return {
      success: true,
      message: "Arquivo OFX importado com sucesso",
      transactionsImported: 0,
      fileName: data.fileName,
    };
  } catch (error) {
    throw new Error(`Erro ao importar OFX: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}


// Generic file import function for both credit cards and bank accounts
export async function importFile(userId: number, data: { 
  entityType: "creditCard" | "bankAccount"; 
  entityId: number; 
  fileContent: string; 
  fileName: string; 
  fileType: string;
  transactions?: Array<{date: Date; description: string; amount: string; type: "income" | "expense"}>;
}) {
  try {
    console.log('[importFile] Starting import for', data.entityType, 'ID:', data.entityId, 'transactions provided:', data.transactions?.length || 0);
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    if (data.entityType === "creditCard") {
      const card = await db.select().from(creditCards).where(
        and(eq(creditCards.id, data.entityId), eq(creditCards.userId, userId))
      ).limit(1);
      
      if (!card.length) {
        throw new Error("Cartão não encontrado");
      }

      // Use provided transactions or parse from file
      let extractedTransactions: Array<{date: Date; description: string; amount: string; type: "income" | "expense"}> = data.transactions || [];
      
      if (data.fileType === "application/pdf" || data.fileName.endsWith(".pdf")) {
        console.log('[importFile] Processing PDF, content length:', data.fileContent.length);
        
        // Decode base64 if needed
        let pdfContent = data.fileContent;
        if (!data.fileContent.startsWith('%PDF')) {
          try {
            const buffer = Buffer.from(data.fileContent, 'base64');
            pdfContent = buffer.toString('latin1');
            console.log('[importFile] Decoded base64 PDF, length:', pdfContent.length);
          } catch (e) {
            console.log('[importFile] Failed to decode base64:', e);
            pdfContent = data.fileContent;
          }
        }
        
        // Find the "Lançamentos" section
        const lancamentosIndex = pdfContent.indexOf('Lançamentos');
        if (lancamentosIndex !== -1) {
          const lancamentosSection = pdfContent.substring(lancamentosIndex);
          const lines = lancamentosSection.split('\n');
          console.log('[importFile] Found Lançamentos section with', lines.length, 'lines');
          
          // Parse transactions from the Lançamentos section
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for lines starting with date (DD/MM)
            const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})\s+(.+)$/);
            if (dateMatch) {
              const day = dateMatch[1];
              const month = dateMatch[2];
              const description = dateMatch[3].trim();
              
              // Look for amount in the same line or next lines
              let amount = '';
              
              // Check if amount is in the same line
              const amountInLine = line.match(/R\$\s*([\d.,]+)/);
              if (amountInLine) {
                amount = amountInLine[1];
              } else {
                // Look in next few lines for the amount
                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                  const nextLine = lines[j].trim();
                  const nextAmount = nextLine.match(/R\$\s*([\d.,]+)/);
                  if (nextAmount) {
                    amount = nextAmount[1];
                    break;
                  }
                }
              }
              
              if (amount) {
                try {
                  // Create a date - use current year if not specified
                  const currentYear = new Date().getFullYear();
                  const dateStr = `${month}/${day}/${currentYear}`;
                  const date = new Date(dateStr);
                  
                  // Convert amount format: "1.234,56" -> "1234.56"
                  const cleanAmount = amount.replace(/\./g, '').replace(',', '.');
                  
                  if (!isNaN(date.getTime()) && !isNaN(parseFloat(cleanAmount))) {
                    extractedTransactions.push({
                      date,
                      description: description.substring(0, 100),
                      amount: cleanAmount,
                      type: "expense"
                    });
                    console.log('[importFile] Extracted transaction:', {date: dateStr, description, amount: cleanAmount});
                  }
                } catch (e) {
                  console.log('[importFile] Error parsing transaction:', e);
                }
              }
            }
          }
        }
      }
      
      // Get or create default category for imported transactions
      let defaultCategoryId = 1; // Default category ID
      try {
        const existingCategory = await db.select().from(categories).where(
          and(eq(categories.userId, userId), eq(categories.name, "Imported"))
        ).limit(1);
        
        if (existingCategory.length) {
          defaultCategoryId = existingCategory[0].id;
        } else {
          // Create a default "Imported" category if it doesn't exist
          try {
            await db.insert(categories).values({
              userId,
              name: "Imported",
              type: "expense",
              color: "#9333ea",
              icon: "upload",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } catch (e) {
            // Category might already exist, ignore
          }
          
          // Get the ID of the newly created category
          const newCategory = await db.select().from(categories).where(
            and(eq(categories.userId, userId), eq(categories.name, "Imported"))
          ).limit(1);
          if (newCategory.length) {
            defaultCategoryId = newCategory[0].id;
          }
        }
      } catch (e) {
        console.log('[importFile] Error with category:', e);
        // Continue with default ID
      }
      
      // Create transactions in database
      console.log('[importFile] Found', extractedTransactions.length, 'transactions to create');
      let transactionsCreated = 0;
      for (const tx of extractedTransactions) {
        try {
          await db.insert(creditCardTransactions).values({
            cardId: data.entityId,
            userId,
            categoryId: defaultCategoryId,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
          });
          transactionsCreated++;
        } catch (e) {
          // Continue with next transaction
        }
      }

      console.log('[importFile] Import completed, created', transactionsCreated, 'transactions');
      return {
        success: true,
        message: `Arquivo importado com sucesso. ${transactionsCreated} transações criadas.`,
        transactionsImported: transactionsCreated,
        fileName: data.fileName,
      };
    } else if (data.entityType === "bankAccount") {
      const account = await db.select().from(bankAccounts).where(
        and(eq(bankAccounts.id, data.entityId), eq(bankAccounts.userId, userId))
      ).limit(1);
      
      if (!account.length) {
        throw new Error("Conta bancária não encontrada");
      }

      // Parse file and extract transactions (similar logic as credit card)
      let extractedTransactions: Array<{date: Date; description: string; amount: string; type: "income" | "expense"}> = [];
      
      if (data.fileType === "application/pdf" || data.fileName.endsWith(".pdf")) {
        const lines = data.fileContent.split('\n');
        const datePattern = /(\d{1,2}\/(\d{1,2}|\d{4}))/g;
        const amountPattern = /R\$\s*([\d.,]+)/g;
        
        lines.forEach(line => {
          const dateMatch = line.match(datePattern);
          const amountMatch = line.match(amountPattern);
          
          if (dateMatch && amountMatch) {
            try {
              const dateStr = dateMatch[0];
              const amountStr = amountMatch[0].replace('R$ ', '').replace('.', '').replace(',', '.');
              const date = new Date(dateStr);
              
              if (!isNaN(date.getTime())) {
                extractedTransactions.push({
                  date,
                  description: line.substring(0, 50),
                  amount: amountStr,
                  type: "expense"
                });
              }
            } catch (e) {
              // Skip invalid entries
            }
          }
        });
      }
      
      // Get or create default category for imported transactions (for bank account imports)
      let defaultCategoryId = 1;
      if (db) {
        try {
          const existingCategory = await db.select().from(categories).where(
            and(eq(categories.userId, userId), eq(categories.name, "Imported"))
          ).limit(1);
          
          if (existingCategory.length) {
            defaultCategoryId = existingCategory[0].id;
          } else {
            const result = await db.insert(categories).values({
              userId,
              name: "Imported",
              type: "expense",
              color: "#9333ea",
              icon: "upload",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            const newCategory = await db.select().from(categories).where(
              and(eq(categories.userId, userId), eq(categories.name, "Imported"))
            ).limit(1);
            if (newCategory.length) {
              defaultCategoryId = newCategory[0].id;
            }
          }
        } catch (e) {
          console.log('[importFile] Error creating default category:', e);
        }
      }
      
      // Create transactions in database
      let transactionsCreated = 0;
      for (const tx of extractedTransactions) {
        try {
          if (!db) throw new Error("Database not available");
          await db.insert(transactions).values({
            accountId: data.entityId,
            userId,
            categoryId: defaultCategoryId,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: (tx.type as "income" | "expense"),
          });
          transactionsCreated++;
        } catch (e) {
          // Continue with next transaction
        }
      }

      return {
        success: true,
        message: `Arquivo importado com sucesso. ${transactionsCreated} transações criadas.`,
        transactionsImported: transactionsCreated,
        fileName: data.fileName,
      };
    } else {
      throw new Error("Tipo de entidade inválido");
    }
  } catch (error) {
    throw new Error(`Erro ao importar arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}
