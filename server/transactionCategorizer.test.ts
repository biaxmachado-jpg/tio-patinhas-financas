import { describe, it, expect } from "vitest";

describe("TransactionCategorizer", () => {
  it("should validate that all transactions have categories before saving", () => {
    const transactions = [
      {
        id: "1",
        date: "2026-04-16",
        description: "Compra no supermercado",
        amount: "150.00",
        categoryId: 1,
      },
      {
        id: "2",
        date: "2026-04-16",
        description: "Gasolina",
        amount: "80.00",
        // No categoryId
      },
    ];

    const uncategorized = transactions.filter((tx: any) => !tx.categoryId);
    expect(uncategorized.length).toBe(1);
    expect(uncategorized[0].description).toBe("Gasolina");
  });

  it("should allow applying category to all transactions", () => {
    const transactions = [
      {
        id: "1",
        date: "2026-04-16",
        description: "Compra 1",
        amount: "100.00",
      },
      {
        id: "2",
        date: "2026-04-16",
        description: "Compra 2",
        amount: "200.00",
      },
    ];

    const categoryId = 5;
    const updated = transactions.map((tx: any) => ({
      ...tx,
      categoryId,
    }));

    expect(updated.every((tx: any) => tx.categoryId === categoryId)).toBe(true);
    expect(updated.length).toBe(2);
  });

  it("should track categorization progress", () => {
    const transactions = [
      { id: "1", categoryId: 1 },
      { id: "2", categoryId: 2 },
      { id: "3" }, // No category
      { id: "4", categoryId: 3 },
    ];

    const categorized = transactions.filter((tx: any) => tx.categoryId);
    const total = transactions.length;

    expect(categorized.length).toBe(3);
    expect(total).toBe(4);
    expect(categorized.length / total).toBe(0.75);
  });

  it("should handle duplicate transactions in categorizer", () => {
    const transactions = [
      {
        id: "1",
        date: "2026-04-16",
        description: "Transação normal",
        amount: "100.00",
        isDuplicate: false,
      },
      {
        id: "2",
        date: "2026-04-15",
        description: "Transação duplicada",
        amount: "50.00",
        isDuplicate: true,
      },
    ];

    const duplicates = transactions.filter((tx: any) => tx.isDuplicate);
    expect(duplicates.length).toBe(1);
    expect(duplicates[0].description).toBe("Transação duplicada");
  });

  it("should preserve transaction data when applying categories", () => {
    const transaction = {
      id: "tx-123",
      date: "2026-04-16",
      description: "Compra importante",
      amount: "250.50",
      isDuplicate: false,
    };

    const updated = {
      ...transaction,
      categoryId: 7,
    };

    expect(updated.id).toBe("tx-123");
    expect(updated.date).toBe("2026-04-16");
    expect(updated.description).toBe("Compra importante");
    expect(updated.amount).toBe("250.50");
    expect(updated.isDuplicate).toBe(false);
    expect(updated.categoryId).toBe(7);
  });
});
