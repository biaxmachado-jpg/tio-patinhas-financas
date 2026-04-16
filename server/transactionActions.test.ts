import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { creditCardTransactions, creditCards, users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Transaction Actions", () => {
  let userId: number;
  let cardId: number;
  let transactionId: number;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test user
    const userResult = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      openId: `openid-${Date.now()}`,
    });
    userId = (userResult as any).insertId || 1;

    // Create test credit card
    const cardResult = await db.insert(creditCards).values({
      userId,
      name: "Test Card",
      brand: "Visa",
      limit: "5000.00",
      dueDay: 10,
      closingDay: 5,
      color: "#3b82f6",
      lastFourDigits: "1234",
    });
    cardId = (cardResult as any).insertId || 1;

    // Create test transaction
    const txResult = await db.insert(creditCardTransactions).values({
      userId,
      cardId,
      categoryId: 1,
      description: "Test Transaction",
      amount: "100.00",
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    transactionId = (txResult as any).insertId || 1;
  });

  afterAll(async () => {
    if (!db) return;
    // Cleanup
    await db.delete(creditCardTransactions).where(eq(creditCardTransactions.id, transactionId));
    await db.delete(creditCards).where(eq(creditCards.id, cardId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("should update transaction category", async () => {
    const result = await db
      .update(creditCardTransactions)
      .set({ categoryId: 2 })
      .where(eq(creditCardTransactions.id, transactionId));

    expect(result).toBeDefined();
  });

  it("should move transaction to next billing month", async () => {
    const tx = await db
      .select()
      .from(creditCardTransactions)
      .where(eq(creditCardTransactions.id, transactionId))
      .limit(1);

    const currentDue = new Date(tx[0].dueDate);
    const nextDue = new Date(currentDue.getFullYear(), currentDue.getMonth() + 1, currentDue.getDate());

    const result = await db
      .update(creditCardTransactions)
      .set({ dueDate: nextDue })
      .where(eq(creditCardTransactions.id, transactionId));

    expect(result).toBeDefined();

    const updated = await db
      .select()
      .from(creditCardTransactions)
      .where(eq(creditCardTransactions.id, transactionId))
      .limit(1);

    expect(updated[0].dueDate.getMonth()).toBe(nextDue.getMonth());
  });

  it("should delete transaction", async () => {
    // Create a transaction to delete
    const txResult = await db.insert(creditCardTransactions).values({
      userId,
      cardId,
      categoryId: 1,
      description: "Transaction to Delete",
      amount: "50.00",
      date: new Date(),
      dueDate: new Date(),
    });
    const deleteId = (txResult as any).insertId || 1;

    const result = await db
      .delete(creditCardTransactions)
      .where(eq(creditCardTransactions.id, deleteId));

    expect(result).toBeDefined();

    const deleted = await db
      .select()
      .from(creditCardTransactions)
      .where(eq(creditCardTransactions.id, deleteId));

    expect(deleted).toHaveLength(0);
  });

  it("should handle invalid transaction ID gracefully", async () => {
    const result = await db
      .select()
      .from(creditCardTransactions)
      .where(eq(creditCardTransactions.id, 99999));

    expect(result).toHaveLength(0);
  });
});
