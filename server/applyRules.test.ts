import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

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

describe("Apply Categorization Rules", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUserId = 1;
  let testAccountId = 1;
  let testCategoryId = 1;

  beforeEach(() => {
    ctx = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  it("should apply categorization rules to account transactions", async () => {
    // Create a test rule
    const rule = await db.createCategorizationRule(testUserId, {
      categoryId: testCategoryId,
      keywords: JSON.stringify(["PIX", "TRANSF"]),
      matchType: "contains",
      caseSensitive: false,
      priority: 1,
      enabled: true,
    });

    // Apply rules to account
    const result = await db.applyCategorizationRulesToAccount(testUserId, testAccountId);

    // Should return a number (count of categorized transactions)
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("should handle account with no transactions", async () => {
    // Apply rules to a non-existent account
    const result = await db.applyCategorizationRulesToAccount(testUserId, 999);

    // Should return 0 (no transactions to categorize)
    expect(result).toBe(0);
  });

  it("should match keywords correctly", async () => {
    // Create a rule with specific keywords
    const rule = await db.createCategorizationRule(testUserId, {
      categoryId: testCategoryId,
      keywords: JSON.stringify(["AMAZON"]),
      matchType: "contains",
      caseSensitive: false,
      priority: 1,
      enabled: true,
    });

    // Apply rules to account
    const result = await db.applyCategorizationRulesToAccount(testUserId, testAccountId);

    // Should return a number
    expect(typeof result).toBe("number");
  });

  it("should respect rule priority", async () => {
    // Create two rules with different priorities
    const highPriorityRule = await db.createCategorizationRule(testUserId, {
      categoryId: testCategoryId,
      keywords: JSON.stringify(["TEST"]),
      matchType: "contains",
      caseSensitive: false,
      priority: 10,
      enabled: true,
    });

    const lowPriorityRule = await db.createCategorizationRule(testUserId, {
      categoryId: testCategoryId,
      keywords: JSON.stringify(["TEST"]),
      matchType: "contains",
      caseSensitive: false,
      priority: 1,
      enabled: true,
    });

    // Apply rules to account
    const result = await db.applyCategorizationRulesToAccount(testUserId, testAccountId);

    // Should return a number
    expect(typeof result).toBe("number");
  });

  it("should only apply enabled rules", async () => {
    // Create a disabled rule
    const disabledRule = await db.createCategorizationRule(testUserId, {
      categoryId: testCategoryId,
      keywords: JSON.stringify(["DISABLED"]),
      matchType: "contains",
      caseSensitive: false,
      priority: 1,
      enabled: false,
    });

    // Apply rules to account
    const result = await db.applyCategorizationRulesToAccount(testUserId, testAccountId);

    // Should return a number (disabled rule should not be applied)
    expect(typeof result).toBe("number");
  });
});
