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
 * Converte o valor de uma transação em número com segurança. Dados antigos
 * ou corrompidos no banco podem trazer amount null/undefined/inválido —
 * sem essa proteção, uma única transação assim derruba a página inteira
 * (TypeError: Cannot read properties of null (reading 'toString')).
 */
function toSafeAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Detects if a description contains an installment pattern (e.g., "1/12", "2/10")
 * @param description - Transaction description
 * @returns true if installment pattern is found
 */
export function hasInstallmentPattern(description: string): boolean {
  // Installment counters look like "current/total" (e.g. "1/12", "2/10"),
  // where the current installment never exceeds the total. Calendar dates
  // in the DD/MM format used on Brazilian statements (e.g. "15/04") match
  // the same digit/digit shape but usually break that constraint, since
  // day-of-month commonly exceeds month-of-year — use that to tell them apart.
  const match = description.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (!match) return false;
  const current = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  return current > 0 && total > 0 && current <= total;
}

/**
 * Classifies a single transaction into one of three types
 * @param transaction - The transaction to classify
 * @param _billingDueDate - Não é mais usado pra decidir o tipo (ver nota na Rule 3);
 *   mantido no parâmetro só por compatibilidade com quem já chama esta função.
 * @returns The transaction type
 */
export function classifyTransaction(
  transaction: any,
  _billingDueDate?: Date
): TransactionType {
  const amount = toSafeAmount(transaction.amount);

  // Rule 1: Créditos (Credits) - negative values (estorno/crédito já vem com
  // o sinal certo desde a importação, ver ImportFile.tsx)
  if (amount < 0) {
    return 'credito';
  }

  // Rule 2: Parceladas (Installments) - installments > 1 é o dado
  // estruturado que a IA extrai lendo a notação impressa na fatura (ex:
  // "03/10"). hasInstallmentPattern é só um reforço pra descrições
  // antigas/adicionadas manualmente que ainda carreguem a notação bruta.
  if (transaction.installments > 1 || hasInstallmentPattern(transaction.description ?? "")) {
    return 'parcelada';
  }

  // Rule 3: À Vista — tudo que sobra (valor positivo, uma parcela só) é
  // compra do mês, à vista.
  //
  // BUG CORRIGIDO: esta função classificava como "parcelada" qualquer
  // transação à vista que não caísse nos "últimos 5 dias antes do
  // vencimento" — mas o fechamento de uma fatura normalmente acontece
  // ~1 semana ANTES do vencimento, então NENHUMA transação real de uma
  // fatura cai nesse intervalo de 5 dias. Na prática isso jogava
  // praticamente toda compra à vista pro balde "parcelada", por mais que o
  // valor de installments estivesse certinho em 1. Proximidade de data não
  // é um sinal confiável de parcelamento — só installments > 1 (ou a
  // notação na descrição) é.
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
  const vista = grouped.vista.reduce((sum, t) => sum + toSafeAmount(t.amount), 0);
  const parcelada = grouped.parcelada.reduce((sum, t) => sum + toSafeAmount(t.amount), 0);
  const credito = grouped.credito.reduce((sum, t) => sum + toSafeAmount(t.amount), 0);

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
