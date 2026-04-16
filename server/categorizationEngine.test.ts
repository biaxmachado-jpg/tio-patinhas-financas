import { describe, it, expect } from "vitest";
import { matchesRule, applyCategorizationRules, getMatchingRules } from "./categorizationEngine";
import { CategorizationRule } from "../drizzle/schema";

describe("Categorization Engine", () => {
  const mockRule = (overrides?: Partial<CategorizationRule>): CategorizationRule => ({
    id: 1,
    userId: 1,
    categoryId: 10,
    keywords: JSON.stringify(["padaria", "pão"]),
    matchType: "contains",
    caseSensitive: false,
    priority: 0,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe("matchesRule", () => {
    it("should match description with 'contains' type (case-insensitive)", () => {
      const rule = mockRule({ matchType: "contains" });
      expect(matchesRule("PADARIA CENTRAL", rule)).toBe(true);
      expect(matchesRule("Padaria do João", rule)).toBe(true);
      expect(matchesRule("pão francês", rule)).toBe(true);
    });

    it("should not match if keywords not found", () => {
      const rule = mockRule({ matchType: "contains" });
      expect(matchesRule("Supermercado XYZ", rule)).toBe(false);
    });

    it("should match with 'exact' type", () => {
      const rule = mockRule({ matchType: "exact" });
      expect(matchesRule("padaria", rule)).toBe(true);
      expect(matchesRule("PADARIA", rule)).toBe(true);
      expect(matchesRule("padaria central", rule)).toBe(false);
    });

    it("should match with 'startsWith' type", () => {
      const rule = mockRule({ matchType: "startsWith" });
      expect(matchesRule("padaria central", rule)).toBe(true);
      expect(matchesRule("PADARIA", rule)).toBe(true);
      expect(matchesRule("central padaria", rule)).toBe(false);
    });

    it("should match with 'endsWith' type", () => {
      const rule = mockRule({ matchType: "endsWith" });
      expect(matchesRule("central padaria", rule)).toBe(true);
      expect(matchesRule("PADARIA", rule)).toBe(true);
      expect(matchesRule("padaria central", rule)).toBe(false);
    });

    it("should respect case sensitivity", () => {
      const rule = mockRule({ 
        matchType: "contains",
        caseSensitive: true,
        keywords: JSON.stringify(["Padaria"]),
      });
      expect(matchesRule("Padaria Central", rule)).toBe(true);
      expect(matchesRule("PADARIA CENTRAL", rule)).toBe(false);
      expect(matchesRule("padaria central", rule)).toBe(false);
    });

    it("should not match disabled rules", () => {
      const rule = mockRule({ enabled: false });
      expect(matchesRule("padaria", rule)).toBe(false);
    });

    it("should match any keyword in the list", () => {
      const rule = mockRule({ keywords: JSON.stringify(["padaria", "pão", "bolo"]) });
      expect(matchesRule("BOLO DE CHOCOLATE", rule)).toBe(true);
      expect(matchesRule("PÃO FRANCÊS", rule)).toBe(true);
      expect(matchesRule("PADARIA", rule)).toBe(true);
      expect(matchesRule("PIZZA", rule)).toBe(false);
    });
  });

  describe("applyCategorizationRules", () => {
    it("should return first matching rule by priority", () => {
      const rules: CategorizationRule[] = [
        mockRule({ id: 1, categoryId: 10, priority: 0, keywords: JSON.stringify(["padaria"]) }),
        mockRule({ id: 2, categoryId: 20, priority: 5, keywords: JSON.stringify(["pão"]) }),
      ];
      
      // Both match, but priority 5 should win
      const result = applyCategorizationRules("padaria pão", rules);
      expect(result).toBe(20);
    });

    it("should return null if no rules match", () => {
      const rules: CategorizationRule[] = [
        mockRule({ keywords: JSON.stringify(["padaria"]) }),
      ];
      
      const result = applyCategorizationRules("supermercado", rules);
      expect(result).toBeNull();
    });

    it("should handle empty rules array", () => {
      const result = applyCategorizationRules("any text", []);
      expect(result).toBeNull();
    });

    it("should sort by priority descending", () => {
      const rules: CategorizationRule[] = [
        mockRule({ id: 1, categoryId: 10, priority: 1, keywords: JSON.stringify(["a"]) }),
        mockRule({ id: 2, categoryId: 20, priority: 10, keywords: JSON.stringify(["a"]) }),
        mockRule({ id: 3, categoryId: 30, priority: 5, keywords: JSON.stringify(["a"]) }),
      ];
      
      const result = applyCategorizationRules("a", rules);
      expect(result).toBe(20); // Highest priority
    });

    it("should use creation date as tiebreaker", () => {
      const now = new Date();
      const rules: CategorizationRule[] = [
        mockRule({ 
          id: 1, 
          categoryId: 10, 
          priority: 5, 
          keywords: JSON.stringify(["test"]),
          createdAt: new Date(now.getTime() - 1000),
        }),
        mockRule({ 
          id: 2, 
          categoryId: 20, 
          priority: 5, 
          keywords: JSON.stringify(["test"]),
          createdAt: new Date(now.getTime()),
        }),
      ];
      
      const result = applyCategorizationRules("test", rules);
      expect(result).toBe(20); // Newer rule wins
    });
  });

  describe("getMatchingRules", () => {
    it("should return all matching rules sorted by priority", () => {
      const rules: CategorizationRule[] = [
        mockRule({ id: 1, categoryId: 10, priority: 1, keywords: JSON.stringify(["food"]) }),
        mockRule({ id: 2, categoryId: 20, priority: 10, keywords: JSON.stringify(["food"]) }),
        mockRule({ id: 3, categoryId: 30, priority: 5, keywords: JSON.stringify(["food"]) }),
      ];
      
      const results = getMatchingRules("food", rules);
      expect(results).toHaveLength(3);
      expect(results[0].categoryId).toBe(20); // Priority 10
      expect(results[1].categoryId).toBe(30); // Priority 5
      expect(results[2].categoryId).toBe(10); // Priority 1
    });

    it("should return empty array if no matches", () => {
      const rules: CategorizationRule[] = [
        mockRule({ keywords: JSON.stringify(["food"]) }),
      ];
      
      const results = getMatchingRules("transport", rules);
      expect(results).toHaveLength(0);
    });
  });

  describe("Real-world scenarios", () => {
    it("should categorize grocery store transactions", () => {
      const rules: CategorizationRule[] = [
        mockRule({ 
          id: 1, 
          categoryId: 100, 
          priority: 10,
          keywords: JSON.stringify(["carrefour", "pao de acucar", "extra", "supermarket"]),
          matchType: "contains",
        }),
      ];
      
      expect(applyCategorizationRules("CARREFOUR CENTRO", rules)).toBe(100);
      expect(applyCategorizationRules("PAO DE ACUCAR LOJA 5", rules)).toBe(100);
      expect(applyCategorizationRules("EXTRA HIPERMERCADO", rules)).toBe(100);
    });

    it("should categorize pharmacy transactions", () => {
      const rules: CategorizationRule[] = [
        mockRule({ 
          id: 1, 
          categoryId: 200, 
          priority: 10,
          keywords: JSON.stringify(["farmacia", "pharmacy", "drogaria"]),
          matchType: "contains",
        }),
      ];
      
      expect(applyCategorizationRules("FARMACIA CRUZ AZUL", rules)).toBe(200);
      expect(applyCategorizationRules("DROGARIA ARAUJO", rules)).toBe(200);
    });

    it("should handle multiple rules with different priorities", () => {
      const rules: CategorizationRule[] = [
        mockRule({ 
          id: 1, 
          categoryId: 100, 
          priority: 5,
          keywords: JSON.stringify(["mercado"]),
        }),
        mockRule({ 
          id: 2, 
          categoryId: 200, 
          priority: 10,
          keywords: JSON.stringify(["mercado central"]),
        }),
      ];
      
      // "mercado central" matches both, but priority 10 wins
      expect(applyCategorizationRules("MERCADO CENTRAL", rules)).toBe(200);
      // "mercado" matches only first rule
      expect(applyCategorizationRules("MERCADO XYZ", rules)).toBe(100);
    });
  });
});
