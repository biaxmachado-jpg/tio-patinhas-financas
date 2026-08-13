import { describe, it, expect } from 'vitest';
import {
  classifyTransaction,
  groupTransactionsByType,
  calculateGroupTotals,
  hasInstallmentPattern,
  getTransactionTypeLabel,
  getTransactionTypeColor,
} from './transactionClassifier';

describe('Transaction Classifier', () => {
  const baseDate = new Date('2026-04-15');
  const dueDate = new Date('2026-04-20');

  describe('hasInstallmentPattern', () => {
    it('should detect installment pattern like 1/12', () => {
      expect(hasInstallmentPattern('Compra 1/12 - Loja XYZ')).toBe(true);
    });

    it('should detect installment pattern like 2/10', () => {
      expect(hasInstallmentPattern('Pagamento 2/10 - Supermercado')).toBe(true);
    });

    it('should not match non-installment patterns', () => {
      expect(hasInstallmentPattern('Compra simples - Loja')).toBe(false);
    });

    it('should not match dates in format DD/MM', () => {
      expect(hasInstallmentPattern('Compra em 15/04')).toBe(false);
    });

    it('should detect multiple digit installments', () => {
      expect(hasInstallmentPattern('Parcelado 12/24 - Eletrônicos')).toBe(true);
    });
  });

  describe('classifyTransaction - Créditos', () => {
    it('should classify negative amounts as crédito', () => {
      const transaction = {
        id: 1,
        amount: '-100.00',
        date: baseDate,
        dueDate,
        installments: 1,
        description: 'Reembolso',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('credito');
    });

    it('should classify negative amounts as crédito even with installments', () => {
      const transaction = {
        id: 1,
        amount: '-500.00',
        date: baseDate,
        dueDate,
        installments: 3,
        description: 'Reembolso parcelado',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('credito');
    });
  });

  describe('classifyTransaction - Parceladas', () => {
    it('should classify transactions with installments > 1 as parcelada', () => {
      const transaction = {
        id: 1,
        amount: '1000.00',
        date: baseDate,
        dueDate,
        installments: 3,
        description: 'Compra parcelada',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('parcelada');
    });

    it('should classify transactions with installment pattern in description as parcelada', () => {
      const transaction = {
        id: 1,
        amount: '500.00',
        date: baseDate,
        dueDate,
        installments: 1,
        description: 'Compra 2/10 - Loja',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('parcelada');
    });

    it('should NOT classify a single-installment purchase as parcelada just because its date is far from the due date (regression: date-proximity heuristic wrongly dumped almost every à vista purchase into parcelada, since a real invoice never has transactions in the days right before its own due date)', () => {
      const oldDate = new Date('2026-04-10'); // 10 days before due date
      const transaction = {
        id: 1,
        amount: '200.00',
        date: oldDate,
        dueDate,
        installments: 1,
        description: 'Compra antiga',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });
  });

  describe('classifyTransaction - À Vista', () => {
    it('should classify single installment within 5 days before due date as vista', () => {
      const recentDate = new Date('2026-04-18'); // 2 days before due date
      const transaction = {
        id: 1,
        amount: '150.00',
        date: recentDate,
        dueDate,
        installments: 1,
        description: 'Compra à vista',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });

    it('should classify single installment exactly 5 days before due date as vista', () => {
      const fiveDaysBefore = new Date('2026-04-15'); // 5 days before due date
      const transaction = {
        id: 1,
        amount: '100.00',
        date: fiveDaysBefore,
        dueDate,
        installments: 1,
        description: 'Compra à vista',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });

    it('should classify single installment on due date as vista', () => {
      const transaction = {
        id: 1,
        amount: '100.00',
        date: dueDate,
        dueDate,
        installments: 1,
        description: 'Compra no vencimento',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });

    it('should classify single installment without due date as vista', () => {
      const transaction = {
        id: 1,
        amount: '100.00',
        date: baseDate,
        dueDate: null,
        installments: 1,
        description: 'Compra sem data de vencimento',
      };
      expect(classifyTransaction(transaction)).toBe('vista');
    });
  });

  describe('groupTransactionsByType', () => {
    it('should group transactions by type correctly', () => {
      const transactions = [
        {
          id: 1,
          amount: '100.00',
          date: new Date('2026-04-18'),
          dueDate,
          installments: 1,
          description: 'À vista',
        },
        {
          id: 2,
          amount: '300.00',
          date: new Date('2026-04-10'),
          dueDate,
          installments: 3,
          description: 'Parcelada',
        },
        {
          id: 3,
          amount: '-50.00',
          date: new Date('2026-04-15'),
          dueDate,
          installments: 1,
          description: 'Crédito',
        },
      ];

      const grouped = groupTransactionsByType(transactions, dueDate);

      expect(grouped.vista).toHaveLength(1);
      expect(grouped.parcelada).toHaveLength(1);
      expect(grouped.credito).toHaveLength(1);
    });

    it('should handle empty transaction list', () => {
      const grouped = groupTransactionsByType([], dueDate);

      expect(grouped.vista).toHaveLength(0);
      expect(grouped.parcelada).toHaveLength(0);
      expect(grouped.credito).toHaveLength(0);
    });

    it('should include type field in classified transactions', () => {
      const transactions = [
        {
          id: 1,
          amount: '100.00',
          date: new Date('2026-04-18'),
          dueDate,
          installments: 1,
          description: 'À vista',
        },
      ];

      const grouped = groupTransactionsByType(transactions, dueDate);

      expect(grouped.vista[0].type).toBe('vista');
    });
  });

  describe('calculateGroupTotals', () => {
    it('should calculate totals correctly', () => {
      const grouped = {
        vista: [
          {
            id: 1,
            amount: 100,
            type: 'vista' as const,
            date: new Date(),
            dueDate: null,
            installments: 1,
            currentInstallment: 1,
            categoryId: 1,
            paid: false,
            paidAt: null,
            notes: null,
            description: '',
          },
        ],
        parcelada: [
          {
            id: 2,
            amount: 300,
            type: 'parcelada' as const,
            date: new Date(),
            dueDate: null,
            installments: 3,
            currentInstallment: 1,
            categoryId: 1,
            paid: false,
            paidAt: null,
            notes: null,
            description: '',
          },
        ],
        credito: [
          {
            id: 3,
            amount: -50,
            type: 'credito' as const,
            date: new Date(),
            dueDate: null,
            installments: 1,
            currentInstallment: 1,
            categoryId: 1,
            paid: false,
            paidAt: null,
            notes: null,
            description: '',
          },
        ],
      };

      const totals = calculateGroupTotals(grouped);

      expect(totals.vista).toBe(100);
      expect(totals.parcelada).toBe(300);
      expect(totals.credito).toBe(-50);
      expect(totals.total).toBe(350);
    });

    it('should handle empty groups', () => {
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

  describe('getTransactionTypeLabel', () => {
    it('should return correct label for vista', () => {
      expect(getTransactionTypeLabel('vista')).toBe('À Vista');
    });

    it('should return correct label for parcelada', () => {
      expect(getTransactionTypeLabel('parcelada')).toBe('Parceladas');
    });

    it('should return correct label for credito', () => {
      expect(getTransactionTypeLabel('credito')).toBe('Créditos');
    });
  });

  describe('getTransactionTypeColor', () => {
    it('should return red color for vista', () => {
      expect(getTransactionTypeColor('vista')).toBe('#ef4444');
    });

    it('should return amber color for parcelada', () => {
      expect(getTransactionTypeColor('parcelada')).toBe('#f59e0b');
    });

    it('should return green color for credito', () => {
      expect(getTransactionTypeColor('credito')).toBe('#10b981');
    });
  });

  describe('Edge cases', () => {
    it('should handle transactions with zero amount', () => {
      const transaction = {
        id: 1,
        amount: '0.00',
        date: baseDate,
        dueDate,
        installments: 1,
        description: 'Zero amount',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });

    it('should handle very old transactions (single installment = vista, regardless of date)', () => {
      const veryOldDate = new Date('2026-01-01');
      const transaction = {
        id: 1,
        amount: '100.00',
        date: veryOldDate,
        dueDate,
        installments: 1,
        description: 'Very old',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });

    it('should handle future transactions (single installment = vista, regardless of date)', () => {
      const futureDate = new Date('2026-05-01');
      const transaction = {
        id: 1,
        amount: '100.00',
        date: futureDate,
        dueDate,
        installments: 1,
        description: 'Future',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });

    it('should handle high installment counts', () => {
      const transaction = {
        id: 1,
        amount: '5000.00',
        date: baseDate,
        dueDate,
        installments: 36,
        description: 'Compra parcelada em 36x',
      };
      expect(classifyTransaction(transaction, dueDate)).toBe('parcelada');
    });

    // Regressão: uma transação com amount null/undefined (dado antigo ou
    // corrompido no banco) derrubava a página inteira do cartão com
    // "TypeError: Cannot read properties of null (reading 'toString')",
    // porque classifyTransaction chamava transaction.amount.toString() sem
    // checar null. Não deve lançar, e deve tratar como valor zero.
    it('should not throw when amount is null', () => {
      const transaction = {
        id: 1,
        amount: null,
        date: baseDate,
        dueDate,
        installments: 1,
        description: 'Transação com valor nulo',
      };
      expect(() => classifyTransaction(transaction, dueDate)).not.toThrow();
      expect(classifyTransaction(transaction, dueDate)).toBe('vista');
    });

    it('should not throw when amount is undefined', () => {
      const transaction = {
        id: 1,
        amount: undefined,
        date: baseDate,
        dueDate,
        installments: 1,
        description: 'Transação sem valor',
      };
      expect(() => classifyTransaction(transaction, dueDate)).not.toThrow();
    });

    it('calculateGroupTotals should treat null/undefined amounts as zero, not throw', () => {
      const grouped = {
        vista: [
          {
            id: 1,
            amount: null as any,
            type: 'vista' as const,
            date: new Date(),
            dueDate: null,
            installments: 1,
            currentInstallment: 1,
            categoryId: 1,
            paid: false,
            paidAt: null,
            notes: null,
            description: '',
          },
        ],
        parcelada: [],
        credito: [],
      };
      expect(() => calculateGroupTotals(grouped)).not.toThrow();
      expect(calculateGroupTotals(grouped).vista).toBe(0);
    });
  });
});
