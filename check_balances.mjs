import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL);

async function checkBalances() {
  const connection = await pool.getConnection();
  try {
    // Check monthly balances for account 60001 (Itaú)
    const [balances] = await connection.query(
      'SELECT * FROM monthlyBalances WHERE accountId = 60001 ORDER BY year, month'
    );
    console.log('Monthly Balances for Itaú (60001):');
    console.log(JSON.stringify(balances, null, 2));
  } finally {
    connection.release();
  }
  pool.end();
}

checkBalances().catch(console.error);
