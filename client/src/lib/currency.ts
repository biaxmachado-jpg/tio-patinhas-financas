/**
 * Formata um valor numérico para o padrão brasileiro de moeda
 * Exemplo: 1000.50 → "R$ 1.000,50"
 * 
 * @param value - Valor numérico a ser formatado
 * @param includeSymbol - Se deve incluir o símbolo R$ (padrão: true)
 * @returns String formatada no padrão brasileiro
 */
export function formatBRL(value: number | string, includeSymbol: boolean = true): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return includeSymbol ? "R$ 0,00" : "0,00";
  }

  // Formata com 2 casas decimais
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return formatted;
}

/**
 * Formata um valor numérico para o padrão brasileiro sem o símbolo R$
 * Exemplo: 1000.50 → "1.000,50"
 * 
 * @param value - Valor numérico a ser formatado
 * @returns String formatada no padrão brasileiro
 */
export function formatBRLValue(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return "0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata um valor para exibição em tabelas/listas com R$ e espaço
 * Exemplo: 1000.50 → "R$ 1.000,50"
 * 
 * @param value - Valor numérico a ser formatado
 * @returns String formatada com R$ e espaço
 */
export function formatCurrency(value: number | string): string {
  return formatBRL(value, true);
}
