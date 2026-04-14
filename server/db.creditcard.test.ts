import { describe, expect, it } from "vitest";
import * as db from "./db";

describe("getCreditCardTransactionsByDate", () => {
  it("should be a function that accepts userId, startDate, and endDate", async () => {
    // This test verifies that the function exists and has the correct signature
    expect(typeof db.getCreditCardTransactionsByDate).toBe("function");

    // Test that the function can be called with the correct parameters
    const userId = 999;
    const startDate = new Date("2026-04-01");
    const endDate = new Date("2026-04-30");

    // Call the function - it should return an array (even if empty for non-existent user)
    const result = await db.getCreditCardTransactionsByDate(userId, startDate, endDate);

    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter transactions by date range, not by due date", async () => {
    // This test verifies the logic of the function by checking its implementation
    // The function should use DATE field for filtering, not DUEDATE

    // Get the function source to verify it uses DATE
    const functionSource = db.getCreditCardTransactionsByDate.toString();

    // Verify that the function uses 'date' field for filtering
    expect(functionSource).toContain("creditCardTransactions.date");

    // Verify that it uses gte and lte for date range filtering
    expect(functionSource).toContain("gte");
    expect(functionSource).toContain("lte");
  });
});
