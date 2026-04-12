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
      "SELECT DATE_FORMAT(dueDate, '%Y-%m') as mes, COUNT(*) as total FROM creditCardTransactions WHERE cardId = 1 GROUP BY DATE_FORMAT(dueDate, '%Y-%m') ORDER BY dueDate DESC LIMIT 10"
    );
    
    console.log("Distribuição por dueDate:");
    dueDateDistribution.forEach(row => {
      console.log(`  ${row.mes}: ${row.total} transações`);
    });
    
    console.log("\n📋 Verificando datas das transações (date) de cartão 1...\n");
    
    // Check date distribution
    const [dateDistribution] = await targetConn.execute(
      "SELECT DATE_FORMAT(date, '%Y-%m') as mes, COUNT(*) as total FROM creditCardTransactions WHERE cardId = 1 GROUP BY DATE_FORMAT(date, '%Y-%m') ORDER BY date DESC LIMIT 10"
    );
    
    console.log("Distribuição por date:");
    dateDistribution.forEach(row => {
      console.log(`  ${row.mes}: ${row.total} transações`);
    });
    
    console.log("\n📋 Primeiras 5 transações com dueDate em 2026-04...\n");
    const [aprilTransactions] = await targetConn.execute(
      "SELECT id, description, date, dueDate, amount, installments FROM creditCardTransactions WHERE cardId = 1 AND DATE_FORMAT(dueDate, '%Y-%m') = '2026-04' LIMIT 5"
    );
    
    if (aprilTransactions.length === 0) {
      console.log("Nenhuma transação com dueDate em 2026-04");
      
      console.log("\n📋 Primeiras 5 transações com date em 2026-04...\n");
      const [aprilByDate] = await targetConn.execute(
        "SELECT id, description, date, dueDate, amount, installments FROM creditCardTransactions WHERE cardId = 1 AND DATE_FORMAT(date, '%Y-%m') = '2026-04' LIMIT 5"
      );
      
      aprilByDate.forEach(row => {
        console.log(`  ID: ${row.id}, Date: ${row.date}, DueDate: ${row.dueDate}, Desc: ${row.description}`);
      });
    } else {
      aprilTransactions.forEach(row => {
        console.log(`  ID: ${row.id}, Date: ${row.date}, DueDate: ${row.dueDate}, Desc: ${row.description}`);
      });
    }
    
    await targetConn.end();
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
}

checkDates();
