import { CategorizationRule } from "../drizzle/schema";

/**
 * Engine for applying categorization rules to transactions
 */

/**
 * A causa raiz do "Unexpected non-whitespace character after JSON..." era
 * AQUI, não na importação de fatura em si: regras de categorização mais
 * antigas podem ter "keywords" salvo como string simples (não como array
 * JSON), e um JSON.parse direto nisso quebra pra QUALQUER transação de
 * QUALQUER arquivo, sempre com o mesmo erro — batendo exatamente com o
 * sintoma (mesmo erro, arquivos diferentes, 100% reproduzível). server/db.ts
 * já tinha essa mesma proteção numa função equivalente; replicada aqui.
 */
function parseKeywords(keywordsData: string | string[]): string[] {
  if (Array.isArray(keywordsData)) {
    return keywordsData;
  }

  try {
    const parsed = JSON.parse(keywordsData);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Não é JSON válido — trata a string toda como uma única palavra-chave
    // em vez de derrubar a importação inteira.
  }

  return [keywordsData];
}

export interface MatchResult {
  matched: boolean;
  ruleId: number;
  categoryId: number;
  priority: number;
}

/**
 * Check if a transaction description matches a rule
 */
export function matchesRule(description: string, rule: CategorizationRule): boolean {
  if (!rule.enabled) return false;

  const keywords = parseKeywords(rule.keywords);
  const testString = rule.caseSensitive ? description : description.toLowerCase();

  for (const keyword of keywords) {
    const testKeyword = rule.caseSensitive ? keyword : keyword.toLowerCase();

    switch (rule.matchType) {
      case "contains":
        if (testString.includes(testKeyword)) return true;
        break;
      case "exact":
        if (testString === testKeyword) return true;
        break;
      case "startsWith":
        if (testString.startsWith(testKeyword)) return true;
        break;
      case "endsWith":
        if (testString.endsWith(testKeyword)) return true;
        break;
    }
  }

  return false;
}

/**
 * Apply categorization rules to a transaction description
 * Returns the categoryId of the first matching rule (sorted by priority)
 */
export function applyCategorizationRules(
  description: string,
  rules: CategorizationRule[]
): number | null {
  // Sort rules by priority (descending) and then by creation date (newer first)
  const sortedRules = [...rules].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  for (const rule of sortedRules) {
    if (matchesRule(description, rule)) {
      return rule.categoryId;
    }
  }

  return null;
}

/**
 * Get all matching rules for a transaction (for debugging/logging)
 */
export function getMatchingRules(
  description: string,
  rules: CategorizationRule[]
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const rule of rules) {
    if (matchesRule(description, rule)) {
      matches.push({
        matched: true,
        ruleId: rule.id,
        categoryId: rule.categoryId,
        priority: rule.priority,
      });
    }
  }

  // Sort by priority descending
  return matches.sort((a, b) => b.priority - a.priority);
}
