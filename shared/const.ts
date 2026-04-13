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
 * Handles both pt-BR format (29.034,60) and SQL format (29034.60)
 * @param value - String in format "000.000,00" or "000,00" or "29034.60"
 * @returns Numeric value
 */
export function convertBRLToNumber(value: string | number): number {
  if (!value && value !== 0) return 0;
  
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  
  // Convert to string and trim
  let str = value.toString().trim();
  
  // Detect pt-BR format: has comma as decimal separator
  // Examples: "29.034,60" or "29,60"
  if (str.includes(',')) {
    // It's pt-BR format: remove dots (thousands separator) and replace comma with dot
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  
  // Otherwise, assume it's SQL format: 29034.60 (dot as decimal, no thousands separator)
  // Just parse it directly
  return parseFloat(str);
}

export const COOKIE_NAME = "session";
