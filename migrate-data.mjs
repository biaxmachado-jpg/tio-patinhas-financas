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

// Conexão com banco novo (usar variável de ambiente DATABASE_URL)
const targetDatabaseUrl = process.env.DATABASE_URL;
if (!targetDatabaseUrl) {
  console.error('Erro: DATABASE_URL nao definida. Configure a variavel de ambiente.');
  process.exit(1);
}

async function migrateData() {
  let sourceConnection;
  let targetConnection;

  try {
    console.log('Conectando ao banco de dados original...');
    sourceConnection = await mysql.createConnection(sourceConfig);
    console.log('Conectado ao banco original');

    console.log('Conectando ao banco de dados novo...');
    targetConnection = await mysql.createConnection(targetDatabaseUrl);
    console.log('Conectado ao banco novo');

    // Desabilitar foreign key checks temporariamente
    await targetConnection.execute('SET FOREIGN_KEY_CHECKS=0');

    // 1. Migrar usuários
    console.log('\nMigrando usuarios...');
    const [users] = await sourceConnection.execute('SELECT * FROM users');
    if (users.length > 0) {
      for (const user of users) {
        await targetConnection.execute(
          `INSERT INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=?, email=?, loginMethod=?, role=?, updatedAt=?, lastSignedIn=?`,
          [
            user.id, user.openId, user.name, user.email, user.loginMethod, user.role, user.createdAt, user.updatedAt, user.lastSignedIn,
            user.name, user.email, user.loginMethod, user.role, user.updatedAt, user.lastSignedIn
          ]
        );
      }
      console.log(`OK: ${users.length} usuarios migrados`);
    }

    // 2. Migrar categorias
    console.log('Migrando categorias...');
    const [categories] = await sourceConnection.execute('SELECT * FROM categories');
    if (categories.length > 0) {
      for (const category of categories) {
        await targetConnection.execute(
          `INSERT INTO categories (id, userId, name, type, color, icon, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=?, type=?, color=?, icon=?, updatedAt=?`,
          [
            category.id, category.userId, category.name, category.type, category.color, category.icon, category.createdAt, category.updatedAt,
            category.name, category.type, category.color, category.icon, category.updatedAt
          ]
        );
      }
      console.log(`OK: ${categories.length} categorias migradas`);
    }

    // 3. Migrar contas bancárias
    console.log('Migrando contas bancarias...');
    const [bankAccounts] = await sourceConnection.execute('SELECT * FROM bankAccounts');
    if (bankAccounts.length > 0) {
      for (const account of bankAccounts) {
        await targetConnection.execute(
          `INSERT INTO bankAccounts (id, userId, name, bank, accountNumber, balance, initialBalance, finalBalance, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=?, bank=?, accountNumber=?, balance=?, initialBalance=?, finalBalance=?, updatedAt=?`,
          [
            account.id, account.userId, account.name, account.bank, account.accountNumber, account.balance, account.initialBalance, account.finalBalance, account.createdAt, account.updatedAt,
            account.name, account.bank, account.accountNumber, account.balance, account.initialBalance, account.finalBalance, account.updatedAt
          ]
        );
      }
      console.log(`OK: ${bankAccounts.length} contas bancarias migradas`);
    }

    // 4. Migrar cartoes de credito
    console.log('Migrando cartoes de credito...');
    const [creditCards] = await sourceConnection.execute('SELECT * FROM creditCards');
    if (creditCards.length > 0) {
      for (const card of creditCards) {
        await targetConnection.execute(
          `INSERT INTO creditCards (id, userId, name, brand, \`limit\`, dueDay, closingDay, color, lastFourDigits, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=?, brand=?, \`limit\`=?, dueDay=?, closingDay=?, color=?, lastFourDigits=?, updatedAt=?`,
          [
            card.id, card.userId, card.name, card.brand, card.limit, card.dueDay, card.closingDay, card.color, card.lastFourDigits, card.createdAt, card.updatedAt,
            card.name, card.brand, card.limit, card.dueDay, card.closingDay, card.color, card.lastFourDigits, card.updatedAt
          ]
        );
      }
      console.log(`OK: ${creditCards.length} cartoes de credito migrados`);
    }

    // 5. Migrar transações
    console.log('Migrando transacoes...');
    const [transactions] = await sourceConnection.execute('SELECT * FROM transactions');
    if (transactions.length > 0) {
      for (const transaction of transactions) {
        await targetConnection.execute(
          `INSERT INTO transactions (id, userId, categoryId, accountId, type, description, amount, date, notes, reconciled, reconciledAt, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE categoryId=?, accountId=?, type=?, description=?, amount=?, date=?, notes=?, reconciled=?, reconciledAt=?, updatedAt=?`,
          [
            transaction.id, transaction.userId, transaction.categoryId, transaction.accountId, transaction.type, transaction.description, transaction.amount, transaction.date, transaction.notes, transaction.reconciled, transaction.reconciledAt, transaction.createdAt, transaction.updatedAt,
            transaction.categoryId, transaction.accountId, transaction.type, transaction.description, transaction.amount, transaction.date, transaction.notes, transaction.reconciled, transaction.reconciledAt, transaction.updatedAt
          ]
        );
      }
      console.log(`OK: ${transactions.length} transacoes migradas`);
    }

    // 6. Migrar transações de cartão de crédito
    console.log('Migrando transacoes de cartao de credito...');
    const [creditCardTransactions] = await sourceConnection.execute('SELECT * FROM creditCardTransactions');
    if (creditCardTransactions.length > 0) {
      for (const cctx of creditCardTransactions) {
        await targetConnection.execute(
          `INSERT INTO creditCardTransactions (id, userId, cardId, categoryId, description, amount, date, dueDate, installments, currentInstallment, paid, paidAt, notes, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE categoryId=?, description=?, amount=?, date=?, dueDate=?, installments=?, currentInstallment=?, paid=?, paidAt=?, notes=?, updatedAt=?`,
          [
            cctx.id, cctx.userId, cctx.cardId, cctx.categoryId, cctx.description, cctx.amount, cctx.date, cctx.dueDate, cctx.installments, cctx.currentInstallment, cctx.paid, cctx.paidAt, cctx.notes, cctx.createdAt, cctx.updatedAt,
            cctx.categoryId, cctx.description, cctx.amount, cctx.date, cctx.dueDate, cctx.installments, cctx.currentInstallment, cctx.paid, cctx.paidAt, cctx.notes, cctx.updatedAt
          ]
        );
      }
      console.log(`OK: ${creditCardTransactions.length} transacoes de cartao migradas`);
    }

    // 7. Migrar orcamentos
    console.log('Migrando orcamentos...');
    const [budgets] = await sourceConnection.execute('SELECT * FROM budgets');
    if (budgets.length > 0) {
      for (const budget of budgets) {
        await targetConnection.execute(
          `INSERT INTO budgets (id, userId, categoryId, month, year, \`limit\`, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`limit\`=?, updatedAt=?`,
          [
            budget.id, budget.userId, budget.categoryId, budget.month, budget.year, budget.limit, budget.createdAt, budget.updatedAt,
            budget.limit, budget.updatedAt
          ]
        );
      }
      console.log(`OK: ${budgets.length} orcamentos migrados`);
    }

    // 8. Migrar regras de categorização
    console.log('Migrando regras de categorizacao...');
    const [rules] = await sourceConnection.execute('SELECT * FROM categorizationRules');
    if (rules.length > 0) {
      for (const rule of rules) {
        await targetConnection.execute(
          `INSERT INTO categorizationRules (id, userId, categoryId, keywords, matchType, caseSensitive, priority, enabled, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE categoryId=?, keywords=?, matchType=?, caseSensitive=?, priority=?, enabled=?, updatedAt=?`,
          [
            rule.id, rule.userId, rule.categoryId, rule.keywords, rule.matchType, rule.caseSensitive, rule.priority, rule.enabled, rule.createdAt, rule.updatedAt,
            rule.categoryId, rule.keywords, rule.matchType, rule.caseSensitive, rule.priority, rule.enabled, rule.updatedAt
          ]
        );
      }
      console.log(`OK: ${rules.length} regras de categorizacao migradas`);
    }

    // Reabilitar foreign key checks
    await targetConnection.execute('SET FOREIGN_KEY_CHECKS=1');

    console.log('\nSUCESSO: Migracao concluida!');
    console.log('\nResumo:');
    console.log(`  Usuarios: ${users.length}`);
    console.log(`  Categorias: ${categories.length}`);
    console.log(`  Contas bancarias: ${bankAccounts.length}`);
    console.log(`  Cartoes de credito: ${creditCards.length}`);
    console.log(`  Transacoes: ${transactions.length}`);
    console.log(`  Transacoes de cartao: ${creditCardTransactions.length}`);
    console.log(`  Orcamentos: ${budgets.length}`);
    console.log(`  Regras de categorizacao: ${rules.length}`);

  } catch (error) {
    console.error('ERRO durante migracao:', error.message);
    process.exit(1);
  } finally {
    if (sourceConnection) await sourceConnection.end();
    if (targetConnection) await targetConnection.end();
  }
}

migrateData();
