/**
 * Parser for BRB (Banco de Brasília) bank statements
 * Format: Organized by month with sections for Dia, Histórico, Valor
 * Each transaction has: date (DD/MM), description, and value (R$ ±amount)
 */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: string;
  type: "income" | "expense";
}

export function parseBRBStatement(pdfContent: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = pdfContent.split('\n').map(l => l.trim()).filter(l => l);
  
  const monthMap: {[key: string]: number} = {
    'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4,
    'MAIO': 5, 'JUNHO': 6, 'JULHO': 7, 'AGOSTO': 8,
    'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
  };
  
  let currentMonth = new Date().getMonth() + 1;
  let currentYear = new Date().getFullYear();
  
  // Parse the document into sections by month
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for month/year header
    const monthHeaderMatch = line.match(/(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\/(\d{4})/i);
    if (monthHeaderMatch) {
      currentMonth = monthMap[monthHeaderMatch[1].toUpperCase()];
      currentYear = parseInt(monthHeaderMatch[2]);
      console.log(`[BRB Parser] Found month header: ${monthHeaderMatch[0]} (Month: ${currentMonth}, Year: ${currentYear})`);
      i++;
      continue;
    }
    
    // Look for "Dia" header
    if (line === 'Dia') {
      console.log(`[BRB Parser] Found "Dia" header at line ${i}`);
      
      // Collect all dates
      const dates: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j] !== 'Histórico') {
        const dateMatch = lines[j].match(/^(\d{1,2})\/(\d{1,2})$/);
        if (dateMatch) {
          dates.push(lines[j]);
        }
        j++;
      }
      
      console.log(`[BRB Parser] Found ${dates.length} dates: ${dates.join(', ')}`);
      
      // Now collect descriptions and amounts
      const descriptions: string[] = [];
      const amounts: string[] = [];
      
      if (j < lines.length && lines[j] === 'Histórico') {
        j++;
        // Collect until we hit "Valor"
        while (j < lines.length && lines[j] !== 'Valor') {
          if (lines[j] !== 'Histórico') {
            descriptions.push(lines[j]);
          }
          j++;
        }
      }
      
      if (j < lines.length && lines[j] === 'Valor') {
        j++;
        // Collect amounts
        while (j < lines.length) {
          const amountMatch = lines[j].match(/^R\$/);
          if (amountMatch) {
            amounts.push(lines[j]);
          } else if (lines[j].match(/(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\/(\d{4})/i)) {
            // Next month header found
            break;
          }
          j++;
        }
      }
      
      console.log(`[BRB Parser] Found ${descriptions.length} descriptions and ${amounts.length} amounts`);
      
      // Key insight: Each amount has exactly one description
      // The descriptions are listed in the same order as the amounts
      // But we have multiple dates that might share descriptions
      // 
      // Example:
      // Dates: [01/04, 01/04, 05/03, 02/03, 02/03]
      // Descriptions: [DESC1, DESC2, DESC3, DESC4, DESC5, DESC6]
      // Amounts: [AMT1, AMT2, AMT3, AMT4, AMT5]
      // 
      // We need to match:
      // Date[0] -> Desc[0] -> Amt[0]
      // Date[1] -> Desc[1] -> Amt[1]
      // etc.
      
      // But wait - if we have 5 dates and 5 amounts, but 6 descriptions,
      // then some descriptions must be combined
      
      // The real structure is:
      // - Dates are listed first
      // - Then descriptions are listed (some might be continuations)
      // - Then amounts are listed
      //
      // The number of amounts tells us how many transactions there are
      // Each transaction gets one date and one amount
      // Descriptions are distributed among the amounts
      
      // If descriptions.length > amounts.length, some descriptions belong together
      // If descriptions.length === amounts.length, each amount has one description
      // If descriptions.length < amounts.length, something is wrong
      
      let descIdx = 0;
      for (let k = 0; k < amounts.length; k++) {
        const amountStr = amounts[k];
        
        // Get the corresponding date
        let dateStr = '';
        if (k < dates.length) {
          dateStr = dates[k];
        } else {
          // If we have more amounts than dates, reuse the last date
          dateStr = dates[dates.length - 1];
        }
        
        // Collect descriptions for this amount
        let description = '';
        
        if (descriptions.length === amounts.length) {
          // Each amount has exactly one description
          if (k < descriptions.length) {
            description = descriptions[k];
          }
        } else if (descriptions.length > amounts.length) {
          // We have more descriptions than amounts
          // Distribute them: each amount gets ceil(descriptions.length / amounts.length) descriptions
          const descPerAmount = Math.ceil(descriptions.length / amounts.length);
          for (let d = 0; d < descPerAmount && descIdx < descriptions.length; d++) {
            if (description) {
              description += ' ';
            }
            description += descriptions[descIdx];
            descIdx++;
          }
        } else {
          // We have fewer descriptions than amounts
          // This shouldn't happen, but handle it gracefully
          if (descIdx < descriptions.length) {
            description = descriptions[descIdx];
            descIdx++;
          }
        }
        
        // Parse the amount. Signs may come as an ASCII hyphen (-) or, when
        // extracted from PDF text, as a Unicode minus sign (− U+2212).
        const amountMatch = amountStr.match(/R\$\s*([+\-−])?(\d[\d.,]*)/);
        if (amountMatch) {
          const sign = amountMatch[1] || '+';
          const amountValue = amountMatch[2].replace(/\./g, '').replace(',', '.');
          const isCredit = sign === '+';
          
          // Parse date
          const dayMonthMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
          if (dayMonthMatch) {
            const day = parseInt(dayMonthMatch[1]);
            const date = new Date(currentYear, currentMonth - 1, day);
            
            if (!isNaN(date.getTime()) && !isNaN(parseFloat(amountValue))) {
              const cleanDescription = description.replace(/\s+/g, ' ').substring(0, 150);
              
              transactions.push({
                date,
                description: cleanDescription,
                amount: amountValue,
                type: isCredit ? "income" : "expense"
              });
              
              console.log('[BRB Parser] Extracted transaction:', {
                date: dateStr,
                description: cleanDescription,
                amount: amountValue,
                type: isCredit ? 'income' : 'expense'
              });
            }
          }
        }
      }
      
      i = j;
    } else {
      i++;
    }
  }
  
  return transactions;
}

export function detectBRBFormat(pdfContent: string): boolean {
  return pdfContent.includes('Agência') && pdfContent.includes('Conta Corrente');
}
