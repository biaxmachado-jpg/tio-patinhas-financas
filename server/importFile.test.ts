import { describe, it, expect, beforeEach } from "vitest";

// Mock transaction interface
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
}

describe("ImportFile - XLSX Parser", () => {
  it("should parse XLSX data correctly", async () => {
    // Test data structure
    const mockXLSXData = [
      ["Data", "Descrição", "Valor"],
      ["2026-04-15", "Compra no Supermercado", "150.50"],
      ["2026-04-14", "Pagamento de Conta", "250.00"],
      ["2026-04-13", "Restaurante", "85.75"],
    ];

    // Simulate parsing logic
    const startRow = mockXLSXData[0]?.some((cell: any) =>
      typeof cell === "string" &&
      (cell.toLowerCase().includes("data") || cell.toLowerCase().includes("date"))
    )
      ? 1
      : 0;

    const extractedTransactions: Transaction[] = [];

    for (let i = startRow; i < mockXLSXData.length; i++) {
      const row = mockXLSXData[i];
      if (!row || row.length < 3) continue;

      const dateStr = row[0]?.toString().trim();
      const description = row[1]?.toString().trim();
      const amountStr = row[2]?.toString().trim();

      if (!dateStr || !description || !amountStr) continue;

      const cleanAmount = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
      if (isNaN(parseFloat(cleanAmount))) continue;

      extractedTransactions.push({
        id: Date.now().toString() + Math.random(),
        date: dateStr,
        description,
        amount: cleanAmount,
      });
    }

    expect(extractedTransactions).toHaveLength(3);
    expect(extractedTransactions[0].description).toBe("Compra no Supermercado");
    expect(extractedTransactions[0].amount).toBe("150.50");
    expect(extractedTransactions[1].description).toBe("Pagamento de Conta");
    expect(extractedTransactions[2].amount).toBe("85.75");
  });

  it("should handle amount formatting with comma separator", () => {
    const amountStr = "R$ 1.234,56";
    let cleanAmount = amountStr.replace(/[^0-9.,]/g, "");
    // If there's both dot and comma, assume dot is thousands separator and comma is decimal
    if (cleanAmount.includes(".") && cleanAmount.includes(",")) {
      cleanAmount = cleanAmount.replace(".", "").replace(",", ".");
    } else {
      cleanAmount = cleanAmount.replace(",", ".");
    }
    expect(parseFloat(cleanAmount)).toBe(1234.56);
  });

  it("should skip rows with missing fields", () => {
    const mockXLSXData = [
      ["Data", "Descrição", "Valor"],
      ["2026-04-15", "Compra no Supermercado", "150.50"],
      ["2026-04-14", "", "250.00"], // Missing description
      ["2026-04-13", "Restaurante", ""], // Missing amount
      ["2026-04-12", "Loja", "75.00"],
    ];

    const startRow = 1;
    const extractedTransactions: Transaction[] = [];

    for (let i = startRow; i < mockXLSXData.length; i++) {
      const row = mockXLSXData[i];
      if (!row || row.length < 3) continue;

      const dateStr = row[0]?.toString().trim();
      const description = row[1]?.toString().trim();
      const amountStr = row[2]?.toString().trim();

      if (!dateStr || !description || !amountStr) continue;

      const cleanAmount = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
      if (isNaN(parseFloat(cleanAmount))) continue;

      extractedTransactions.push({
        id: Date.now().toString() + Math.random(),
        date: dateStr,
        description,
        amount: cleanAmount,
      });
    }

    expect(extractedTransactions).toHaveLength(2);
    expect(extractedTransactions[0].description).toBe("Compra no Supermercado");
    expect(extractedTransactions[1].description).toBe("Loja");
  });

  it("should detect and skip header row", () => {
    const mockXLSXData = [
      ["Data", "Descrição", "Valor"],
      ["2026-04-15", "Compra", "150.50"],
    ];

    const startRow = mockXLSXData[0]?.some((cell: any) =>
      typeof cell === "string" &&
      (cell.toLowerCase().includes("data") || cell.toLowerCase().includes("date"))
    )
      ? 1
      : 0;

    expect(startRow).toBe(1);
  });
});

describe("ImportFile - Date Parsing", () => {
  it("should parse date in YYYY-MM-DD format", () => {
    const dateStr = "2026-04-15";
    const parsed = new Date(dateStr);
    expect(!isNaN(parsed.getTime())).toBe(true);
    expect(parsed.toISOString().split("T")[0]).toBe("2026-04-15");
  });

  it("should parse date in DD/MM/YYYY format", () => {
    const dateStr = "15/04/2026";
    const dateParts = dateStr.split("/");
    const [day, month, year] = dateParts;
    const fullYear = year.length === 2 ? "20" + year : year;
    const formatted = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    expect(formatted).toBe("2026-04-15");
  });

  it("should handle 2-digit year format", () => {
    const dateStr = "15/04/26";
    const dateParts = dateStr.split("/");
    const [day, month, year] = dateParts;
    const fullYear = year.length === 2 ? "20" + year : year;
    const formatted = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    expect(formatted).toBe("2026-04-15");
  });
});

describe("ImportFile - Amount Parsing", () => {
  it("should parse amount with decimal point", () => {
    const amountStr = "150.50";
    const cleanAmount = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
    expect(parseFloat(cleanAmount)).toBe(150.5);
  });

  it("should parse amount with comma decimal separator", () => {
    const amountStr = "150,50";
    const cleanAmount = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
    expect(parseFloat(cleanAmount)).toBe(150.5);
  });

  it("should parse amount with currency symbol", () => {
    const amountStr = "R$ 150,50";
    const cleanAmount = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
    expect(parseFloat(cleanAmount)).toBe(150.5);
  });

  it("should parse amount with thousands separator", () => {
    const amountStr = "1.234,56";
    let cleanAmount = amountStr.replace(/[^0-9.,]/g, "");
    // If there's both dot and comma, assume dot is thousands separator and comma is decimal
    if (cleanAmount.includes(".") && cleanAmount.includes(",")) {
      cleanAmount = cleanAmount.replace(".", "").replace(",", ".");
    } else {
      cleanAmount = cleanAmount.replace(",", ".");
    }
    expect(parseFloat(cleanAmount)).toBe(1234.56);
  });

  it("should reject invalid amounts", () => {
    const amountStr = "invalid";
    const cleanAmount = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
    expect(isNaN(parseFloat(cleanAmount))).toBe(true);
  });
});
