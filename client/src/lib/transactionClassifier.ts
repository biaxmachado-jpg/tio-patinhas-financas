/**
 * Transaction classification utility for credit card statements
 * Classifies transactions into: À Vista, Parceladas, and Créditos
 */

export type TransactionType = 'vista' | 'parcelada' | 'credito';

export interface ClassifiedTransaction {
  id: number;
  type: TransactionType;
  description: string;
  amount: number;
  date: Date;
  dueDate: Date | null;
  installments: number;
  currentInstallment: number;
  categoryId: number;
  paid: boolean;
  paidAt: Date | null;
  notes: string | null;
  [key: string]: any; // Allow other fields from the original transaction
}

/**
 * Detects if a description contains an installment pattern (e.g., "1/12", "2/10")
 * @param description - Transaction description
 * @returns true if installment pattern is found
 */
export function hasInstallmentPattern(description: string): boolean {
  // Match patterns like "1/12", "2/10", etc.
  const installmentRegex = /\b\d{1,2}\/\d{1,2}\b/;
  return installmentRegex.test(description);
}

/**
 * Classifies a single transaction into one of three types
 * @param transaction - The transaction to classify
 * @param dueDate - The due date of the billing cycle (for À Vista calculation)
 * @returns The transaction type
 */
export function classifyTransaction(
  transaction: any,
  billingDueDate?: Date
): TransactionType {
  const amount = parseFloat(transaction.amount.toString());
  
  // Rule 1: Créditos (Credits) - negative values
  if (amount < 0) {
    return 'credito';
  }

  // Rule 2: Parceladas (Installments) - multiple installments or installment pattern in description
  if (transaction.installments > 1 || hasInstallmentPattern(transaction.description)) {
    return 'parcelada';
  }

  // Rule 3: À Vista (Upfront) - single installment and within 5 days before due date
  if (transaction.installments === 1) {
    // If no billing due date provided, classify as vista by default
    if (!billingDueDate) {
      return 'vista';
    }

    // Check if transaction is within 5 days before the due date
    const transactionDate = new Date(transaction.date);
    const daysBeforeDue = Math.floor(
      (billingDueDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // À Vista: up to 5 days before due date
    if (daysBeforeDue >= 0 && daysBeforeDue <= 5) {
      return 'vista';
    }

    // Older purchases are considered parceladas
    return 'parcelada';
  }

  return 'vista';
}

/**
 * Groups transactions by type
 * @param transactions - Array of transactions to classify
 * @param billingDueDate - The due date of the billing cycle
 * @returns Object with transactions grouped by type
 */
export function groupTransactionsByType(
  transactions: any[],
  billingDueDate?: Date
): {
  vista: ClassifiedTransaction[];
  parcelada: ClassifiedTransaction[];
  credito: ClassifiedTransaction[];
} {
  const grouped = {
    vista: [] as ClassifiedTransaction[],
    parcelada: [] as ClassifiedTransaction[],
    credito: [] as ClassifiedTransaction[],
  };

  for (const transaction of transactions) {
    const type = classifyTransaction(transaction, billingDueDate);
    grouped[type].push({
      ...transaction,
      type,
      date: new Date(transaction.date),
      dueDate: transaction.dueDate ? new Date(transaction.dueDate) : null,
      paidAt: transaction.paidAt ? new Date(transaction.paidAt) : null,
    });
  }

  return grouped;
}

/**
 * Calculates totals for each transaction type
 * @param grouped - Grouped transactions from groupTransactionsByType
 * @returns Object with totals for each type
 */
export function calculateGroupTotals(grouped: {
  vista: ClassifiedTransaction[];
  parcelada: ClassifiedTransaction[];
  credito: ClassifiedTransaction[];
}): {
  vista: number;
  parcelada: number;
  credito: number;
  total: number;
} {
  const vista = grouped.vista.reduce((sum, t) => {
    const amount = parseFloat(t.amount.toString());
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const parcelada = grouped.parcelada.reduce((sum, t) => {
    const amount = parseFloat(t.amount.toString());
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const credito = grouped.credito.reduce((sum, t) => {
    const amount = parseFloat(t.amount.toString());
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  return {
    vista,
    parcelada,
    credito,
    total: vista + parcelada + credito,
  };
}

/**
 * Gets display name for transaction type in Portuguese
 * @param type - Transaction type
 * @returns Display name
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    vista: 'À Vista',
    parcelada: 'Parceladas',
    credito: 'Créditos',
  };
  return labels[type];
}

/**
 * Gets color for transaction type
 * @param type - Transaction type
 * @returns Hex color code
 */
export function getTransactionTypeColor(type: TransactionType): string {
  const colors: Record<TransactionType, string> = {
    vista: '#ef4444', // Red
    parcelada: '#f59e0b', // Amber
    credito: '#10b981', // Green
  };
  return colors[type];
}
