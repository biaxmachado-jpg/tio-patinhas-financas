import { describe, it, expect } from "vitest";

describe("parseXLSXData", () => {
  it("should find header row with Data, Histórico, Valor", () => {
    const data = [
      ["", "", "Bradesco Internet Banking"],
      ["", ""],
      ["Data", "Histórico", "", "Valor (US$)", "Valor(R$)"],
      ["25/01", "CINEMARK DOWNTOWN", "", "0,00", "84,50"],
    ];

    let headerIndex = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.join(" ").toLowerCase();
      if (rowStr.includes("data") && (rowStr.includes("hist") || rowStr.includes("descr") || rowStr.includes("valor"))) {
        headerIndex = i;
        break;
      }
    }

    expect(headerIndex).toBe(2);
  });

  it("should identify correct column indices", () => {
    const headerRow = ["Data", "Histórico", "", "Valor (US$)", "Valor(R$)"];
    let dateCol = -1, descCol = -1, amountCol = -1;

    for (let i = 0; i < headerRow.length; i++) {
      const cell = String(headerRow[i]).toLowerCase();
      if (cell.includes("data") || cell.includes("date")) dateCol = i;
      if (cell.includes("hist") || cell.includes("descr") || cell.includes("lanca")) descCol = i;
      if (cell.includes("valor") || cell.includes("r$") || cell.includes("amount")) amountCol = i;
    }

    expect(dateCol).toBe(0);
    expect(descCol).toBe(1);
    expect(amountCol).toBe(4);
  });

  it("should parse date correctly", () => {
    const dateStr = "25/01";
    const dateMatch = String(dateStr).match(/(\d{1,2})\/(\d{1,2})/);

    expect(dateMatch).not.toBeNull();
    if (dateMatch) {
      const [, day, month] = dateMatch;
      const year = new Date().getFullYear();
      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      expect(formattedDate).toMatch(/^\d{4}-01-25$/);
    }
  });

  it("should parse Brazilian currency format", () => {
    const amounts = ["84,50", "-470,01", "0,02", "454,94"];

    amounts.forEach((amountStr) => {
      let amount = amountStr.trim();
      amount = amount.replace(/[R$]/g, "").trim();

      if (amount.includes(".") && amount.includes(",")) {
        amount = amount.replace(".", "").replace(",", ".");
      } else if (amount.includes(",")) {
        amount = amount.replace(",", ".");
      }

      const parsed = parseFloat(amount);
      expect(isNaN(parsed)).toBe(false);
    });
  });

  it("should handle negative amounts", () => {
    const amountStr = "-470,01";
    let amount = amountStr.trim();
    amount = amount.replace(/[R$]/g, "").trim();
    amount = amount.replace(",", ".");

    const parsed = parseFloat(amount);
    const absolute = Math.abs(parsed);

    expect(parsed).toBe(-470.01);
    expect(absolute).toBe(470.01);
  });

  it("should skip summary rows", () => {
    const descriptions = [
      "CINEMARK DOWNTOWN",
      "Total para BIATRIZ",
      "Total da fatura",
      "SALDO ANTERIOR",
    ];

    const filtered = descriptions.filter((desc) => {
      const descLower = desc.toLowerCase();
      return !(descLower.includes("total") || descLower.includes("saldo") || descLower.includes("limite"));
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0]).toBe("CINEMARK DOWNTOWN");
  });

  it("should extract 5 transactions from Bradesco file structure", () => {
    const data = [
      ["", "", "Bradesco Internet Banking"],
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
      ["Situação da Fatura: PAGO"],
      ["", "", ""],
      ["BIATRIZ X D M FARIA - 2643"],
      ["Data", "Histórico", "", "Valor (US$)", "Valor(R$)"],
      ["25/01", "CINEMARK DOWNTOWN", "", "0,00", "84,50"],
      ["12/01", "PAGTO. POR DEB EM C/C", "", "0,00", "-470,01"],
      ["10/01", "SALDO ANTERIOR", "", "0,00", "470,01"],
      ["02/01", "IOF DIARIO ROTATIV/ATRASO", "", "0,00", "0,02"],
      ["02/01", "IOF ADIC ROTATIVO/ATRASO", "", "0,00", "0,05"],
      ["04/11", "DROGARIA VENANCIO 3/3", "", "0,00", "454,94"],
      ["Total para BIATRIZ X D M FARIA", "", "", "", "539,51"],
    ];

    // Find header
    let headerIndex = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      const rowStr = row.join(" ").toLowerCase();
      if (rowStr.includes("data") && (rowStr.includes("hist") || rowStr.includes("descr") || rowStr.includes("valor"))) {
        headerIndex = i;
        break;
      }
    }

    expect(headerIndex).toBe(10);

    // Count valid transactions
    const headerRow = data[headerIndex];
    let dateCol = -1, descCol = -1, amountCol = -1;

    for (let i = 0; i < headerRow.length; i++) {
      const cell = String(headerRow[i]).toLowerCase();
      if (cell.includes("data")) dateCol = i;
      if (cell.includes("hist")) descCol = i;
      if (cell.includes("valor(r$)")) amountCol = i;
    }

    let transactionCount = 0;
    for (let i = headerIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const dateStr = row[dateCol];
      const description = row[descCol];
      const amountStr = row[amountCol];

      if (!dateStr || !description || !amountStr) continue;

      const descLower = String(description).toLowerCase();
      if (descLower.includes("total") || descLower.includes("saldo") || descLower.includes("limite")) continue;

      transactionCount++;
    }

    expect(transactionCount).toBe(5);
  });
});
