/**
 * Bank Detection and Parsing Module
 * Detects the bank from PDF/XLSX files and applies specific parsers
 */

export type BankType = "bradesco" | "itau" | "nubank" | "caixa" | "santander" | "bbrasil" | "generic";

export interface BankInfo {
  name: string;
  type: BankType;
  patterns: string[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
}

export interface ParseResult {
  bank: BankType;
  transactions: Transaction[];
  dueDate?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Linhas do extrato do Itaú que devem ser ignoradas (não são transações reais)
// ─────────────────────────────────────────────────────────────────────────────
const ITAU_SKIP_PATTERNS = [
  "saldo anterior",
  "saldo total dispon",   // "SALDO TOTAL DISPONÍVEL DIA"
  "saldo em conta",
  "limite da conta",
  "período de visualização",
  "emitido em",
  "lançamentos futuros",
  "saídas futuras",
  "posição consolidada",
  "rend pago aplic",      // rendimento automático (centavos, ruído)
  "juros limite da conta",
  "aviso",
];

// ─────────────────────────────────────────────────────────────────────────────
// Detect bank — Itaú tem prioridade sobre Bradesco para evitar falso positivo
// quando o extrato do Itaú menciona "BRADESCO" em uma TED recebida
// ─────────────────────────────────────────────────────────────────────────────
export function detectBank(content: string): BankType {
  const upper = content.toUpperCase();

  // Itaú primeiro — marcadores exclusivos do cabeçalho/estrutura do extrato
  if (
    upper.includes("EXTRATO CONTA CORRENTE") ||
    upper.includes("ITAU.COM.BR") ||
    upper.includes("ITAú UNIBANCO") ||
    upper.includes("ITAÚ UNIBANCO") ||
    upper.includes("PERSONNALITÉ") ||
    upper.includes("ITAU UNIBANCO") ||
    // Cabeçalho padrão do extrato Itaú
    (upper.includes("ITAU") && upper.includes("EXTRATO"))
  ) return "itau";

  if (upper.includes("BRADESCO") && upper.includes("BRADESCO.COM.BR")) return "bradesco";
  if (upper.includes("NUBANK") || upper.includes("NU PAGAMENTOS")) return "nubank";
  if (upper.includes("CAIXA") && upper.includes("CAIXA.GOV")) return "caixa";
  if (upper.includes("SANTANDER") && upper.includes("SANTANDER.COM.BR")) return "santander";
  if (upper.includes("BANCO DO BRASIL") && upper.includes("BB.COM.BR")) return "bbrasil";

  // Fallback mais amplo (sem confundir com menções em transações)
  if (upper.includes("BRADESCO") && upper.includes("HISTÓRICO")) return "bradesco";
  if (upper.includes("ITAU")) return "itau";

  return "generic";
}

/**
 * Get bank info by type
 */
export function getBankInfo(bankType: BankType): BankInfo {
  const INFO: Record<BankType, BankInfo> = {
    itau:     { name: "Itaú",            type: "itau",     patterns: [] },
    bradesco: { name: "Bradesco",         type: "bradesco", patterns: [] },
    nubank:   { name: "Nubank",           type: "nubank",   patterns: [] },
    caixa:    { name: "Caixa Econômica",  type: "caixa",    patterns: [] },
    santander:{ name: "Santander",        type: "santander",patterns: [] },
    bbrasil:  { name: "Banco do Brasil",  type: "bbrasil",  patterns: [] },
    generic:  { name: "Banco Genérico",   type: "generic",  patterns: [] },
  };
  return INFO[bankType] || INFO.generic;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser Itaú — extrato conta corrente PDF
// Formato por linha: "DD/MM/YYYY DESCRIÇÃO -9.999,99"
// A coluna "saldo (R$)" aparece na mesma linha mas sem sinal — precisamos
// pegar só o PRIMEIRO valor após a descrição (que é o lançamento).
// ─────────────────────────────────────────────────────────────────────────────
export function parseItau(content: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = content.split("\n");

  // Encontrar onde começam os lançamentos
  let inLancamentos = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Marcar início da seção de lançamentos
    if (trimmed.toLowerCase().includes("lançamentos") && !trimmed.toLowerCase().includes("futuros")) {
      inLancamentos = true;
      continue;
    }
    // Parar em lançamentos futuros ou posição consolidada
    if (
      trimmed.toLowerCase().includes("lançamentos futuros") ||
      trimmed.toLowerCase().includes("posição consolidada") ||
      trimmed.toLowerCase().includes("saídas futuras")
    ) break;

    if (!inLancamentos) continue;

    // Linha deve começar com data DD/MM/YYYY
    const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+)$/);
    if (!dateMatch) continue;

    const [, dateStr, rest] = dateMatch;

    // Ignorar linhas de saldo, rendimento etc
    const restLower = rest.toLowerCase();
    if (ITAU_SKIP_PATTERNS.some(p => restLower.includes(p))) continue;

    // Extrair valor: último token que seja número com vírgula (e possível sinal)
    // Formato: "DESCRIÇÃO -9.999,99" ou "DESCRIÇÃO 9.999,99 13.061,44" (lançamento + saldo)
    // Pegamos o PRIMEIRO valor numérico no final (pode ter saldo logo depois)
    const amountMatch = rest.match(/(-?[\d.]+,\d{2})(?:\s+-?[\d.]+,\d{2})*\s*$/);
    if (!amountMatch) continue;

    // Se há dois valores no final, o primeiro é o lançamento
    const allAmounts = rest.match(/(-?[\d.]+,\d{2})/g);
    if (!allAmounts || allAmounts.length === 0) continue;

    // O valor do lançamento é o antepenúltimo ou penúltimo — depende se tem saldo
    // Heurística: se o último valor é muito grande (saldo acumulado) e o penúltimo é o lançamento
    // Mais simples: pegar o último valor com sinal negativo, ou o penúltimo se o último não tem sinal
    let amountRaw: string;
    if (allAmounts.length >= 2) {
      // Verifica se o último parece saldo (sem sinal e muito diferente do anterior)
      const last = allAmounts[allAmounts.length - 1];
      const secondLast = allAmounts[allAmounts.length - 2];
      // Se o segundo valor é diferente do primeiro, o primeiro é o lançamento
      amountRaw = secondLast; // primeiro valor = lançamento
    } else {
      amountRaw = allAmounts[0];
    }

    // Extrair descrição: texto entre a data e o primeiro valor numérico
    const firstAmountIdx = rest.indexOf(allAmounts[0]);
    const description = rest.substring(0, firstAmountIdx).trim();

    if (!description || description.length < 2) continue;

    // Formatar data YYYY-MM-DD
    const [day, month, year] = dateStr.split("/");
    const formattedDate = `${year}-${month}-${day}`;

    // Parsear valor
    const cleanAmount = amountRaw.replace(/\./g, "").replace(",", ".");
    const numericAmount = parseFloat(cleanAmount);
    if (isNaN(numericAmount)) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description: description.trim(),
      amount: numericAmount.toFixed(2), // mantém sinal (negativo = débito)
    });
  }

  return transactions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parser Itaú — extrato conta corrente XLS/XLSX
// Aba: "Lançamentos" | Header: linha com "data" e "lan" | Colunas: data lançamento valor saldo
// Transação válida: coluna valor preenchida (saldo do dia fica só na coluna saldo)
// ─────────────────────────────────────────────────────────────────────────────
export function parseItauXLS(data: any[][]): Transaction[] {
  const transactions: Transaction[] = [];

  // Encontrar linha de header
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map((c: any) => String(c ?? "").toLowerCase()).join(" ");
    if (rowStr.includes("data") && rowStr.includes("lan")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return transactions;

  const header = data[headerIdx].map((c: any) => String(c ?? "").toLowerCase());
  const dateCol  = header.findIndex((c: string) => c.includes("data"));
  const descCol  = header.findIndex((c: string) => c.includes("lan"));
  const amtCol   = header.findIndex((c: string) => c.includes("valor"));
  const saldoCol = header.findIndex((c: string) => c.includes("saldo"));

  if (dateCol === -1 || descCol === -1 || amtCol === -1) return transactions;

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const dateRaw = String(row[dateCol] ?? "").trim();
    const desc    = String(row[descCol] ?? "").trim();
    const amtRaw  = row[amtCol];

    if (!dateRaw || !/\d/.test(dateRaw)) continue;

    // Linha de saldo do dia: coluna valor vazia, coluna saldo preenchida
    const amtEmpty = amtRaw === "" || amtRaw === null || amtRaw === undefined;
    if (amtEmpty) continue;

    // Filtrar ruído
    if (ITAU_SKIP_PATTERNS.some(p => desc.toLowerCase().includes(p))) continue;

    // Formatar data DD/MM/YYYY
    const m = dateRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) continue;
    const [, day, month, yr] = m;
    const year = yr.length === 2 ? "20" + yr : yr;
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // Parsear valor (já é número no XLS nativo)
    let amount: number;
    if (typeof amtRaw === "number") {
      amount = amtRaw;
    } else {
      let s = String(amtRaw).replace(/[R$\s]/g, "");
      if (s.includes(".") && s.includes(",")) s = s.replace(".", "").replace(",", ".");
      else s = s.replace(",", ".");
      amount = parseFloat(s);
    }
    if (isNaN(amount) || amount === 0) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description: desc.replace(/\s+/g, " ").trim(),
      amount: amount.toFixed(2), // mantém sinal
    });
  }

  return transactions;
}

/**
 * Parse Bradesco PDF/XLSX
 */
export function parseBradesco(content: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = content.split("\n");

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (
      line.includes("data") &&
      (line.includes("histórico") || line.includes("historico") || line.includes("lançamento")) &&
      (line.includes("valor") || line.includes("r$"))
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Lançamentos")) { headerIndex = i; break; }
    }
  }
  if (headerIndex === -1) return transactions;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.includes("Data") || line.includes("Histórico") || line.includes("Cidade")) continue;
    if (
      line.includes("Total para") || line.includes("Total da fatura") ||
      line.includes("Cartão") || line.includes("Limites") ||
      line.includes("Utilizado") || line.includes("Resumo das Despesas") ||
      line.includes("Saldo Anterior") || line.includes("Pagamentos/Créditos")
    ) break;

    const dateMatch = line.match(/(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) continue;
    const amountMatch = line.match(/R?\$?\s*([\d.,]+)\s*$/);
    if (!amountMatch) continue;

    const dateStr = dateMatch[1];
    const amount = amountMatch[1];
    const descriptionStart = line.indexOf(dateStr) + dateStr.length;
    const descriptionEnd = line.lastIndexOf(amount);
    let description = line.substring(descriptionStart, descriptionEnd).trim();
    description = description.replace(/\s+/g, " ").replace(/\d+,\d+\s*/g, "").trim();
    if (!description || description.length < 2) continue;

    const [day, month] = dateStr.split("/");
    const year = new Date().getFullYear();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    let cleanAmount = amount.replace(/[^0-9.,\-]/g, "");
    if (cleanAmount.includes(".") && cleanAmount.includes(",")) {
      cleanAmount = cleanAmount.replace(".", "").replace(",", ".");
    } else {
      cleanAmount = cleanAmount.replace(",", ".");
    }
    const parsed = parseFloat(cleanAmount);
    if (isNaN(parsed)) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description,
      amount: Math.abs(parsed).toFixed(2),
    });
  }

  return transactions;
}

/**
 * Parse Nubank PDF/XLSX
 */
export function parseNubank(content: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = content.split("\n");

  let transactionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Transações") || lines[i].includes("Compras") || lines[i].includes("Lançamentos")) {
      transactionStart = i; break;
    }
  }
  if (transactionStart === -1) return transactions;

  for (let i = transactionStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.includes("Total") || line.includes("Saldo")) break;

    const dateMatch = line.match(/(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) continue;
    const amountMatch = line.match(/R?\$?\s*([\d.,]+)\s*$/);
    if (!amountMatch) continue;

    const dateStr = dateMatch[1];
    const amount = amountMatch[1];
    const descriptionStart = line.indexOf(dateStr) + dateStr.length;
    const descriptionEnd = line.lastIndexOf(amount);
    let description = line.substring(descriptionStart, descriptionEnd).trim().replace(/\s+/g, " ");
    if (!description) continue;

    const [day, month] = dateStr.split("/");
    const year = new Date().getFullYear();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    let cleanAmount = amount.replace(/[^0-9.,]/g, "");
    if (cleanAmount.includes(".") && cleanAmount.includes(",")) {
      cleanAmount = cleanAmount.replace(".", "").replace(",", ".");
    } else {
      cleanAmount = cleanAmount.replace(",", ".");
    }
    if (isNaN(parseFloat(cleanAmount))) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description,
      amount: cleanAmount,
    });
  }

  return transactions;
}

/**
 * Generic parser
 */
export function parseGeneric(content: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.length < 10) continue;

    const dateMatch = trimmedLine.match(/(\d{1,2}[\/\-]\d{1,2})/);
    if (!dateMatch) continue;
    const amountMatch = trimmedLine.match(/R?\$?\s*([\d.,]+)\s*$/);
    if (!amountMatch) continue;

    const dateStr = dateMatch[1];
    const amount = amountMatch[1];
    const descriptionStart = trimmedLine.indexOf(dateStr) + dateStr.length;
    const descriptionEnd = trimmedLine.lastIndexOf(amount);
    let description = trimmedLine.substring(descriptionStart, descriptionEnd).trim().replace(/\s+/g, " ");
    if (!description || description.length < 2) continue;

    const [day, month] = dateStr.split(/[\/\-]/);
    const year = new Date().getFullYear();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    let cleanAmount = amount.replace(/[^0-9.,\-]/g, "");
    if (cleanAmount.includes(".") && cleanAmount.includes(",")) {
      cleanAmount = cleanAmount.replace(".", "").replace(",", ".");
    } else {
      cleanAmount = cleanAmount.replace(",", ".");
    }
    const parsed = parseFloat(cleanAmount);
    if (isNaN(parsed)) continue;

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description,
      amount: Math.abs(parsed).toFixed(2),
    });
  }

  return transactions;
}

/**
 * Main parser function
 */
export async function parseFileWithBankDetection(
  content: string,
  fileType: string
): Promise<ParseResult> {
  const bank = detectBank(content);

  let transactions: Transaction[] = [];
  let dueDate: Date | undefined;

  switch (bank) {
    case "bradesco":
      transactions = parseBradesco(content);
      dueDate = extractDueDate(content);
      break;
    case "itau":
      transactions = parseItau(content);
      dueDate = extractDueDate(content);
      break;
    case "nubank":
      transactions = parseNubank(content);
      dueDate = extractDueDate(content);
      break;
    default:
      transactions = parseGeneric(content);
      dueDate = extractDueDate(content);
      break;
  }

  return { bank, transactions, dueDate };
}

/**
 * Extrair data de vencimento (qualquer banco)
 */
function extractDueDate(content: string): Date | undefined {
  const patterns = [
    /Vencimento[:\s]+(?:dia\s+)?(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-](\d{4})/i,
    /Data de Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    /Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    /Due Date[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      return new Date(year, month - 1, day);
    }
  }
  return undefined;
}
