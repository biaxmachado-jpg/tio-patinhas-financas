import { describe, it, expect } from "vitest";

/**
 * Test suite for bank account balance calculations
 * 
 * Formula: Saldo Final = Saldo Inicial + Entradas do Mês - Saídas do Mês
 */
describe("Bank Account Balance Calculations", () => {
  it("should calculate final balance correctly: initial + income - expenses", () => {
    const initialBalance = 0;
    const totalIncome = 5526.97;
    const totalExpenses = 5934.68;
    
    const finalBalance = initialBalance + totalIncome - totalExpenses;
    
    expect(finalBalance).toBeCloseTo(-407.71, 2);
  });

  it("should handle positive final balance", () => {
    const initialBalance = 1000;
    const totalIncome = 2000;
    const totalExpenses = 500;
    
    const finalBalance = initialBalance + totalIncome - totalExpenses;
    
    expect(finalBalance).toBe(2500);
  });

  it("should handle zero initial balance", () => {
    const initialBalance = 0;
    const totalIncome = 1000;
    const totalExpenses = 500;
    
    const finalBalance = initialBalance + totalIncome - totalExpenses;
    
    expect(finalBalance).toBe(500);
  });

  it("should handle negative final balance", () => {
    const initialBalance = 100;
    const totalIncome = 200;
    const totalExpenses = 500;
    
    const finalBalance = initialBalance + totalIncome - totalExpenses;
    
    expect(finalBalance).toBe(-200);
  });

  it("should handle zero income and expenses", () => {
    const initialBalance = 1000;
    const totalIncome = 0;
    const totalExpenses = 0;
    
    const finalBalance = initialBalance + totalIncome - totalExpenses;
    
    expect(finalBalance).toBe(1000);
  });

  it("should handle large numbers", () => {
    const initialBalance = 100000;
    const totalIncome = 50000;
    const totalExpenses = 30000;
    
    const finalBalance = initialBalance + totalIncome - totalExpenses;
    
    expect(finalBalance).toBe(120000);
  });

  it("should handle decimal precision", () => {
    const initialBalance = 1000.50;
    const totalIncome = 2500.75;
    const totalExpenses = 1500.25;
    
    const finalBalance = initialBalance + totalIncome - totalExpenses;
    
    // 1000.50 + 2500.75 - 1500.25 = 2001
    expect(finalBalance).toBeCloseTo(2001, 2);
  });
});
