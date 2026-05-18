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
  dueDate?: Date; // Data de vencimento da fatura
}

// Bank detection patterns
const BANK_PATTERNS: Record<BankType, BankInfo> = {
  bradesco: {
    name: "Bradesco",
    type: "bradesco",
    patterns: ["BRADESCO", "bradesco.com.br", "360062032737"],
  },
  itau: {
    name: "Itaú",
    type: "itau",
    patterns: ["ITAU", "itau.com.br", "Itaú Unibanco"],
  },
  nubank: {
    name: "Nubank",
    type: "nubank",
    patterns: ["NUBANK", "nubank.com.br", "Nu Pagamentos"],
  },
  caixa: {
    name: "Caixa Econômica",
    type: "caixa",
    patterns: ["CAIXA", "caixa.gov.br", "Caixa Econômica"],
  },
  santander: {
    name: "Santander",
    type: "santander",
    patterns: ["SANTANDER", "santander.com.br"],
  },
  bbrasil: {
    name: "Banco do Brasil",
    type: "bbrasil",
    patterns: ["BANCO DO BRASIL", "bb.com.br", "Banco do Brasil"],
  },
  generic: {
    name: "Banco Genérico",
    type: "generic",
    patterns: [],
  },
};

/**
 * Detect bank from text content
 */
export function detectBank(content: string): BankType {
  const upperContent = content.toUpperCase();

  for (const [bankType, bankInfo] of Object.entries(BANK_PATTERNS)) {
    if (bankType === "generic") continue;

    for (const pattern of bankInfo.patterns) {
      if (upperContent.includes(pattern.toUpperCase())) {
        return bankType as BankType;
      }
    }
  }

  return "generic";
}

/**
 * Parse Bradesco PDF/XLSX
 * Bradesco format: Data | Histórico de Lançamentos | Valor
 */
export function parseBradesco(content: string): Transaction[] {
  const transactions: Transaction[] = [];

  // Split by lines
  const lines = content.split("\n");

  // Find the header line with "Data" and "Histórico" and "Valor"
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
    // Fallback: look for "Lançamentos" section
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Lançamentos")) {
        headerIndex = i;
        break;
      }
    }
  }

  if (headerIndex === -1) {
    return transactions;
  }

  // Process lines after header
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and headers
    if (!line || line.includes("Data") || line.includes("Histórico") || line.includes("Cidade")) {
      continue;
    }

    // Stop at summary sections
    if (
      line.includes("Total para") ||
      line.includes("Total da fatura") ||
      line.includes("Cartão") ||
      line.includes("Limites") ||
      line.includes("Utilizado") ||
      line.includes("Resumo das Despesas") ||
      line.includes("Saldo Anterior") ||
      line.includes("Pagamentos/Créditos")
    ) {
      break;
    }

    // Try to parse transaction line
    // Format: DD/MM DESCRIPTION AMOUNT or similar
    const dateMatch = line.match(/(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) continue;

    // Extract amount (look for R$ or just numbers with decimals)
    const amountMatch = line.match(/R?\$?\s*([\d.,]+)\s*$/);
    if (!amountMatch) continue;

    const dateStr = dateMatch[1];
    const amount = amountMatch[1];

    // Extract description (text between date and amount)
    const descriptionStart = line.indexOf(dateStr) + dateStr.length;
    const descriptionEnd = line.lastIndexOf(amount);
    let description = line.substring(descriptionStart, descriptionEnd).trim();

    // Clean up description - remove extra numbers and currency values
    description = description.replace(/\s+/g, " ");
    description = description.replace(/\d+,\d+\s*/g, "").trim(); // Remove amounts like "0,00"
    description = description.replace(/\s+/g, " ").trim(); // Clean up spaces again

    if (!description || description.length < 2) continue;

    // Format date to YYYY-MM-DD
    const [day, month] = dateStr.split("/");
    const year = new Date().getFullYear();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // Clean amount
    let cleanAmount = amount.replace(/[^0-9.,\-]/g, "");
    if (cleanAmount.includes(".") && cleanAmount.includes(",")) {
      cleanAmount = cleanAmount.replace(".", "").replace(",", ".");
    } else {
      cleanAmount = cleanAmount.replace(",", ".");
    }

    const parsed = parseFloat(cleanAmount);
    if (isNaN(parsed)) continue;

    // Use absolute value (remove negative sign for expenses)
    const absoluteAmount = Math.abs(parsed).toFixed(2);

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description,
      amount: absoluteAmount,
    });
  }

  return transactions;
}

/**
 * Parse Itaú PDF/XLSX
 */
export function parseItau(content: string): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = content.split("\n");

  const SKIP_PATTERNS = [
    "saldo do dia",
    "período de visualização",
    "emitido em",
    "saldo em conta",
    "limite da conta",
    "aviso",
    "extrato conta",
    "lançamentos",
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (SKIP_PATTERNS.some((p) => trimmed.toLowerCase().includes(p))) continue;

    // Formato Itaú PDF: DD/MM/AAAA DESCRIÇÃO -9.999,99 ou 9.999,99
    const match = trimmed.match(
      /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})$/
    );

    if (!match) continue;

    const [, dateStr, description, rawAmount] = match;

    if (description.toLowerCase().includes("saldo do dia")) continue;

    const [day, month, year] = dateStr.split("/");
    const formattedDate = `${year}-${month}-${day}`;

    const cleanAmount = rawAmount.replace(/\./g, "").replace(",", ".");
    const numericAmount = parseFloat(cleanAmount);
    if (isNaN(numericAmount)) continue;

    const absAmount = Math.abs(numericAmount).toFixed(2);

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description: description.trim(),
      amount: absAmount,
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

  // Find transaction section
  let transactionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].includes("Transações") ||
      lines[i].includes("Compras") ||
      lines[i].includes("Lançamentos")
    ) {
      transactionStart = i;
      break;
    }
  }

  if (transactionStart === -1) {
    return transactions;
  }

  // Parse transactions
  for (let i = transactionStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.includes("Total") || line.includes("Saldo")) {
      break;
    }

    // Nubank format: DD/MM DESCRIPTION VALUE
    const dateMatch = line.match(/(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) continue;

    const amountMatch = line.match(/R?\$?\s*([\d.,]+)\s*$/);
    if (!amountMatch) continue;

    const dateStr = dateMatch[1];
    const amount = amountMatch[1];

    const descriptionStart = line.indexOf(dateStr) + dateStr.length;
    const descriptionEnd = line.lastIndexOf(amount);
    let description = line.substring(descriptionStart, descriptionEnd).trim();
    description = description.replace(/\s+/g, " ");

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
 * Generic parser for unknown banks
 */
export function parseGeneric(content: string): Transaction[] {
  const transactions: Transaction[] = [];

  const lines = content.split("\n");

  // Look for any line with date and amount pattern
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and headers
    if (!trimmedLine || trimmedLine.length < 10) continue;

    // Look for date pattern (DD/MM or DD-MM)
    const dateMatch = trimmedLine.match(/(\d{1,2}[\/\-]\d{1,2})/);
    if (!dateMatch) continue;

    // Look for amount pattern
    const amountMatch = trimmedLine.match(/R?\$?\s*([\d.,]+)\s*$/);
    if (!amountMatch) continue;

    const dateStr = dateMatch[1];
    const amount = amountMatch[1];

    const descriptionStart = trimmedLine.indexOf(dateStr) + dateStr.length;
    const descriptionEnd = trimmedLine.lastIndexOf(amount);
    let description = trimmedLine.substring(descriptionStart, descriptionEnd).trim();
    description = description.replace(/\s+/g, " ");

    if (!description || description.length < 2) continue;

    // Format date
    const [day, month] = dateStr.split(/[\/\-]/);
    const year = new Date().getFullYear();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // Clean amount
    let cleanAmount = amount.replace(/[^0-9.,\-]/g, "");
    if (cleanAmount.includes(".") && cleanAmount.includes(",")) {
      cleanAmount = cleanAmount.replace(".", "").replace(",", ".");
    } else {
      cleanAmount = cleanAmount.replace(",", ".");
    }

    const parsed = parseFloat(cleanAmount);
    if (isNaN(parsed)) continue;

    // Use absolute value (remove negative sign for expenses)
    const absoluteAmount = Math.abs(parsed).toFixed(2);

    transactions.push({
      id: Date.now().toString() + Math.random(),
      date: formattedDate,
      description,
      amount: absoluteAmount,
    });
  }

  return transactions;
}

/**
 * Main parser function that detects bank and applies specific parser
 */
export async function parseFileWithBankDetection(
  content: string,
  fileType: string
): Promise<ParseResult> {
  // Detect bank
  const bank = detectBank(content);

  // Apply specific parser
  let transactions: Transaction[] = [];
  let dueDate: Date | undefined;

  switch (bank) {
    case "bradesco":
      transactions = parseBradesco(content);
      dueDate = extractDueDateBradesco(content);
      break;
    case "itau":
      transactions = parseItau(content);
      dueDate = extractDueDateItau(content);
      break;
    case "nubank":
      transactions = parseNubank(content);
      dueDate = extractDueDateNubank(content);
      break;
    case "generic":
    default:
      transactions = parseGeneric(content);
      dueDate = extractDueDateGeneric(content);
      break;
  }

  return { bank, transactions, dueDate };
}

/**
 * Extract due date from Bradesco statement
 */
function extractDueDateBradesco(content: string): Date | undefined {
  // Look for "Vencimento: dd/mm/yyyy" or similar patterns
  const patterns = [
    /Vencimento[:\s]+(?:dia\s+)?(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-](\d{4})/i,
    /Vencimento[:\s]+(\d{1,2})\/(\d{1,2})/i,
    /Data de Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
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

/**
 * Extract due date from Itau statement
 */
function extractDueDateItau(content: string): Date | undefined {
  const patterns = [
    /Data de Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    /Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      return new Date(year, month - 1, day);
    }
  }
  return undefined;
}

/**
 * Extract due date from Nubank statement
 */
function extractDueDateNubank(content: string): Date | undefined {
  const patterns = [
    /Vencimento[:\s]+(\d{1,2})\s+de\s+\w+\s+de\s+(\d{4})/i,
    /Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = match[2] ? parseInt(match[2]) : new Date().getMonth() + 1;
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      return new Date(year, month - 1, day);
    }
  }
  return undefined;
}

/**
 * Extract due date from generic statement
 */
function extractDueDateGeneric(content: string): Date | undefined {
  const patterns = [
    /Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    /Due Date[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    /Data de Vencimento[:\s]+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      return new Date(year, month - 1, day);
    }
  }
  return undefined;
}

/**
 * Get bank info by type
 */
export function getBankInfo(bankType: BankType): BankInfo {
  return BANK_PATTERNS[bankType] || BANK_PATTERNS.generic;
}
