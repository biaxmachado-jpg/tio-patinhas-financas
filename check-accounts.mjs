import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Get accounts
    const [accounts] = await conn.execute("SELECT id, userId, name, balance FROM bankAccounts WHERE userId = 1");
    console.log("✓ Contas para userId 1:");
    accounts.forEach(a => {
      console.log(`  - ID: ${a.id}, Name: ${a.name}, Balance: ${a.balance}`);
    });
    
    // Get transactions
    const [transactions] = await conn.execute("SELECT id, userId, type, amount FROM transactions WHERE userId = 1 LIMIT 5");
    console.log("\n✓ Amostra de transações para userId 1:");
    transactions.forEach(t => {
      console.log(`  - ID: ${t.id}, Type: ${t.type}, Amount: ${t.amount}`);
    });
    
  } finally {
    await conn.end();
  }
}

check().catch(console.error);
