import mysql from "mysql2/promise";

async function remap() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log("🔄 Remapeando dados de userId 270515 para userId 1...");
    
    // Update categories
    await conn.execute("UPDATE categories SET userId = 1 WHERE userId = 270515");
    const [catResult] = await conn.execute("SELECT ROW_COUNT() as count");
    console.log(`✓ ${catResult[0]?.count || 0} categorias remapeadas`);
    
    // Update bank accounts
    await conn.execute("UPDATE bankAccounts SET userId = 1 WHERE userId = 270515");
    const [accResult] = await conn.execute("SELECT ROW_COUNT() as count");
    console.log(`✓ ${accResult[0]?.count || 0} contas remapeadas`);
    
    // Update credit cards
    await conn.execute("UPDATE creditCards SET userId = 1 WHERE userId = 270515");
    const [cardResult] = await conn.execute("SELECT ROW_COUNT() as count");
    console.log(`✓ ${cardResult[0]?.count || 0} cartões remapeados`);
    
    // Update transactions
    await conn.execute("UPDATE transactions SET userId = 1 WHERE userId = 270515");
    const [transResult] = await conn.execute("SELECT ROW_COUNT() as count");
    console.log(`✓ ${transResult[0]?.count || 0} transações remapeadas`);
    
    // Update credit card transactions
    await conn.execute("UPDATE creditCardTransactions SET userId = 1 WHERE userId = 270515");
    const [cardTransResult] = await conn.execute("SELECT ROW_COUNT() as count");
    console.log(`✓ ${cardTransResult[0]?.count || 0} transações de cartão remapeadas`);
    
    // Update budgets
    await conn.execute("UPDATE budgets SET userId = 1 WHERE userId = 270515");
    const [budgetResult] = await conn.execute("SELECT ROW_COUNT() as count");
    console.log(`✓ ${budgetResult[0]?.count || 0} orçamentos remapeados`);
    
    console.log("\n✅ Remapeamento concluído!");
    
  } catch (error) {
    console.error("❌ Erro:", error.message);
  } finally {
    await conn.end();
  }
}

remap();
