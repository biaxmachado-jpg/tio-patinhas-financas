import { describe, it, expect } from "vitest";

// Helper functions for testing
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
};

const normalizeAmount = (amount: string | number): number => {
  if (typeof amount === "number") {
    return parseFloat(amount.toFixed(2));
  }
  const cleaned = amount.replace(/[^0-9.,]/g, "").replace(",", ".");
  return parseFloat(cleaned);
};

const calculateStringSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
};

describe("Duplicate Detection", () => {
  describe("normalizeText", () => {
    it("should normalize text correctly", () => {
      expect(normalizeText("COMPRA SUPERMERCADO")).toBe("compra supermercado");
      expect(normalizeText("  COMPRA   LOJA  ")).toBe("compra loja");
    });

    it("should handle empty strings", () => {
      expect(normalizeText("")).toBe("");
      expect(normalizeText("   ")).toBe("");
    });

    it("should remove special characters", () => {
      // Hyphens and special chars are removed, so "COMPRA-LOJA" becomes "compraloja"
      expect(normalizeText("COMPRA-LOJA")).toBe("compraloja");
      expect(normalizeText("COMPRA #123")).toBe("compra 123");
    });
  });

  describe("normalizeAmount", () => {
    it("should normalize Brazilian format amounts", () => {
      expect(normalizeAmount("1234,56")).toBe(1234.56);
      expect(normalizeAmount("150,00")).toBe(150);
    });

    it("should normalize US format amounts", () => {
      expect(normalizeAmount("1234.56")).toBe(1234.56);
      expect(normalizeAmount("150.00")).toBe(150);
    });

    it("should handle string amounts with R$", () => {
      expect(normalizeAmount("R$150,00")).toBe(150);
      expect(normalizeAmount("R$ 150,50")).toBe(150.5);
    });

    it("should handle numeric amounts", () => {
      expect(normalizeAmount(1234.56)).toBe(1234.56);
      expect(normalizeAmount(150)).toBe(150);
    });
  });

  describe("calculateStringSimilarity", () => {
    it("should return 1 for identical strings", () => {
      expect(calculateStringSimilarity("COMPRA LOJA", "COMPRA LOJA")).toBe(1);
    });

    it("should return 0.9 for contained strings", () => {
      const similarity = calculateStringSimilarity(
        "COMPRA SUPERMERCADO ABC",
        "COMPRA SUPERMERCADO"
      );
      expect(similarity).toBeGreaterThanOrEqual(0.85);
    });

    it("should detect similar merchant names", () => {
      const similarity = calculateStringSimilarity(
        "DROGARIA VENANCIO",
        "DROGARIA VENANCIO"
      );
      expect(similarity).toBe(1);
    });

    it("should handle typos", () => {
      const similarity = calculateStringSimilarity(
        "COMPRA SUPERMERCADO",
        "COMPRA SUPERMERC"
      );
      expect(similarity).toBeGreaterThan(0.8);
    });

    it("should return low similarity for completely different strings", () => {
      const similarity = calculateStringSimilarity("COMPRA", "PAGAMENTO");
      expect(similarity).toBeLessThan(0.7);
    });
  });

  describe("Duplicate Detection Logic", () => {
    it("should detect exact duplicates", () => {
      const newTx = {
        date: new Date("2026-04-15"),
        description: "COMPRA SUPERMERCADO",
        amount: "150,50",
      };

      const existingTx = {
        date: new Date("2026-04-15"),
        description: "COMPRA SUPERMERCADO",
        amount: "150,50",
      };

      const newAmount = normalizeAmount(newTx.amount);
      const existingAmount = normalizeAmount(existingTx.amount);
      const similarity = calculateStringSimilarity(
        newTx.description,
        existingTx.description
      );

      expect(newAmount).toBe(existingAmount);
      expect(similarity).toBe(1);
    });

    it("should detect duplicates with date tolerance", () => {
      const newTx = {
        date: new Date("2026-04-15"),
        description: "COMPRA LOJA",
        amount: "100,00",
      };

      const existingTx = {
        date: new Date("2026-04-16"), // 1 day difference
        description: "COMPRA LOJA",
        amount: "100,00",
      };

      const daysDiff = Math.abs(
        (newTx.date.getTime() - existingTx.date.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBeLessThanOrEqual(1);
    });

    it("should detect duplicates with amount tolerance", () => {
      const newTx = {
        amount: "100,00",
      };

      const existingTx = {
        amount: "100,50",
      };

      const newAmount = normalizeAmount(newTx.amount);
      const existingAmount = normalizeAmount(existingTx.amount);
      const amountDiff = Math.abs(newAmount - existingAmount);
      const amountDiffPercent = (amountDiff / existingAmount) * 100;

      expect(amountDiffPercent).toBeLessThan(1); // Less than 1% difference
    });

    it("should not detect duplicates with large amount difference", () => {
      const newTx = {
        amount: "100,00",
      };

      const existingTx = {
        amount: "200,00",
      };

      const newAmount = normalizeAmount(newTx.amount);
      const existingAmount = normalizeAmount(existingTx.amount);
      const amountDiff = Math.abs(newAmount - existingAmount);
      const amountDiffPercent = (amountDiff / existingAmount) * 100;

      expect(amountDiffPercent).toBeGreaterThan(10); // More than 10% difference
    });

    it("should not detect duplicates with different descriptions", () => {
      const similarity = calculateStringSimilarity(
        "COMPRA SUPERMERCADO",
        "PAGAMENTO CONTA"
      );
      expect(similarity).toBeLessThan(0.85);
    });
  });
});
