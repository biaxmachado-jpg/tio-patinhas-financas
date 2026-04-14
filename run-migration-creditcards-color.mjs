/**
 * Script para adicionar o campo 'color' à tabela creditCards
 * Execute: DATABASE_URL="..." node run-migration-creditcards-color.mjs
 */
import mysql from "mysql2/promise";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida");
  process.exit(1);
}

const pool = mysql.createPool(connectionString);

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log("Verificando se a coluna 'color' já existe em creditCards...");
    
    const [rows] = await conn.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'creditCards' 
        AND COLUMN_NAME = 'color'
    `);

    if (rows.length > 0) {
      console.log("✅ Coluna 'color' já existe em creditCards. Nada a fazer.");
    } else {
      console.log("Adicionando coluna 'color' à tabela creditCards...");
      await conn.execute(`
        ALTER TABLE creditCards 
        ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#3b82f6'
      `);
      console.log("✅ Coluna 'color' adicionada com sucesso!");
    }
  } catch (err) {
    console.error("❌ Erro:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
