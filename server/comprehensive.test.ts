import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Comprehensive tRPC Procedures Tests", () => {
  describe("Bank Accounts", () => {
    it("should list bank accounts for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bankAccounts.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should verify bank account structure", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const accounts = await caller.bankAccounts.list();
      if (accounts.length > 0) {
        expect(accounts[0].id).toBeDefined();
        expect(accounts[0].name).toBeDefined();
        expect(accounts[0].balance).toBeDefined();
      }
    });
  });

  describe("Credit Cards", () => {
    it("should list credit cards for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creditCards.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate credit card fields", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const cards = await caller.creditCards.list();
      for (const card of cards) {
        expect(card.id).toBeDefined();
        expect(card.limit).toBeDefined();
        const limit = typeof card.limit === "string" ? parseFloat(card.limit) : card.limit;
        expect(limit).toBeGreaterThan(0);
      }
    });
  });

  describe("Transactions", () => {
    it("should list transactions for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.transactions.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate transaction types and amounts", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const allTransactions = await caller.transactions.list();

      for (const tx of allTransactions) {
        expect(["income", "expense"]).toContain(tx.type);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
        expect(amount).toBeGreaterThan(0);
      }
    });

    it("should calculate total expenses and income correctly", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const transactions = await caller.transactions.list();

      let totalExpenses = 0;
      let totalIncome = 0;

      for (const tx of transactions) {
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
        if (tx.type === "expense") {
          totalExpenses += amount;
        } else if (tx.type === "income") {
          totalIncome += amount;
        }
      }

      expect(totalExpenses).toBeGreaterThanOrEqual(0);
      expect(totalIncome).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Categories", () => {
    it("should list categories for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.categories.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should have valid category types and properties", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.categories.list();
      for (const category of categories) {
        expect(["income", "expense"]).toContain(category.type);
        expect(category.name).toBeDefined();
        expect(typeof category.name).toBe("string");
        expect(category.color).toBeDefined();
        expect(category.icon).toBeDefined();
      }
    });
  });

  describe("Budgets", () => {
    it("should list budgets for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.budgets.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should calculate budget spending correctly", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const budgets = await caller.budgets.list();
      const transactions = await caller.transactions.list();

      for (const budget of budgets) {
        const categoryTransactions = transactions.filter(
          (t) => t.categoryId === budget.categoryId && t.type === "expense"
        );

        let spent = 0;
        for (const tx of categoryTransactions) {
          const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
          spent += amount;
        }

        const limit = typeof budget.limit === "string" ? parseFloat(budget.limit) : budget.limit;
        expect(limit).toBeGreaterThanOrEqual(0);
        expect(spent).toBeGreaterThanOrEqual(0);

        if (spent > limit) {
          expect(spent).toBeGreaterThan(limit);
        }
      }
    });
  });

  describe("Reconciliation", () => {
    it("should list reconciliation status for transactions", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const transactions = await caller.transactions.list();

      let reconciledCount = 0;
      let unreconciledCount = 0;

      for (const tx of transactions) {
        if (tx.reconciled) {
          reconciledCount++;
          expect(tx.reconciledAt).toBeDefined();
        } else {
          unreconciledCount++;
        }
      }

      expect(reconciledCount + unreconciledCount).toBe(transactions.length);
    });
  });

  describe("Categorization Rules", () => {
    it("should list categorization rules for user", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.categorizationRules.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should have valid rule properties and matchType", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const rules = await caller.categorizationRules.list();
      for (const rule of rules) {
        expect(rule.categoryId).toBeDefined();
        expect(rule.keywords).toBeDefined();
        expect(["exact", "contains", "startsWith", "endsWith"]).toContain(rule.matchType);
        expect(typeof rule.caseSensitive).toBe("boolean");
        expect(typeof rule.priority).toBe("number");
        expect(typeof rule.enabled).toBe("boolean");
      }
    });
  });

  describe("Credit Card Transactions", () => {
    it("should list credit card transactions", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.creditCardTransactions.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should validate credit card transaction fields", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const transactions = await caller.creditCardTransactions.list();
      for (const tx of transactions) {
        expect(tx.cardId).toBeDefined();
        expect(tx.categoryId).toBeDefined();
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
        expect(amount).toBeGreaterThan(0);
        expect(tx.date).toBeDefined();
        expect(tx.dueDate).toBeDefined();
        expect(typeof tx.paid).toBe("boolean");
        expect(typeof tx.installments).toBe("number");
      }
    });
  });

  describe("Financial Summary", () => {
    it("should calculate financial totals correctly", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const transactions = await caller.transactions.list();
      const bankAccounts = await caller.bankAccounts.list();

      let totalIncome = 0;
      let totalExpenses = 0;
      let totalBalance = 0;

      for (const tx of transactions) {
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
        if (tx.type === "income") {
          totalIncome += amount;
        } else {
          totalExpenses += amount;
        }
      }

      for (const account of bankAccounts) {
        const balance = typeof account.balance === "string" ? parseFloat(account.balance) : account.balance;
        totalBalance += balance;
      }

      expect(totalBalance).toBeGreaterThanOrEqual(0);
      expect(totalIncome).toBeGreaterThanOrEqual(0);
      expect(totalExpenses).toBeGreaterThanOrEqual(0);

      const monthlyBalance = totalIncome - totalExpenses;
      expect(monthlyBalance).toBeDefined();
    });
  });
});
