import mysql from "mysql2/promise";

const TARGET_DB = process.env.DATABASE_URL;

async function checkUser() {
  let conn;
  
  try {
    const url = new URL(TARGET_DB);
    
    conn = await mysql.createConnection({
      host: url.hostname,
      port: url.port,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    });
    
    // Get all users
    const [users] = await conn.execute("SELECT id, openId, name FROM users LIMIT 10");
    console.log("Usuários encontrados:");
    users.forEach(u => console.log(`  ID: ${u.id}, OpenID: ${u.openId}, Name: ${u.name}`));
    
    // Get transactions with userId 1
    const [txs1] = await conn.execute("SELECT COUNT(*) as count FROM creditCardTransactions WHERE userId = 1");
    console.log(`\nTransações com userId=1: ${txs1[0].count}`);
    
    // Get transactions with userId 270515
    const [txs2] = await conn.execute("SELECT COUNT(*) as count FROM creditCardTransactions WHERE userId = 270515");
    console.log(`Transações com userId=270515: ${txs2[0].count}`);
    
    await conn.end();
  } catch (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

checkUser();
