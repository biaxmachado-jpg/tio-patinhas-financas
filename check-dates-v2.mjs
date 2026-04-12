import mysql from "mysql2/promise";

const TARGET_DB = process.env.DATABASE_URL;

async function checkDates() {
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
    
    console.log("📋 Verificando datas das transações de cartão 1...\n");
    
    // Check dueDate distribution
    const [dueDateDistribution] = await targetConn.execute(
      "SELECT DATE_FORMAT(dueDate, '%Y-%m') as mes, COUNT(*) as total FROM creditCardTransactions WHERE cardId = 1 GROUP BY DATE_FORMAT(dueDate, '%Y-%m')"
    );
    
    console.log("Distribuição por dueDate:");
    dueDateDistribution.forEach(row => {
      console.log(`  ${row.mes}: ${row.total} transações`);
    });
    
    console.log("\n📋 Verificando datas das transações (date) de cartão 1...\n");
    
    // Check date distribution
    const [dateDistribution] = await targetConn.execute(
      "SELECT DATE_FORMAT(date, '%Y-%m') as mes, COUNT(*) as total FROM creditCardTransactions WHERE cardId = 1 GROUP BY DATE_FORMAT(date, '%Y-%m')"
    );
    
    console.log("Distribuição por date:");
    dateDistribution.forEach(row => {
      console.log(`  ${row.mes}: ${row.total} transações`);
    });
    
    await targetConn.end();
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
}

checkDates();
