/**
 * Parser for BRB (Banco de Brasília) bank statements
 * Format: Organized by month with Dia | Histórico | Valor
 */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: string;
  type: "income" | "expense";
}

export function parseBRBStatement(pdfContent: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = pdfContent.split('\n');
  
  const monthMap: {[key: string]: number} = {
    'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
    'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
    'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
  };
  
  let currentMonth = new Date().getMonth() + 1;
  let currentYear = new Date().getFullYear();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for month/year header (e.g., "ABRIL/2026")
    const monthHeaderMatch = line.match(/(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\/(\d{4})/i);
    if (monthHeaderMatch) {
      currentMonth = monthMap[monthHeaderMatch[1].toUpperCase()] || currentMonth;
      currentYear = parseInt(monthHeaderMatch[2]) || currentYear;
      console.log('[BRB Parser] Found month header:', monthHeaderMatch[0], 'Month:', currentMonth, 'Year:', currentYear);
      continue;
    }
    
    // Look for transaction lines: DD/MM DESCRIPTION R$ +/-VALUE
    // Pattern: 01/04 CREDITO PIX – DOC: 000000 BIATRIZ X D M FARIA — 3773 R$ +5.600,00
    const txMatch = line.match(/^(\d{1,2})\/(\d{1,2})\s+(.+?)\s+(R\$\s*[+-]?[\d.,]+)$/);
    if (txMatch) {
      try {
        const day = txMatch[1];
        const month = txMatch[2];
        const description = txMatch[3].trim();
        const amountStr = txMatch[4];
        
        // Parse amount with sign
        const amountMatch = amountStr.match(/R\$\s*([+-])?(\d[\d.,]*)/);
        if (amountMatch) {
          const sign = amountMatch[1] || '+';
          const amountValue = amountMatch[2].replace(/\./g, '').replace(',', '.');
          const isCredit = sign === '+';
          
          // Create date
          const dateStr = `${month}/${day}/${currentYear}`;
          const date = new Date(dateStr);
          
          if (!isNaN(date.getTime()) && !isNaN(parseFloat(amountValue))) {
            transactions.push({
              date,
              description: description.substring(0, 100),
              amount: amountValue,
              type: isCredit ? "income" : "expense"
            });
            console.log('[BRB Parser] Extracted transaction:', {date: dateStr, description, amount: amountValue, type: isCredit ? 'income' : 'expense'});
          }
        }
      } catch (e) {
        console.log('[BRB Parser] Error parsing transaction:', e);
      }
    }
  }
  
  return transactions;
}

export function detectBRBFormat(pdfContent: string): boolean {
  return pdfContent.includes('Agência') && pdfContent.includes('Conta Corrente');
}
