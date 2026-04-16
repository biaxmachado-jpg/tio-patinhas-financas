/**
 * Server-side Duplicate Detection
 * Detects duplicate transactions in the database
 */

import { getDb } from "./db";
import { creditCardTransactions, transactions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface TransactionToCheck {
  date: Date;
  description: string;
  amount: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingTransactionId?: number;
  similarity: number;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Normalize amount to number
 */
function normalizeAmount(amount: string | number): number {
  if (typeof amount === "number") {
    return parseFloat(amount.toFixed(2));
  }
  const cleaned = amount.replace(/[^0-9.,]/g, "").replace(",", ".");
  return parseFloat(cleaned);
}

/**
 * Calculate string similarity (0-1)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
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
}

/**
 * Check for duplicate credit card transactions
 */
export async function checkDuplicateCreditCardTransaction(
  userId: number,
  cardId: number,
  newTx: TransactionToCheck,
  options?: {
    dateToleranceDays?: number;
    descriptionSimilarityThreshold?: number;
    amountTolerancePercent?: number;
  }
): Promise<DuplicateCheckResult> {
  const db = await getDb();
  if (!db) {
    return { isDuplicate: false, similarity: 0 };
  }

  const dateToleranceDays = options?.dateToleranceDays ?? 0;
  const descriptionThreshold = options?.descriptionSimilarityThreshold ?? 0.85;
  const amountTolerancePercent = options?.amountTolerancePercent ?? 0;

  try {
    // Get all transactions for this card
    const existingTransactions = await db
      .select()
      .from(creditCardTransactions)
      .where(
        and(
          eq(creditCardTransactions.userId, userId),
          eq(creditCardTransactions.cardId, cardId)
        )
      );

    const newAmount = normalizeAmount(newTx.amount);
    const newDate = new Date(newTx.date);

    for (const existingTx of existingTransactions) {
      const existingAmount = normalizeAmount(existingTx.amount);
      const existingDate = new Date(existingTx.date);

      // Check date match (with tolerance)
      const daysDiff = Math.abs(
        (newDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > dateToleranceDays) {
        continue;
      }

      // Check amount match (with tolerance)
      const amountDiff = Math.abs(newAmount - existingAmount);
      const amountDiffPercent = (amountDiff / existingAmount) * 100;

      if (amountDiffPercent > amountTolerancePercent) {
        continue;
      }

      // Check description similarity
      const descriptionSimilarity = calculateStringSimilarity(
        newTx.description,
        existingTx.description
      );

      if (descriptionSimilarity >= descriptionThreshold) {
        return {
          isDuplicate: true,
          existingTransactionId: existingTx.id,
          similarity: descriptionSimilarity,
        };
      }
    }

    return { isDuplicate: false, similarity: 0 };
  } catch (error) {
    console.error("[duplicateDetection] Error checking duplicates:", error);
    return { isDuplicate: false, similarity: 0 };
  }
}

/**
 * Check for duplicate bank account transactions
 */
export async function checkDuplicateBankTransaction(
  userId: number,
  accountId: number,
  newTx: TransactionToCheck,
  options?: {
    dateToleranceDays?: number;
    descriptionSimilarityThreshold?: number;
    amountTolerancePercent?: number;
  }
): Promise<DuplicateCheckResult> {
  const db = await getDb();
  if (!db) {
    return { isDuplicate: false, similarity: 0 };
  }

  const dateToleranceDays = options?.dateToleranceDays ?? 0;
  const descriptionThreshold = options?.descriptionSimilarityThreshold ?? 0.85;
  const amountTolerancePercent = options?.amountTolerancePercent ?? 0;

  try {
    // Get all transactions for this account
    const existingTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, accountId)
        )
      );

    const newAmount = normalizeAmount(newTx.amount);
    const newDate = new Date(newTx.date);

    for (const existingTx of existingTransactions) {
      const existingAmount = normalizeAmount(existingTx.amount);
      const existingDate = new Date(existingTx.date);

      // Check date match (with tolerance)
      const daysDiff = Math.abs(
        (newDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > dateToleranceDays) {
        continue;
      }

      // Check amount match (with tolerance)
      const amountDiff = Math.abs(newAmount - existingAmount);
      const amountDiffPercent = (amountDiff / existingAmount) * 100;

      if (amountDiffPercent > amountTolerancePercent) {
        continue;
      }

      // Check description similarity
      const descriptionSimilarity = calculateStringSimilarity(
        newTx.description,
        existingTx.description
      );

      if (descriptionSimilarity >= descriptionThreshold) {
        return {
          isDuplicate: true,
          existingTransactionId: existingTx.id,
          similarity: descriptionSimilarity,
        };
      }
    }

    return { isDuplicate: false, similarity: 0 };
  } catch (error) {
    console.error("[duplicateDetection] Error checking duplicates:", error);
    return { isDuplicate: false, similarity: 0 };
  }
}

/**
 * Check multiple transactions for duplicates
 */
export async function checkMultipleDuplicates(
  userId: number,
  entityType: "creditCard" | "bankAccount",
  entityId: number,
  newTransactions: TransactionToCheck[],
  options?: {
    dateToleranceDays?: number;
    descriptionSimilarityThreshold?: number;
    amountTolerancePercent?: number;
  }
): Promise<
  Array<{
    transaction: TransactionToCheck;
    isDuplicate: boolean;
    existingTransactionId?: number;
    similarity: number;
  }>
> {
  const results = [];

  for (const tx of newTransactions) {
    const result =
      entityType === "creditCard"
        ? await checkDuplicateCreditCardTransaction(userId, entityId, tx, options)
        : await checkDuplicateBankTransaction(userId, entityId, tx, options);

    results.push({
      transaction: tx,
      ...result,
    });
  }

  return results;
}
