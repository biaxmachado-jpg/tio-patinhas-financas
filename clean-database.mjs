import mysql from 'mysql2/promise';

const targetDatabaseUrl = process.env.DATABASE_URL;
if (!targetDatabaseUrl) {
  console.error('Erro: DATABASE_URL nao definida.');
  process.exit(1);
}

async function cleanDatabase() {
  let targetConnection;

  try {
    console.log('Conectando ao banco de dados...');
    targetConnection = await mysql.createConnection(targetDatabaseUrl);
    console.log('Conectado');

    console.log('\nLimpando tabelas...');
    
    // Desabilitar foreign key checks
    await targetConnection.execute('SET FOREIGN_KEY_CHECKS=0');

    const tables = [
      'creditCardTransactions',
      'transactions', 
      'categorizationRules',
      'budgets',
      'creditCards',
      'bankAccounts',
      'categories',
      'users'
    ];

    for (const table of tables) {
      await targetConnection.execute(`DELETE FROM ${table}`);
      console.log(`  Limpado: ${table}`);
    }

    // Reabilitar foreign key checks
    await targetConnection.execute('SET FOREIGN_KEY_CHECKS=1');

    console.log('\nSUCESSO: Banco de dados limpo!');

  } catch (error) {
    console.error('ERRO:', error.message);
    process.exit(1);
  } finally {
    if (targetConnection) await targetConnection.end();
  }
}

cleanDatabase();
