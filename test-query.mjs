import mysql from "mysql2/promise";

const TARGET_DB = process.env.DATABASE_URL;

async function testQuery() {
  let targetConn;
  
  try {
    const targetUrl = new URL(TARGET_DB);
    
    targetConn = await mysql.createConnection({
      host: targetUrl.hostname,
      port: targetUrl.port,
      user: targetUrl.username,
      password: targetUrl.password,
      database: targetUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    });
    
    console.log("Testando query com DATE_FORMAT...\n");
    
    const [result] = await targetConn.execute(
      "SELECT id, description, amount, DATE_FORMAT(dueDate, '%Y-%m') as mes FROM creditCardTransactions WHERE cardId = 1 AND DATE_FORMAT(dueDate, '%Y-%m') = '2026-04' LIMIT 5"
    );
    
    console.log(`Encontradas ${result.length} transações:`);
    result.forEach(row => {
      console.log(`  ID: ${row.id}, Desc: ${row.description}, Mes: ${row.mes}, Amount: ${row.amount}`);
    });
    
    await targetConn.end();
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
}

testQuery();
