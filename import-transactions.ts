import { db } from './server/db';
import { transactions } from './drizzle/schema';

const transactionsData = [
  { accountId: 60003, date: 1775016000000, description: 'CREDITO PIX – DOC: 000000 BIATRIZ X D M FARIA – 3773', amount: 5600.0, type: 'income' },
  { accountId: 60003, date: 1775016000000, description: 'PACOTE MILLENIUM – DOC: 000000', amount: 45.9, type: 'expense' },
  { accountId: 60003, date: 1772686800000, description: 'DEBITO PRESTACAO SFH/IMOVEL – DOC: 382175', amount: 5597.74, type: 'expense' },
  { accountId: 60003, date: 1772427600000, description: 'CREDITO PIX – DOC: 000000 BIATRIZ X D M FARIA – 3773', amount: 5600.0, type: 'income' },
  { accountId: 60003, date: 1772427600000, description: 'PACOTE MILLENIUM – DOC: 000000', amount: 45.9, type: 'expense' },
  { accountId: 60003, date: 1770958800000, description: 'CREDITO PIX – DOC: 000000 BIATRIZ XAVIER DANTA – 3773', amount: 1150.0, type: 'income' },
  { accountId: 60003, date: 1770958800000, description: 'DEBITO PRESTACAO SFH/IMOVEL – DOC: 382175', amount: 1106.36, type: 'expense' },
  { accountId: 60003, date: 1770267600000, description: 'DEBITO PRESTACAO SFH/IMOVEL – DOC: 382175', amount: 5003.56, type: 'expense' },
  { accountId: 60003, date: 1770008400000, description: 'CREDITO PIX – DOC: 000000 BIATRIZ X D M FARIA – 3773', amount: 5600.0, type: 'income' },
  { accountId: 60003, date: 1770008400000, description: 'PACOTE MILLENIUM – DOC: 000000', amount: 45.9, type: 'expense' },
  { accountId: 60003, date: 1770008400000, description: 'DEBITO PRESTACAO SFH/IMOVEL – DOC: 382175', amount: 550.54, type: 'expense' },
  { accountId: 60003, date: 1767589200000, description: 'DEBITO PRESTACAO SFH/IMOVEL – DOC: 382175', amount: 5554.1, type: 'expense' },
  { accountId: 60003, date: 1767330000000, description: 'CREDITO PIX – DOC: 000000 BIATRIZ X D M FARIA – 3773', amount: 5600.0, type: 'income' },
  { accountId: 60003, date: 1767330000000, description: 'PACOTE MILLENIUM – DOC: 000000', amount: 45.9, type: 'expense' },
];

async function importTransactions() {
  console.log(`Importando ${transactionsData.length} transações...`);
  
  for (const tx of transactionsData) {
    await db.insert(transactions).values({
      accountId: tx.accountId,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type as 'income' | 'expense',
      category: null,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`✓ Importada: ${tx.description.substring(0, 40)}... (R$ ${tx.amount})`);
  }
  
  console.log(`\n✅ ${transactionsData.length} transações importadas com sucesso!`);
}

importTransactions().catch(console.error);
