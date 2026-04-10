import mysql from 'mysql2/promise';

// Conexao com banco original
const sourceConfig = {
  host: 'gateway05.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'SXZBwBvNV6ZYPrS.root',
  password: 'K9c4zpA6LklZos77tk3e',
  database: 'ESS7XAEQ98H8rmWRqEpy3z',
  ssl: { rejectUnauthorized: true },
};

// Conexao com banco novo (usar variavel de ambiente DATABASE_URL)
const targetDatabaseUrl = process.env.DATABASE_URL;
if (!targetDatabaseUrl) {
  console.error('Erro: DATABASE_URL nao definida. Configure a variavel de ambiente.');
  process.exit(1);
}

async function validateMigration() {
  let sourceConnection;
  let targetConnection;
  let allValid = true;

  try {
    console.log('Conectando aos bancos de dados...\n');
    sourceConnection = await mysql.createConnection(sourceConfig);
    targetConnection = await mysql.createConnection(targetDatabaseUrl);

    const tables = ['users', 'categories', 'bankAccounts', 'creditCards', 'transactions', 'creditCardTransactions', 'budgets', 'categorizationRules'];
    
    console.log('Validando contagem de registros por tabela:\n');
    
    for (const table of tables) {
      const [sourceCount] = await sourceConnection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const [targetCount] = await targetConnection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      
      const sourceTotal = sourceCount[0].count;
      const targetTotal = targetCount[0].count;
      const match = sourceTotal === targetTotal;
      
      const status = match ? 'OK' : 'ERRO';
      console.log(`${table.padEnd(30)} | Source: ${sourceTotal.toString().padStart(5)} | Target: ${targetTotal.toString().padStart(5)} | ${status}`);
      
      if (!match) {
        allValid = false;
      }
    }

    console.log('\nValidando integridade referencial:\n');

    // Validar transacoes com categoryId valido
    const [invalidTransactionCategories] = await targetConnection.execute(
      'SELECT COUNT(*) as count FROM transactions t WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.categoryId)'
    );
    if (invalidTransactionCategories[0].count > 0) {
      console.log(`ERRO: ${invalidTransactionCategories[0].count} transacoes com categoryId invalido`);
      allValid = false;
    } else {
      console.log('OK: Todas as transacoes tem categoryId valido');
    }

    // Validar transacoes com accountId valido
    const [invalidTransactionAccounts] = await targetConnection.execute(
      'SELECT COUNT(*) as count FROM transactions t WHERE NOT EXISTS (SELECT 1 FROM bankAccounts a WHERE a.id = t.accountId)'
    );
    if (invalidTransactionAccounts[0].count > 0) {
      console.log(`ERRO: ${invalidTransactionAccounts[0].count} transacoes com accountId invalido`);
      allValid = false;
    } else {
      console.log('OK: Todas as transacoes tem accountId valido');
    }

    // Validar transacoes de cartao com categoryId valido
    const [invalidCCTXCategories] = await targetConnection.execute(
      'SELECT COUNT(*) as count FROM creditCardTransactions t WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.categoryId)'
    );
    if (invalidCCTXCategories[0].count > 0) {
      console.log(`ERRO: ${invalidCCTXCategories[0].count} transacoes de cartao com categoryId invalido`);
      allValid = false;
    } else {
      console.log('OK: Todas as transacoes de cartao tem categoryId valido');
    }

    // Validar transacoes de cartao com cardId valido
    const [invalidCCTXCards] = await targetConnection.execute(
      'SELECT COUNT(*) as count FROM creditCardTransactions t WHERE NOT EXISTS (SELECT 1 FROM creditCards c WHERE c.id = t.cardId)'
    );
    if (invalidCCTXCards[0].count > 0) {
      console.log(`ERRO: ${invalidCCTXCards[0].count} transacoes de cartao com cardId invalido`);
      allValid = false;
    } else {
      console.log('OK: Todas as transacoes de cartao tem cardId valido');
    }

    // Validar orcamentos com categoryId valido
    const [invalidBudgetCategories] = await targetConnection.execute(
      'SELECT COUNT(*) as count FROM budgets b WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = b.categoryId)'
    );
    if (invalidBudgetCategories[0].count > 0) {
      console.log(`ERRO: ${invalidBudgetCategories[0].count} orcamentos com categoryId invalido`);
      allValid = false;
    } else {
      console.log('OK: Todos os orcamentos tem categoryId valido');
    }

    // Validar regras com categoryId valido
    const [invalidRuleCategories] = await targetConnection.execute(
      'SELECT COUNT(*) as count FROM categorizationRules r WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = r.categoryId)'
    );
    if (invalidRuleCategories[0].count > 0) {
      console.log(`ERRO: ${invalidRuleCategories[0].count} regras com categoryId invalido`);
      allValid = false;
    } else {
      console.log('OK: Todas as regras tem categoryId valido');
    }

    console.log('\n' + '='.repeat(80));
    if (allValid) {
      console.log('SUCESSO: Migracao validada com sucesso! Todos os dados estao integros.');
    } else {
      console.log('ERRO: Foram encontrados problemas na migracao. Verifique os erros acima.');
      process.exit(1);
    }

  } catch (error) {
    console.error('ERRO durante validacao:', error.message);
    process.exit(1);
  } finally {
    if (sourceConnection) await sourceConnection.end();
    if (targetConnection) await targetConnection.end();
  }
}

validateMigration();
