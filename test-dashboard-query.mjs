import mysql from "mysql2/promise";

async function test() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const userId = 1;
    
    // Test transaction stats query
    const [stats] = await conn.execute(`
      SELECT type, SUM(amount) as total FROM transactions 
      WHERE userId = ? 
      GROUP BY type
    `, [userId]);
    
    console.log("✓ Transaction Stats:");
    stats.forEach(s => {
      console.log(`  - Type: ${s.type}, Total: ${s.total}`);
    });
    
    // Test balance query
    const [balance] = await conn.execute(`
      SELECT SUM(balance) as total FROM bankAccounts 
      WHERE userId = ?
    `, [userId]);
    
    console.log("\n✓ Total Balance:");
    console.log(`  - Balance: ${balance[0]?.total || 0}`);
    
  } finally {
    await conn.end();
  }
}

test().catch(console.error);
