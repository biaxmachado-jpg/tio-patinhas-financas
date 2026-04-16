import { CategorizationRule } from "../drizzle/schema";

/**
 * Engine for applying categorization rules to transactions
 */

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

  const keywords = JSON.parse(rule.keywords) as string[];
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
