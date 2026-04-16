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

    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);

    // Get card details
    const [cards] = await connection.query(
      'SELECT id, closingDay, dueDay FROM creditCards WHERE lastFourDigits = ?',
      ['2643']
    );

    if (!cards || cards.length === 0) {
      console.log('Card not found');
      return;
    }

    const card = cards[0];
    console.log('Card found:', card);

    // Get all transactions for this card
    const [transactions] = await connection.query(
      'SELECT id, date FROM creditCardTransactions WHERE cardId = ?',
      [card.id]
    );

    console.log('Found', transactions.length, 'transactions');

    // Update each transaction with correct dueDate
    for (const tx of transactions) {
      const txDate = new Date(tx.date);
      const txDay = txDate.getDate();
      const txMonth = txDate.getMonth();
      const txYear = txDate.getFullYear();

      let dueDate;
      if (txDay >= card.closingDay) {
        // Transaction is in next billing cycle
        dueDate = new Date(txYear, txMonth + 1, card.dueDay);
      } else {
        // Transaction is in current billing cycle
        dueDate = new Date(txYear, txMonth, card.dueDay);
      }

      console.log(`TX ${tx.id}: ${tx.date.toISOString().split('T')[0]} → ${dueDate.toISOString().split('T')[0]}`);

      await connection.query(
        'UPDATE creditCardTransactions SET dueDate = ? WHERE id = ?',
        [dueDate, tx.id]
      );
    }

    console.log('✅ All transactions updated!');

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixDueDate();
