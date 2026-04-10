import mysql from "mysql2/promise";

const SOURCE_DB = "mysql://SXZBwBvNV6ZYPrS.root:K9c4zpA6LklZos77tk3e@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/ESS7XAEQ98H8rmWRqEpy3z?ssl={\"rejectUnauthorized\":true}";
const TARGET_DB = process.env.DATABASE_URL;

async function migrate() {
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
    const [cardTransactions] = await sourceConn.execute("SELECT * FROM creditCardTransactions");
    console.log(`Encontradas ${cardTransactions.length} transações de cartão`);
    
    if (cardTransactions.length > 0) {
      console.log("📋 Migrando transações de cartão de crédito...");
      let migrated = 0;
      let failed = 0;
      
      for (const ct of cardTransactions) {
        try {
          // Map original fields to new schema
          // Original: id, userId, cardId, categoryId, description, amount, date, dueDate, installments, currentInstallment, paid, paidAt, notes, createdAt, updatedAt
          // New: id, userId, creditCardId, categoryId, amount, description, transactionDate, installment, totalInstallments, reconciled, createdAt, updatedAt
          
          const values = [
            ct.id,
            ct.userId,
            ct.cardId, // Map cardId to creditCardId
            ct.categoryId,
            ct.amount,
            ct.description || '',
            ct.date, // Map date to transactionDate
            ct.installments || 1, // Map installments to totalInstallments
            ct.currentInstallment || 1, // Map currentInstallment to installment
            ct.paid ? 1 : 0, // Map paid to reconciled
            ct.createdAt,
            ct.updatedAt,
            // UPDATE values
            ct.amount,
            ct.description || '',
            ct.date,
            ct.installments || 1,
            ct.currentInstallment || 1,
            ct.paid ? 1 : 0,
            ct.updatedAt
          ];
          
          // Verify no undefined values
          if (values.some(v => v === undefined)) {
            console.log(`⚠️ Pulando transação ${ct.id} - valores undefined`);
            failed++;
            continue;
          }
          
          await targetConn.execute(
            "INSERT INTO creditCardTransactions (id, userId, creditCardId, categoryId, amount, description, transactionDate, totalInstallments, installment, reconciled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=?, description=?, transactionDate=?, totalInstallments=?, installment=?, reconciled=?, updatedAt=?",
            values
          );
          migrated++;
        } catch (error) {
          console.log(`❌ Erro ao migrar transação ${ct.id}: ${error.message}`);
          failed++;
        }
      }
      
      console.log(`✓ ${migrated} transações de cartão migradas com sucesso`);
      if (failed > 0) {
        console.log(`⚠️ ${failed} transações falharam`);
      }
    }
    
    console.log("\n✅ Migração de transações de cartão concluída!");
    
  } catch (error) {
    console.error("❌ Erro durante migração:", error.message);
    process.exit(1);
  } finally {
    if (sourceConn) await sourceConn.end();
    if (targetConn) await targetConn.end();
  }
}

migrate();
