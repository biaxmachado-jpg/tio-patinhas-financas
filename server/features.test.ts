import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user" as const,
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Tio Patinhas Finanças - Feature Tests", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("Bank Accounts", () => {
    it("should create a bank account", async () => {
      const result = await caller.bankAccounts.create({
        name: "Conta Corrente",
        bank: "Itaú",
        accountNumber: "123456-7",
        initialBalance: "1000.00",
      });

      expect(result).toBeDefined();
    });

    it("should list bank accounts", async () => {
      await caller.bankAccounts.create({
        name: "Conta 1",
        bank: "Bradesco",
        accountNumber: "111111-1",
        initialBalance: "500.00",
      });

      const accounts = await caller.bankAccounts.list();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);
    });
  });

  describe("Credit Cards", () => {
    it("should create a credit card", async () => {
      const result = await caller.creditCards.create({
        name: "Cartão Master",
        brand: "Mastercard",
        limit: "5000.00",
        dueDay: 15,
        closingDay: 10,
        color: "#3b82f6",
        lastFourDigits: "1234",
      });

      expect(result).toBeDefined();
    });

    it("should list credit cards", async () => {
      await caller.creditCards.create({
        name: "Cartão Visa",
        brand: "Visa",
        limit: "3000.00",
        dueDay: 20,
        closingDay: 15,
        color: "#ec4899",
        lastFourDigits: "5678",
      });

      const cards = await caller.creditCards.list();
      expect(Array.isArray(cards)).toBe(true);
    });
  });

  describe("Categories", () => {
    it("should create a category", async () => {
      const result = await caller.categories.create({
        name: "Alimentação",
        type: "expense",
        color: "#f59e0b",
        icon: "utensils",
      });

      expect(result).toBeDefined();
    });

    it("should list categories", async () => {
      await caller.categories.create({
        name: "Salário",
        type: "income",
        color: "#10b981",
        icon: "dollar-sign",
      });

      const categories = await caller.categories.list();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe("Transactions", () => {
    it("should list transactions", async () => {
      const transactions = await caller.transactions.list();
      expect(Array.isArray(transactions)).toBe(true);
    });

  });

  describe("Categorization Rules", () => {
    it("should list categorization rules", async () => {
      const rules = await caller.categorizationRules.list();
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe("Budgets", () => {
    it("should list budgets", async () => {
      const budgets = await caller.budgets.list({
        month: 4,
        year: 2026,
      });
      expect(Array.isArray(budgets)).toBe(true);
    });
  });

  describe("Dashboard Stats", () => {
    it("should get dashboard statistics", async () => {
      const stats = await caller.dashboard.stats({
        month: 4,
        year: 2026,
      });

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalIncome");
      expect(stats).toHaveProperty("totalExpense");
      expect(stats).toHaveProperty("totalBalance");
    });
  });
});
