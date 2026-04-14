import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: url.searchParams.get('ssl') ? JSON.parse(url.searchParams.get('ssl')) : undefined,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
});

try {
  console.log('Executando migração: ALTER TABLE `categories` DROP COLUMN `order`');
  await connection.query('ALTER TABLE `categories` DROP COLUMN `order`');
  console.log('✅ Migração executada com sucesso!');
} catch (error) {
  if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
    console.log('ℹ️  Coluna `order` já foi removida anteriormente');
  } else {
    console.error('❌ Erro:', error.message);
  }
} finally {
  await connection.end();
}
