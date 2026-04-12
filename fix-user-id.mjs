import mysql from "mysql2/promise";

const TARGET_DB = process.env.DATABASE_URL;

async function fixUserIds() {
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
    
    // Get the current user ID
    const [users] = await conn.execute(
      "SELECT id, openId, name FROM users WHERE openId = 'bxmachado' LIMIT 1"
    );
    
    if (users.length === 0) {
      console.log("Usuário não encontrado");
      await conn.end();
      return;
    }
    
    const currentUserId = users[0].id;
    console.log(`Usuário atual ID: ${currentUserId}, OpenID: ${users[0].openId}, Name: ${users[0].name}`);
    
    // Update all transactions with wrong userId
    const [result] = await conn.execute(
      "UPDATE creditCardTransactions SET userId = ? WHERE userId = 270515",
      [currentUserId]
    );
    
    console.log(`Atualizadas ${result.affectedRows} transações de cartão de crédito`);
    
    await conn.end();
  } catch (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

fixUserIds();
