import mysql from 'mysql2/promise';

async function fixDueDate() {
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

    console.log('=== FIXING DUEDATE ===');
    
    // Update all transactions with null dueDate to use date value
    const [result] = await connection.query(
      'UPDATE creditCardTransactions SET dueDate = date WHERE dueDate IS NULL'
    );

    console.log(`✅ Updated ${result.affectedRows} transactions`);

    // Verify
    const [verify] = await connection.query(
      'SELECT COUNT(*) as count FROM creditCardTransactions WHERE dueDate IS NULL'
    );
    console.log(`Transactions with null dueDate: ${verify[0].count}`);

    // Check card 360002 transactions now
    console.log('\n=== CARD 360002 TRANSACTIONS AFTER FIX ===');
    const [txs] = await connection.query(
      'SELECT id, date, dueDate, description FROM creditCardTransactions WHERE cardId = 360002'
    );
    txs.forEach(tx => {
      console.log(`${tx.id}: ${tx.description} - dueDate: ${tx.dueDate}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

fixDueDate();
