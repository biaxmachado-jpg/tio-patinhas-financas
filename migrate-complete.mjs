import mysql from "mysql2/promise";

const SOURCE_DB = "mysql://SXZBwBvNV6ZYPrS.root:K9c4zpA6LklZos77tk3e@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/ESS7XAEQ98H8rmWRqEpy3z?ssl={\"rejectUnauthorized\":true}";
const TARGET_DB = process.env.DATABASE_URL;

async function migrate() {
  let sourceConn, targetConn;
  
  try {
    console.log("🔄 Conectando aos bancos de dados...");
    
    // Parse URLs
    const sourceUrl = new URL(SOURCE_DB);
    const targetUrl = new URL(TARGET_DB);
    
    sourceConn = await mysql.createConnection({
      host: sourceUrl.hostname,
      port: sourceUrl.port,
      user: sourceUrl.username,
      password: sourceUrl.password,
      database: sourceUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    });
    
    targetConn = await mysql.createConnection({
      host: targetUrl.hostname,
      port: targetUrl.port,
      user: targetUrl.username,
      password: targetUrl.password,
      database: targetUrl.pathname.slice(1),
      ssl: { rejectUnauthorized: false }
    });
    
    console.log("✓ Conectado aos bancos de dados");
    
    // Migrate users
    console.log("📋 Migrando usuários...");
    const [users] = await sourceConn.execute("SELECT * FROM users");
    if (users.length > 0) {
      for (const user of users) {
        await targetConn.execute(
          "INSERT INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, email=?, role=?, updatedAt=?, lastSignedIn=?",
          [user.id, user.openId, user.name, user.email, user.loginMethod, user.role, user.createdAt, user.updatedAt, user.lastSignedIn, user.name, user.email, user.role, user.updatedAt, user.lastSignedIn]
        );
      }
      console.log(`✓ ${users.length} usuários migrados`);
    }
    
    // Migrate categories
    console.log("📋 Migrando categorias...");
    const [categories] = await sourceConn.execute("SELECT * FROM categories");
    if (categories.length > 0) {
      for (const cat of categories) {
        await targetConn.execute(
          "INSERT INTO categories (id, userId, name, type, color, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, type=?, color=?, icon=?, updatedAt=?",
          [cat.id, cat.userId, cat.name, cat.type, cat.color, cat.icon, cat.createdAt, cat.updatedAt, cat.name, cat.type, cat.color, cat.icon, cat.updatedAt]
        );
      }
      console.log(`✓ ${categories.length} categorias migradas`);
    }
    
    // Migrate bank accounts
    console.log("📋 Migrando contas bancárias...");
    const [accounts] = await sourceConn.execute("SELECT * FROM bankAccounts");
    if (accounts.length > 0) {
      for (const acc of accounts) {
        await targetConn.execute(
          "INSERT INTO bankAccounts (id, userId, name, bank, accountNumber, balance, finalBalance, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, bank=?, accountNumber=?, balance=?, finalBalance=?, updatedAt=?",
          [acc.id, acc.userId, acc.name, acc.bank, acc.accountNumber, acc.balance, acc.finalBalance, acc.createdAt, acc.updatedAt, acc.name, acc.bank, acc.accountNumber, acc.balance, acc.finalBalance, acc.updatedAt]
        );
      }
      console.log(`✓ ${accounts.length} contas bancárias migradas`);
    }
    
    // Migrate credit cards
    console.log("📋 Migrando cartões de crédito...");
    const [cards] = await sourceConn.execute("SELECT * FROM creditCards");
    if (cards.length > 0) {
      for (const card of cards) {
        await targetConn.execute(
          "INSERT INTO creditCards (id, userId, name, lastFourDigits, `limit`, closingDay, dueDay, brand, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, lastFourDigits=?, `limit`=?, closingDay=?, dueDay=?, brand=?, updatedAt=?",
          [card.id, card.userId, card.name, card.lastFourDigits, card.limit, card.closingDay, card.dueDay, card.brand || 'Visa', card.createdAt, card.updatedAt, card.name, card.lastFourDigits, card.limit, card.closingDay, card.dueDay, card.brand || 'Visa', card.updatedAt]
        );
      }
      console.log(`✓ ${cards.length} cartões de crédito migrados`);
    }
    
    // Migrate transactions
    console.log("📋 Migrando transações...");
    const [transactions] = await sourceConn.execute("SELECT * FROM transactions");
    if (transactions.length > 0) {
      for (const trans of transactions) {
        await targetConn.execute(
          "INSERT INTO transactions (id, userId, accountId, categoryId, type, amount, description, date, reconciled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=?, description=?, date=?, reconciled=?, updatedAt=?",
          [trans.id, trans.userId, trans.accountId, trans.categoryId, trans.type, trans.amount, trans.description, trans.date, trans.reconciled, trans.createdAt, trans.updatedAt, trans.amount, trans.description, trans.date, trans.reconciled, trans.updatedAt]
        );
      }
      console.log(`✓ ${transactions.length} transações migradas`);
    }
    
    // Migrate credit card transactions
    console.log("📋 Migrando transações de cartão de crédito...");
    try {
      const [cardTransactions] = await sourceConn.execute("SELECT * FROM creditCardTransactions");
      if (cardTransactions.length > 0) {
        for (const ct of cardTransactions) {
          const categoryId = ct.categoryId === undefined ? null : ct.categoryId;
          const description = ct.description === undefined ? '' : ct.description;
          const installment = ct.installment === undefined ? 1 : ct.installment;
          const totalInstallments = ct.totalInstallments === undefined ? 1 : ct.totalInstallments;
          const reconciled = ct.reconciled === undefined ? 0 : ct.reconciled;
          
          await targetConn.execute(
            "INSERT INTO creditCardTransactions (id, userId, creditCardId, categoryId, amount, description, transactionDate, installment, totalInstallments, reconciled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=?, description=?, transactionDate=?, installment=?, totalInstallments=?, reconciled=?, updatedAt=?",
            [ct.id, ct.userId, ct.creditCardId, categoryId, ct.amount, description, ct.transactionDate, installment, totalInstallments, reconciled, ct.createdAt, ct.updatedAt, ct.amount, description, ct.transactionDate, installment, totalInstallments, reconciled, ct.updatedAt]
          );
        }
        console.log(`✓ ${cardTransactions.length} transações de cartão migradas`);
      }
    } catch (error) {
      console.log(`⚠️ Aviso: Erro ao migrar transações de cartão (tabela pode não existir): ${error.message}`);
    }
    
    // Migrate budgets
    console.log("📋 Migrando orçamentos...");
    const [budgets] = await sourceConn.execute("SELECT * FROM budgets");
    if (budgets.length > 0) {
      for (const budget of budgets) {
        await targetConn.execute(
          "INSERT INTO budgets (id, userId, categoryId, month, year, `limit`, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `limit`=?, updatedAt=?",
          [budget.id, budget.userId, budget.categoryId, budget.month, budget.year, budget.limit, budget.createdAt, budget.updatedAt, budget.limit, budget.updatedAt]
        );
      }
      console.log(`✓ ${budgets.length} orçamentos migrados`);
    }
    
    console.log("\n✅ Migração concluída com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro durante migração:", error.message);
    process.exit(1);
  } finally {
    if (sourceConn) await sourceConn.end();
    if (targetConn) await targetConn.end();
  }
}

migrate();
