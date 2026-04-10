import mysql from "mysql2/promise";

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Get users
    const [users] = await conn.execute("SELECT id, openId, name, email FROM users");
    console.log("✓ Usuários no banco:");
    users.forEach(u => {
      console.log(`  - ID: ${u.id}, OpenID: ${u.openId}, Name: ${u.name}, Email: ${u.email}`);
    });
    
    // Get transactions by userId
    const [transCount] = await conn.execute("SELECT userId, COUNT(*) as count FROM transactions GROUP BY userId");
    console.log("\n✓ Transações por userId:");
    transCount.forEach(t => {
      console.log(`  - userId: ${t.userId}, Count: ${t.count}`);
    });
    
    // Get accounts by userId
    const [accCount] = await conn.execute("SELECT userId, COUNT(*) as count FROM bankAccounts GROUP BY userId");
    console.log("\n✓ Contas por userId:");
    accCount.forEach(a => {
      console.log(`  - userId: ${a.userId}, Count: ${a.count}`);
    });
    
  } finally {
    await conn.end();
  }
}

check().catch(console.error);
