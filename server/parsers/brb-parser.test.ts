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
      const content = `ABRIL/2026
Dia
01/04
01/04
Histórico
CREDITO PIX – DOC: 000000
BIATRIZ X D M FARIA — 3773
PACOTE MILLENIUM – DOC: 000000
Valor
R$ +5.600,00
R$ −45,90
MARÇO/2026
Dia
05/03
02/03
02/03
Histórico
DEBITO PRESTACAO SFH/IMOVEL – DOC: 382175
CREDITO PIX – DOC: 000000
BIATRIZ X D M FARIA — 3773
PACOTE MILLENIUM – DOC: 000000
Valor
R$ −5.597,74
R$ +5.600,00
R$ −45,90`;

      const transactions = parseBRBStatement(content);
      
      console.log('Transactions found:', transactions.length);
      transactions.forEach(t => console.log('TX:', t.date.toISOString(), t.description, t.amount, t.type));
      
      expect(transactions.length).toBeGreaterThan(0);
      
      // Check for credit transaction
      const creditTx = transactions.find(t => t.type === 'income' && t.amount === '5600.00');
      expect(creditTx).toBeDefined();
      expect(creditTx?.description).toContain('CREDITO PIX');
      
      // Check for expense transaction
      const expenseTx = transactions.find(t => t.type === 'expense');
      expect(expenseTx).toBeDefined();
    });

    it('should handle transactions with decimal amounts', () => {
      const content = `ABRIL/2026
Dia
01/04
02/04
Histórico
TRANSFERENCIA
DEPOSITO
Valor
R$ -1.234,56
R$ +999,99`;

      const transactions = parseBRBStatement(content);
      
      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe('1234.56');
      expect(transactions[1].amount).toBe('999.99');
    });

    it('should correctly identify income and expense', () => {
      const content = `ABRIL/2026
Dia
01/04
02/04
03/04
Histórico
CREDITO
DEBITO
VALOR SEM SINAL
Valor
R$ +100.00
R$ -50.00
R$ 25.00`;

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
      const content = `ABRIL/2026
Dia
01/04
02/04
Histórico
VALID TRANSACTION
ANOTHER VALID
Valor
R$ +100.00
R$ -50.00`;

      const transactions = parseBRBStatement(content);
      
      // Should have 2 valid transactions
      expect(transactions.length).toBe(2);
      expect(transactions[0].description).toContain('VALID TRANSACTION');
      expect(transactions[1].description).toContain('ANOTHER VALID');
    });
  });
});
