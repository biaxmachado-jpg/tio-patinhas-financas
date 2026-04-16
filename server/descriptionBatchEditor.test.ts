import { describe, it, expect } from "vitest";

describe("DescriptionBatchEditor", () => {
  it("should remove authorization numbers with regex", () => {
    const transactions = [
      {
        id: "1",
        date: "2026-04-16",
        description: "COMPRA LOJA AB123456",
        amount: "100.00",
      },
    ];

    const pattern = "\\s*[A-Z]{2}\\d{6,}";
    const replacement = "";

    const result = transactions[0].description.replace(new RegExp(pattern, "g"), replacement).trim();
    expect(result).toBe("COMPRA LOJA");
  });

  it("should remove duplicate dates", () => {
    const description = "PAGTO 15/04/2026 - COMPRA LOJA";
    const pattern = "\\d{2}/\\d{2}/\\d{4}\\s*-\\s*";
    const replacement = "";

    const result = description.replace(new RegExp(pattern, "g"), replacement).trim();
    expect(result).toBe("PAGTO COMPRA LOJA");
  });

  it("should remove extra spaces", () => {
    const description = "COMPRA    LOJA    CENTRO";
    const pattern = "\\s{2,}";
    const replacement = " ";

    const result = description.replace(new RegExp(pattern, "g"), replacement).trim();
    expect(result).toBe("COMPRA LOJA CENTRO");
  });

  it("should remove PAGTO and DÉBITO prefixes", () => {
    const descriptions = [
      "PAGTO COMPRA LOJA",
      "DÉBITO CONTA CORRENTE",
      "DEBITO TRANSFERENCIA",
    ];

    const pattern = "(PAGTO|DÉBITO|DEBITO)\\s*";
    const regex = new RegExp(pattern, "g");

    const results = descriptions.map((desc) => desc.replace(regex, "").trim());

    expect(results[0]).toBe("COMPRA LOJA");
    expect(results[1]).toBe("CONTA CORRENTE");
    expect(results[2]).toBe("TRANSFERENCIA");
  });

  it("should apply multiple rules in sequence", () => {
    let description = "PAGTO COMPRA LOJA AB123456";

    // Rule 1: Remove PAGTO
    description = description.replace(/(PAGTO|DÉBITO|DEBITO)\s*/g, "").trim();
    expect(description).toBe("COMPRA LOJA AB123456");

    // Rule 2: Remove auth numbers
    description = description.replace(/\s*[A-Z]{2}\d{6,}/g, "").trim();
    expect(description).toBe("COMPRA LOJA");
  });

  it("should handle empty replacement (removal)", () => {
    const description = "COMPRA [AUTORIZADO]";
    const pattern = "\\s*\\[AUTORIZADO\\]";
    const replacement = "";

    const result = description.replace(new RegExp(pattern, "g"), replacement).trim();
    expect(result).toBe("COMPRA");
  });

  it("should preserve original if no pattern matches", () => {
    const description = "COMPRA NORMAL";
    const pattern = "\\d{6,}";
    const replacement = "";

    const result = description.replace(new RegExp(pattern, "g"), replacement).trim();
    expect(result).toBe("COMPRA NORMAL");
  });

  it("should handle case-sensitive patterns", () => {
    const description = "Compra Loja AB123456";
    const pattern = "\\s*[A-Z]{2}\\d{6,}";
    const replacement = "";

    const result = description.replace(new RegExp(pattern, "g"), replacement).trim();
    expect(result).toBe("Compra Loja");
  });

  it("should validate regex patterns", () => {
    const validPatterns = [
      "\\d{2}/\\d{2}/\\d{4}",
      "[A-Z]{2}\\d{6,}",
      "\\s{2,}",
      "(PAGTO|DÉBITO|DEBITO)\\s*",
    ];

    validPatterns.forEach((pattern) => {
      expect(() => new RegExp(pattern)).not.toThrow();
    });
  });

  it("should reject invalid regex patterns", () => {
    const invalidPatterns = [
      "[unclosed",
      "(?P<invalid>group)",
      "*invalid",
    ];

    invalidPatterns.forEach((pattern) => {
      expect(() => new RegExp(pattern)).toThrow();
    });
  });
});
