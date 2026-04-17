import { describe, it, expect } from 'vitest';
import { parseBRBStatement, detectBRBFormat } from './brb-parser';

describe('BRB Parser', () => {
  describe('detectBRBFormat', () => {
    it('should detect BRB format when keywords are present', () => {
      const content = 'Agência 1234 Conta Corrente 5678';
      expect(detectBRBFormat(content)).toBe(true);
    });

    it('should not detect BRB format when keywords are missing', () => {
      const content = 'Some other bank statement content';
      expect(detectBRBFormat(content)).toBe(false);
    });
  });

  describe('parseBRBStatement', () => {
    it('should parse BRB statement with multiple months', () => {
      const content = `
ABRIL/2026
Dia  Histórico  Valor
01/04 CREDITO PIX – DOC: 000000 BIATRIZ X D M FARIA — 3773 R$ +5.600,00
02/04 SAQUE CAIXA ELETRONICO R$ -500,00
03/04 TRANSFERENCIA ENVIADA R$ -1.200,50

MARÇO/2026
Dia  Histórico  Valor
28/03 DEPOSITO CHEQUE R$ +2.000,00
29/03 PAGAMENTO BOLETO R$ -150,75
      `;

      const transactions = parseBRBStatement(content);
      
      expect(transactions.length).toBeGreaterThan(0);
      
      // Check April transactions
      const aprilTransactions = transactions.filter(t => t.date.getMonth() === 3); // April is month 3 (0-indexed)
      expect(aprilTransactions.length).toBeGreaterThan(0);
      
      // Check first transaction
      const firstTx = aprilTransactions[0];
      expect(firstTx.description).toContain('CREDITO PIX');
      expect(firstTx.amount).toBe('5600.00');
      expect(firstTx.type).toBe('income');
      
      // Check expense transaction
      const expenseTx = aprilTransactions.find(t => t.type === 'expense');
      expect(expenseTx).toBeDefined();
      expect(expenseTx?.amount).toBe('500.00');
    });

    it('should handle transactions with decimal amounts', () => {
      const content = `
ABRIL/2026
Dia  Histórico  Valor
01/04 TRANSFERENCIA R$ -1.234,56
02/04 DEPOSITO R$ +999,99
      `;

      const transactions = parseBRBStatement(content);
      
      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe('1234.56');
      expect(transactions[1].amount).toBe('999.99');
    });

    it('should correctly identify income and expense', () => {
      const content = `
ABRIL/2026
Dia  Histórico  Valor
01/04 CREDITO R$ +100.00
02/04 DEBITO R$ -50.00
03/04 VALOR SEM SINAL R$ 25.00
      `;

      const transactions = parseBRBStatement(content);
      
      expect(transactions[0].type).toBe('income');
      expect(transactions[1].type).toBe('expense');
      expect(transactions[2].type).toBe('income'); // Default to income when no sign
    });

    it('should handle empty content', () => {
      const content = '';
      const transactions = parseBRBStatement(content);
      expect(transactions.length).toBe(0);
    });

    it('should skip invalid date formats', () => {
      const content = `
ABRIL/2026
Dia  Histórico  Valor
01/04 VALID TRANSACTION R$ +100.00
99/99 INVALID DATE R$ +200.00
02/04 ANOTHER VALID R$ -50.00
      `;

      const transactions = parseBRBStatement(content);
      
      // Should have 2 valid transactions
      expect(transactions.length).toBe(2);
      expect(transactions[0].description).toContain('VALID TRANSACTION');
      expect(transactions[1].description).toContain('ANOTHER VALID');
    });
  });
});
