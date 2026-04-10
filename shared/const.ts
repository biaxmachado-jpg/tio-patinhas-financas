export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Format a number as Brazilian currency (R$000.000,00)
 * @param value - The numeric value to format
 * @returns Formatted string with Brazilian currency format
 */
export function formatBRL(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `R$${formatted}`;
}

/**
 * Convert Brazilian currency format to number
 * @param value - String in format "000.000,00" or "000,00"
 * @returns Numeric value
 */
export function convertBRLToNumber(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
}
