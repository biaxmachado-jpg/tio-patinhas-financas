import { describe, it, expect } from 'vitest';
import { calculateGroupTotals, ClassifiedTransaction } from '../client/src/lib/transactionClassifier';

describe('calculateGroupTotals', () => {
  it('should correctly sum transactions with string amounts', () => {
    const grouped = {
      vista: [
        {
          id: 1,
          type: 'vista' as const,
          description: 'Test 1',
          amount: '100.50', // String amount
          date: new Date(),
          dueDate: null,
          installments: 1,
          currentInstallment: 1,
          categoryId: 1,
          paid: false,
          paidAt: null,
          notes: null,
        } as ClassifiedTransaction,
        {
          id: 2,
          type: 'vista' as const,
          description: 'Test 2',
          amount: '50.25', // String amount
          date: new Date(),
          dueDate: null,
          installments: 1,
          currentInstallment: 1,
          categoryId: 1,
          paid: false,
          paidAt: null,
          notes: null,
        } as ClassifiedTransaction,
      ],
      parcelada: [
        {
          id: 3,
          type: 'parcelada' as const,
          description: 'Installment 1',
          amount: '454.94', // String amount
          date: new Date(),
          dueDate: null,
          installments: 3,
          currentInstallment: 1,
          categoryId: 1,
          paid: false,
          paidAt: null,
          notes: null,
        } as ClassifiedTransaction,
        {
          id: 4,
          type: 'parcelada' as const,
          description: 'Installment 2',
          amount: '84.50', // String amount
          date: new Date(),
          dueDate: null,
          installments: 3,
          currentInstallment: 2,
          categoryId: 1,
          paid: false,
          paidAt: null,
          notes: null,
        } as ClassifiedTransaction,
        {
          id: 5,
          type: 'parcelada' as const,
          description: 'Installment 3',
          amount: '470.01', // String amount
          date: new Date(),
          dueDate: null,
          installments: 3,
          currentInstallment: 3,
          categoryId: 1,
          paid: false,
          paidAt: null,
          notes: null,
        } as ClassifiedTransaction,
      ],
      credito: [
        {
          id: 6,
          type: 'credito' as const,
          description: 'Refund',
          amount: '-50.00', // String negative amount
          date: new Date(),
          dueDate: null,
          installments: 1,
          currentInstallment: 1,
          categoryId: 1,
          paid: false,
          paidAt: null,
          notes: null,
        } as ClassifiedTransaction,
      ],
    };

    const totals = calculateGroupTotals(grouped);

    // Vista: 100.50 + 50.25 = 150.75
    expect(totals.vista).toBeCloseTo(150.75, 2);
    
    // Parcelada: 454.94 + 84.50 + 470.01 = 1009.45
    expect(totals.parcelada).toBeCloseTo(1009.45, 2);
    
    // Credito: -50.00
    expect(totals.credito).toBeCloseTo(-50.00, 2);
    
    // Total: 150.75 + 1009.45 - 50.00 = 1110.20
    expect(totals.total).toBeCloseTo(1110.20, 2);
    
    // Should NOT be NaN
    expect(Number.isNaN(totals.vista)).toBe(false);
    expect(Number.isNaN(totals.parcelada)).toBe(false);
    expect(Number.isNaN(totals.credito)).toBe(false);
    expect(Number.isNaN(totals.total)).toBe(false);
  });

  it('should handle numeric amounts', () => {
    const grouped = {
      vista: [
        {
          id: 1,
          type: 'vista' as const,
          description: 'Test',
          amount: 100.50, // Numeric amount
          date: new Date(),
          dueDate: null,
          installments: 1,
          currentInstallment: 1,
          categoryId: 1,
          paid: false,
          paidAt: null,
          notes: null,
        } as ClassifiedTransaction,
      ],
      parcelada: [],
      credito: [],
    };

    const totals = calculateGroupTotals(grouped);
    expect(totals.vista).toBeCloseTo(100.50, 2);
  });

  it('should return 0 for empty groups', () => {
    const grouped = {
      vista: [],
      parcelada: [],
      credito: [],
    };

    const totals = calculateGroupTotals(grouped);
    expect(totals.vista).toBe(0);
    expect(totals.parcelada).toBe(0);
    expect(totals.credito).toBe(0);
    expect(totals.total).toBe(0);
  });
});
