import mysql from "mysql2/promise";

const SOURCE_DB = "mysql://SXZBwBvNV6ZYPrS.root:K9c4zpA6LklZos77tk3e@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/ESS7XAEQ98H8rmWRqEpy3z?ssl={\"rejectUnauthorized\":true}";
const TARGET_DB = process.env.DATABASE_URL;

async function importData() {
  let sourceConn, targetConn;
  
  try {
    console.log("🔄 Conectando aos bancos de dados...");
    
    const sourceUrl = new URL(SOURCE_DB);
    const targetUrl = new URL(TARGET_DB);
    
    sourceConn = await mysql.createConnection({
      host: sourceUrl.hostname,
      port: sourceUrl.port,
      user: sourceUrl.username,
      password: sourceUrl.password,
      database: sourceUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    });
    
    targetConn = await mysql.createConnection({
      host: targetUrl.hostname,
      port: targetUrl.port,
      user: targetUrl.username,
      password: targetUrl.password,
      database: targetUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    });
    
    console.log("✓ Conectado aos bancos de dados");
    
    // Get all credit card transactions from source
    console.log("📋 Buscando transações de cartão de crédito...");
    const [cardTransactions] = await sourceConn.execute("SELECT * FROM creditCardTransactions ORDER BY id");
    console.log(`Encontradas ${cardTransactions.length} transações de cartão`);
    
    // Delete existing credit card transactions in target
    console.log("🗑️ Limpando transações de cartão no banco de dados alvo...");
    await targetConn.execute("DELETE FROM creditCardTransactions");
    console.log("✓ Transações deletadas");
    
    // Import transactions
    console.log("📥 Importando transações de cartão de crédito...");
    let imported = 0;
    let failed = 0;
    
    for (const ct of cardTransactions) {
      try {
        const values = [
          ct.id,
          ct.userId,
          ct.cardId,
          ct.categoryId,
          ct.description || '',
          ct.amount,
          ct.date,
          ct.dueDate || null,
          ct.installments || 1,
          ct.currentInstallment || 1,
          ct.paid ? 1 : 0,
          ct.paidAt || null,
          ct.notes || null,
          ct.createdAt,
          ct.updatedAt
        ];
        
        await targetConn.execute(
          "INSERT INTO creditCardTransactions (id, userId, cardId, categoryId, description, amount, date, dueDate, installments, currentInstallment, paid, paidAt, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          values
        );
        imported++;
      } catch (error) {
        console.log(`❌ Erro ao importar transação ${ct.id}: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`✓ ${imported} transações importadas com sucesso`);
    if (failed > 0) {
      console.log(`⚠️ ${failed} transações falharam`);
    }
    
    // Print summary
    console.log("\n📊 Resumo por cardId:");
    const [summary] = await targetConn.execute("SELECT cardId, COUNT(*) as count FROM creditCardTransactions GROUP BY cardId");
    summary.forEach(row => {
      console.log(`  Cartão ${row.cardId}: ${row.count} transações`);
    });
    
    console.log("\n✅ Importação concluída!");
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  } finally {
    if (sourceConn) await sourceConn.end();
    if (targetConn) await targetConn.end();
  }
}

importData();
