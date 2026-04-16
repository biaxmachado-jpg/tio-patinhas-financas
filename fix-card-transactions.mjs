import mysql from 'mysql2/promise';

async function fixCardTransactions() {
  let connection;
  try {
    // Get database connection from environment
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set');
    }

    // Parse connection string
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

    // Step 1: Find the correct card ID for Bradesco (lastFourDigits = 0002)
    console.log('\nStep 1: Finding correct card ID for Bradesco...');
    const [cards] = await connection.query(
      'SELECT id, lastFourDigits FROM creditCards WHERE lastFourDigits = ?',
      ['0002']
    );

    if (cards.length === 0) {
      console.log('No card found with lastFourDigits = 0002');
      return;
    }

    const correctCardId = cards[0].id;
    console.log(`Found card ID: ${correctCardId} (lastFourDigits: ${cards[0].lastFourDigits})`);

    // Step 2: Check how many transactions have wrong cardId
    console.log('\nStep 2: Checking transactions with cardId = 360002...');
    const [wrongTransactions] = await connection.query(
      'SELECT COUNT(*) as count FROM creditCardTransactions WHERE cardId = 360002'
    );

    const wrongCount = wrongTransactions[0].count;
    console.log(`Found ${wrongCount} transactions with wrong cardId`);

    if (wrongCount === 0) {
      console.log('No transactions to fix!');
      return;
    }

    // Step 3: Update transactions with correct cardId
    console.log(`\nStep 3: Updating transactions to cardId = ${correctCardId}...`);
    const [result] = await connection.query(
      'UPDATE creditCardTransactions SET cardId = ? WHERE cardId = 360002',
      [correctCardId]
    );

    console.log(`✅ Updated ${result.affectedRows} transactions!`);

    // Step 4: Verify the update
    console.log('\nStep 4: Verifying update...');
    const [verifyWrong] = await connection.query(
      'SELECT COUNT(*) as count FROM creditCardTransactions WHERE cardId = 360002'
    );
    const [verifyCorrect] = await connection.query(
      'SELECT COUNT(*) as count FROM creditCardTransactions WHERE cardId = ?',
      [correctCardId]
    );

    console.log(`Transactions with cardId = 360002: ${verifyWrong[0].count}`);
    console.log(`Transactions with cardId = ${correctCardId}: ${verifyCorrect[0].count}`);

    console.log('\n✅ Fix completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixCardTransactions();
