import mysql from 'mysql2/promise';

async function listCards() {
  let connection;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set');
    }

    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.hostname.includes('tidbcloud') || url.hostname.includes('rds') ? { rejectUnauthorized: false } : undefined,
    };

    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);

    console.log('\n=== CREDIT CARDS ===');
    const [cards] = await connection.query('SELECT id, lastFourDigits FROM creditCards ORDER BY id');
    cards.forEach(card => {
      console.log(`ID: ${card.id}, Last 4: ${card.lastFourDigits}`);
    });

    console.log('\n=== TRANSACTIONS WITH WRONG CARDID ===');
    const [wrongTx] = await connection.query(
      'SELECT DISTINCT cardId FROM creditCardTransactions WHERE cardId > 100 ORDER BY cardId'
    );
    wrongTx.forEach(tx => {
      console.log(`cardId: ${tx.cardId}`);
    });

    console.log('\n=== TRANSACTIONS COUNT BY CARDID ===');
    const [counts] = await connection.query(
      'SELECT cardId, COUNT(*) as count FROM creditCardTransactions GROUP BY cardId ORDER BY cardId'
    );
    counts.forEach(row => {
      console.log(`cardId: ${row.cardId}, count: ${row.count}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

listCards();
