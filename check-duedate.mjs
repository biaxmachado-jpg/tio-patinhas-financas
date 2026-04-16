import mysql from 'mysql2/promise';

async function checkDueDate() {
  let connection;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');

    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.hostname.includes('tidbcloud') || url.hostname.includes('rds') ? { rejectUnauthorized: false } : undefined,
    };

    connection = await mysql.createConnection(config);

    console.log('=== TRANSACTIONS FOR CARD 360002 ===');
    const [txs] = await connection.query(
      'SELECT id, date, dueDate, description FROM creditCardTransactions WHERE cardId = 360002'
    );
    txs.forEach(tx => {
      console.log(`ID: ${tx.id}`);
      console.log(`  date: ${tx.date}`);
      console.log(`  dueDate: ${tx.dueDate}`);
      console.log(`  description: ${tx.description}`);
    });

    console.log('\n=== CHECKING FILTER ===');
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    console.log(`Current month/year: ${month}/${year}`);

    const [filtered] = await connection.query(
      `SELECT id, date, dueDate, description FROM creditCardTransactions 
       WHERE cardId = 360002 AND userId = 1 
       AND YEAR(dueDate) = ? AND MONTH(dueDate) = ?`,
      [year, month]
    );
    console.log(`Transactions matching current month filter: ${filtered.length}`);
    filtered.forEach(tx => {
      console.log(`  ${tx.id}: ${tx.description}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkDueDate();
