import mysql from "mysql2/promise";

const TARGET_DB = process.env.DATABASE_URL;

async function debug() {
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
    
    console.log("Testando query com datas de abril...\n");
    
    // Teste 1: Contar transações com dueDate em abril
    const [count] = await conn.execute(
      "SELECT COUNT(*) as total FROM creditCardTransactions WHERE cardId = 1 AND YEAR(dueDate) = 2026 AND MONTH(dueDate) = 4"
    );
    console.log(`Total com dueDate em abril/2026: ${count[0].total}`);
    
    // Teste 2: Ver as datas
    const [dates] = await conn.execute(
      "SELECT MIN(dueDate) as min_date, MAX(dueDate) as max_date FROM creditCardTransactions WHERE cardId = 1"
    );
    console.log(`Min dueDate: ${dates[0].min_date}`);
    console.log(`Max dueDate: ${dates[0].max_date}`);
    
    // Teste 3: Listar algumas transações de abril
    const [transactions] = await conn.execute(
      "SELECT id, description, amount, dueDate FROM creditCardTransactions WHERE cardId = 1 AND YEAR(dueDate) = 2026 AND MONTH(dueDate) = 4 LIMIT 3"
    );
    console.log(`\nPrimeiras 3 transações de abril:`);
    transactions.forEach(t => {
      console.log(`  ID: ${t.id}, Desc: ${t.description}, Amount: ${t.amount}, DueDate: ${t.dueDate}`);
    });
    
    await conn.end();
  } catch (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

debug();
