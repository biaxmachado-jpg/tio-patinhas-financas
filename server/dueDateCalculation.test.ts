import { describe, it, expect } from "vitest";

// Helper function to calculate dueDate
function calculateDueDate(transactionDate: Date, closingDay: number, dueDay: number): Date {
  const txDay = transactionDate.getDate();
  const txMonth = transactionDate.getMonth();
  const txYear = transactionDate.getFullYear();

  if (txDay >= closingDay) {
    // Transaction is in next billing cycle
    return new Date(txYear, txMonth + 1, dueDay);
  } else {
    // Transaction is in current billing cycle
    return new Date(txYear, txMonth, dueDay);
  }
}

describe("DueDate Calculation", () => {
  describe("Bradesco Card (closingDay=5, dueDay=10)", () => {
    const closingDay = 5;
    const dueDay = 10;

    it("should calculate dueDate for transaction before closing day", () => {
      const txDate = new Date(2026, 0, 2); // Jan 2
      const expected = new Date(2026, 0, 10); // Jan 10
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it("should calculate dueDate for transaction on closing day", () => {
      const txDate = new Date(2026, 0, 5); // Jan 5
      const expected = new Date(2026, 1, 10); // Feb 10
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it("should calculate dueDate for transaction after closing day", () => {
      const txDate = new Date(2026, 0, 12); // Jan 12
      const expected = new Date(2026, 1, 10); // Feb 10
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it("should calculate dueDate for transaction at end of month", () => {
      const txDate = new Date(2026, 0, 25); // Jan 25
      const expected = new Date(2026, 1, 10); // Feb 10
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it("should handle month boundary correctly", () => {
      const txDate = new Date(2026, 0, 31); // Jan 31
      const expected = new Date(2026, 1, 10); // Feb 10
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it("should handle year boundary correctly", () => {
      const txDate = new Date(2025, 11, 25); // Dec 25
      const expected = new Date(2026, 0, 10); // Jan 10
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });
  });

  describe("Different card configurations", () => {
    it("should work with closingDay=20, dueDay=5", () => {
      const closingDay = 20;
      const dueDay = 5;
      const txDate = new Date(2026, 0, 25); // Jan 25 (after closing)
      const expected = new Date(2026, 1, 5); // Feb 5
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it("should work with closingDay=10, dueDay=25", () => {
      const closingDay = 10;
      const dueDay = 25;
      const txDate = new Date(2026, 0, 5); // Jan 5 (before closing)
      const expected = new Date(2026, 0, 25); // Jan 25
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });

    it("should work with closingDay=1, dueDay=15", () => {
      const closingDay = 1;
      const dueDay = 15;
      const txDate = new Date(2026, 0, 1); // Jan 1 (on closing day)
      const expected = new Date(2026, 1, 15); // Feb 15
      const result = calculateDueDate(txDate, closingDay, dueDay);
      expect(result.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    });
  });

  describe("Real-world scenarios", () => {
    it("should match Bia's Bradesco card transactions", () => {
      const closingDay = 5;
      const dueDay = 10;

      // TX 450047: 2026-01-25 should be due 2026-02-10
      const tx1 = new Date(2026, 0, 25);
      const due1 = calculateDueDate(tx1, closingDay, dueDay);
      expect(due1.toISOString().split('T')[0]).toBe("2026-02-10");

      // TX 450048: 2026-01-12 should be due 2026-02-10
      const tx2 = new Date(2026, 0, 12);
      const due2 = calculateDueDate(tx2, closingDay, dueDay);
      expect(due2.toISOString().split('T')[0]).toBe("2026-02-10");

      // TX 450049: 2026-01-02 should be due 2026-01-10
      const tx3 = new Date(2026, 0, 2);
      const due3 = calculateDueDate(tx3, closingDay, dueDay);
      expect(due3.toISOString().split('T')[0]).toBe("2026-01-10");
    });
  });
});
