import mysql from "mysql2/promise";

async function verify() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [users] = await conn.execute("SELECT COUNT(*) as count FROM users");
    const [categories] = await conn.execute("SELECT COUNT(*) as count FROM categories");
    const [accounts] = await conn.execute("SELECT COUNT(*) as count FROM bankAccounts");
    const [cards] = await conn.execute("SELECT COUNT(*) as count FROM creditCards");
    const [transactions] = await conn.execute("SELECT COUNT(*) as count FROM transactions");
    const [cardTrans] = await conn.execute("SELECT COUNT(*) as count FROM creditCardTransactions");
    const [budgets] = await conn.execute("SELECT COUNT(*) as count FROM budgets");
    
    console.log("✓ Dados no banco novo:");
    console.log(`  - Usuários: ${users[0].count}`);
    console.log(`  - Categorias: ${categories[0].count}`);
    console.log(`  - Contas: ${accounts[0].count}`);
    console.log(`  - Cartões: ${cards[0].count}`);
    console.log(`  - Transações: ${transactions[0].count}`);
    console.log(`  - Transações de Cartão: ${cardTrans[0].count}`);
    console.log(`  - Orçamentos: ${budgets[0].count}`);
    
    // Check sample transactions
    const [sampleTrans] = await conn.execute("SELECT id, userId, categoryId, amount, type, date FROM transactions LIMIT 3");
    console.log("\n✓ Amostra de transações:");
    sampleTrans.forEach(t => {
      console.log(`  - ID: ${t.id}, User: ${t.userId}, Category: ${t.categoryId}, Amount: ${t.amount}, Type: ${t.type}, Date: ${t.date}`);
    });
    
  } finally {
    await conn.end();
  }
}

verify().catch(console.error);
