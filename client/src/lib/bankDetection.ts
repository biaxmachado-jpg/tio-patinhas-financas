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

  // Find the "Lançamentos" section
  let lancamentosIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Lançamentos")) {
      lancamentosIndex = i;
      break;
    }
  }

  if (lancamentosIndex === -1) {
    return transactions;
  }

  // Process lines after "Lançamentos"
  for (let i = lancamentosIndex + 1; i < lines.length; i++) {
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
      line.includes("Utilizado")
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

    // Clean up description
    description = description.replace(/\s+/g, " ");

    if (!description) continue;

    // Format date to YYYY-MM-DD
    const [day, month] = dateStr.split("/");
    const year = new Date().getFullYear();
    const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // Clean amount
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
 * Parse Itaú PDF/XLSX
 */
export function parseItau(content: string): Transaction[] {
  const transactions: Transaction[] = [];

  // Similar pattern to Bradesco but with Itaú-specific markers
  const lines = content.split("\n");

  // Find transaction section
  let transactionStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].includes("Lançamentos") ||
      lines[i].includes("Transações") ||
      lines[i].includes("Movimentação")
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

    // Itaú format: DD/MM DESCRIPTION VALUE
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
 * Main parser function that detects bank and applies specific parser
 */
export async function parseFileWithBankDetection(
  content: string,
  fileType: string
): Promise<{ bank: BankType; transactions: Transaction[] }> {
  // Detect bank
  const bank = detectBank(content);

  // Apply specific parser
  let transactions: Transaction[] = [];

  switch (bank) {
    case "bradesco":
      transactions = parseBradesco(content);
      break;
    case "itau":
      transactions = parseItau(content);
      break;
    case "nubank":
      transactions = parseNubank(content);
      break;
    case "generic":
    default:
      transactions = parseGeneric(content);
      break;
  }

  return { bank, transactions };
}

/**
 * Get bank info by type
 */
export function getBankInfo(bankType: BankType): BankInfo {
  return BANK_PATTERNS[bankType] || BANK_PATTERNS.generic;
}
