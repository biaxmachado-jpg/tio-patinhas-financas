import { describe, it, expect } from "vitest";
import {
  detectBank,
  parseBradesco,
  parseItau,
  parseNubank,
  parseGeneric,
  parseFileWithBankDetection,
  getBankInfo,
  type BankType,
} from "../client/src/lib/bankDetection";

describe("Bank Detection", () => {
  it("should detect Bradesco bank", () => {
    const content = "BRADESCO PRINCIPAL\nBradesco.com.br";
    const bank = detectBank(content);
    expect(bank).toBe("bradesco");
  });

  it("should detect Itaú bank", () => {
    const content = "ITAU UNIBANCO\nItaú.com.br";
    const bank = detectBank(content);
    expect(bank).toBe("itau");
  });

  it("should detect Nubank", () => {
    const content = "NUBANK\nNubank.com.br";
    const bank = detectBank(content);
    expect(bank).toBe("nubank");
  });

  it("should return generic for unknown bank", () => {
    const content = "Some random bank content";
    const bank = detectBank(content);
    expect(bank).toBe("generic");
  });
});

describe("Bradesco Parser", () => {
  it("should parse Bradesco transactions", () => {
    const content = `
      Lançamentos
      Data Histórico de Lançamentos Cidade Valor
      10/12 PAGTO. POR DEB EM C/C RIO DE JANEIRO 441,59
      26/12 ENCARGOS DE ROTATIVO RIO DE JANEIRO 15,07
      04/11 DROGARIA VENANCIO RIO DE JANEIRO 250,00
      02/03 COMPRA SUPERMERCADO RIO DE JANEIRO 185,50
      Total para BIATRIZ X D M FARIA
    `;

    const transactions = parseBradesco(content);
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0].description).toBeDefined();
    expect(transactions[0].amount).toBeDefined();
    expect(transactions[0].date).toBeDefined();
  });

  it("should handle Bradesco date format", () => {
    const content = `
      Lançamentos
      Data Histórico de Lançamentos Valor
      15/04 COMPRA LOJA 150,50
    `;

    const transactions = parseBradesco(content);
    expect(transactions.length).toBeGreaterThan(0);
    // Date should be formatted as YYYY-MM-DD
    expect(transactions[0].date).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("should handle Bradesco amount with comma separator", () => {
    const content = `
      Lançamentos
      Data Histórico de Lançamentos Valor
      15/04 COMPRA 1.234,56
    `;

    const transactions = parseBradesco(content);
    expect(transactions.length).toBeGreaterThan(0);
    // Amount should be converted to dot separator
    expect(parseFloat(transactions[0].amount)).toBe(1234.56);
  });
});

describe("Generic Parser", () => {
  it("should parse generic transactions", () => {
    const content = `
      15/04 COMPRA SUPERMERCADO 150,50
      16/04 PAGAMENTO CONTA 250,00
      17/04 RESTAURANTE 85,75
    `;

    const transactions = parseGeneric(content);
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions[0].description).toBeDefined();
    expect(transactions[0].amount).toBeDefined();
  });

  it("should skip invalid lines", () => {
    const content = `
      15/04 COMPRA SUPERMERCADO 150,50
      INVALID LINE WITHOUT DATE
      16/04 PAGAMENTO 250,00
    `;

    const transactions = parseGeneric(content);
    expect(transactions.length).toBe(2);
  });
});

describe("Bank Info", () => {
  it("should return Bradesco info", () => {
    const info = getBankInfo("bradesco");
    expect(info.name).toBe("Bradesco");
    expect(info.type).toBe("bradesco");
    expect(info.patterns).toContain("BRADESCO");
  });

  it("should return Itaú info", () => {
    const info = getBankInfo("itau");
    expect(info.name).toBe("Itaú");
    expect(info.type).toBe("itau");
  });

  it("should return generic info for unknown bank", () => {
    const info = getBankInfo("generic");
    expect(info.name).toBe("Banco Genérico");
    expect(info.type).toBe("generic");
  });
});

describe("File Parsing with Bank Detection", () => {
  it("should detect bank and parse Bradesco file", async () => {
    const content = `
      BRADESCO PRINCIPAL
      Lançamentos
      Data Histórico de Lançamentos Valor
      15/04 COMPRA LOJA 150,50
    `;

    const result = await parseFileWithBankDetection(content, "pdf");
    expect(result.bank).toBe("bradesco");
    expect(result.transactions.length).toBeGreaterThan(0);
  });

  it("should detect bank and parse generic file", async () => {
    const content = `
      15/04 COMPRA SUPERMERCADO 150,50
      16/04 PAGAMENTO 250,00
    `;

    const result = await parseFileWithBankDetection(content, "pdf");
    expect(result.bank).toBe("generic");
    expect(result.transactions.length).toBeGreaterThan(0);
  });
});
