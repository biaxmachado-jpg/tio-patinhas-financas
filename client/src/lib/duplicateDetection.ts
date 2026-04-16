/**
 * Duplicate Detection Module
 * Detects duplicate transactions before importing
 */

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
}

export interface ExistingTransaction {
  id: number;
  date: Date;
  description: string;
  amount: string;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  matchedTransaction?: ExistingTransaction;
  similarity: number; // 0-1, where 1 is exact match
}

export interface TransactionWithDuplicateStatus extends Transaction {
  duplicateStatus?: DuplicateResult;
  isDuplicate?: boolean;
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, ""); // Remove special characters
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(date: string | Date): string {
  if (typeof date === "string") {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse other formats
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
    return date;
  }
  return date.toISOString().split("T")[0];
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
 * Calculate similarity between two strings (0-1)
 * Uses simple character-based comparison
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check if one contains the other (common for merchant names)
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
 * Check if a transaction is a duplicate of an existing one
 */
export function isDuplicateTransaction(
  newTx: Transaction,
  existingTx: ExistingTransaction,
  options?: {
    dateToleranceDays?: number; // Allow dates within N days
    descriptionSimilarityThreshold?: number; // 0-1
    amountTolerancePercent?: number; // Allow amount differences up to N%
  }
): DuplicateResult {
  const dateToleranceDays = options?.dateToleranceDays ?? 0;
  const descriptionThreshold = options?.descriptionSimilarityThreshold ?? 0.85;
  const amountTolerancePercent = options?.amountTolerancePercent ?? 0;

  // Normalize values
  const newDate = normalizeDate(newTx.date);
  const existingDate = normalizeDate(existingTx.date);
  const newAmount = normalizeAmount(newTx.amount);
  const existingAmount = normalizeAmount(existingTx.amount);

  // Check date match (with tolerance)
  const newDateObj = new Date(newDate);
  const existingDateObj = new Date(existingDate);
  const daysDiff = Math.abs(
    (newDateObj.getTime() - existingDateObj.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff > dateToleranceDays) {
    return { isDuplicate: false, similarity: 0 };
  }

  // Check amount match (with tolerance)
  const amountDiff = Math.abs(newAmount - existingAmount);
  const amountDiffPercent = (amountDiff / existingAmount) * 100;

  if (amountDiffPercent > amountTolerancePercent) {
    return { isDuplicate: false, similarity: 0 };
  }

  // Check description similarity
  const descriptionSimilarity = calculateStringSimilarity(
    newTx.description,
    existingTx.description
  );

  if (descriptionSimilarity < descriptionThreshold) {
    return { isDuplicate: false, similarity: descriptionSimilarity };
  }

  // All checks passed - it's a duplicate
  return {
    isDuplicate: true,
    matchedTransaction: existingTx,
    similarity: descriptionSimilarity,
  };
}

/**
 * Find duplicates in a batch of new transactions
 */
export function findDuplicates(
  newTransactions: Transaction[],
  existingTransactions: ExistingTransaction[],
  options?: {
    dateToleranceDays?: number;
    descriptionSimilarityThreshold?: number;
    amountTolerancePercent?: number;
  }
): TransactionWithDuplicateStatus[] {
  return newTransactions.map((newTx) => {
    let isDuplicate = false;
    let duplicateStatus: DuplicateResult | undefined;

    for (const existingTx of existingTransactions) {
      const result = isDuplicateTransaction(newTx, existingTx, options);
      if (result.isDuplicate) {
        isDuplicate = true;
        duplicateStatus = result;
        break;
      }
    }

    return {
      ...newTx,
      isDuplicate,
      duplicateStatus,
    };
  });
}

/**
 * Separate transactions into duplicates and new ones
 */
export function separateDuplicates(
  transactions: TransactionWithDuplicateStatus[]
): {
  duplicates: TransactionWithDuplicateStatus[];
  new: TransactionWithDuplicateStatus[];
} {
  return {
    duplicates: transactions.filter((tx) => tx.isDuplicate),
    new: transactions.filter((tx) => !tx.isDuplicate),
  };
}

/**
 * Filter out duplicates
 */
export function filterOutDuplicates(
  transactions: TransactionWithDuplicateStatus[]
): Transaction[] {
  return transactions
    .filter((tx) => !tx.isDuplicate)
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
    }));
}
