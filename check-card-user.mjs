import mysql from 'mysql2/promise';

async function checkCardUser() {
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

    console.log('=== ALL CREDIT CARDS ===');
    const [allCards] = await connection.query('SELECT id, userId, lastFourDigits FROM creditCards ORDER BY id');
    allCards.forEach(card => {
      console.log(`ID: ${card.id}, userId: ${card.userId}, Last 4: ${card.lastFourDigits}`);
    });

    console.log('\n=== USERS ===');
    const [users] = await connection.query('SELECT id, name FROM users');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}`);
    });

    console.log('\n=== TRANSACTIONS FOR CARD 360002 ===');
    const [txs] = await connection.query('SELECT id, userId, cardId, description, amount FROM creditCardTransactions WHERE cardId = 360002 LIMIT 5');
    txs.forEach(tx => {
      console.log(`ID: ${tx.id}, userId: ${tx.userId}, cardId: ${tx.cardId}, desc: ${tx.description}, amount: ${tx.amount}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkCardUser();
