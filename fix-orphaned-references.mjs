import mysql from 'mysql2/promise';

const targetDatabaseUrl = process.env.DATABASE_URL;
if (!targetDatabaseUrl) {
  console.error('Erro: DATABASE_URL nao definida.');
  process.exit(1);
}

async function fixOrphanedReferences() {
  let targetConnection;

  try {
    console.log('Conectando ao banco de dados...');
    targetConnection = await mysql.createConnection(targetDatabaseUrl);
    console.log('Conectado\n');

    // Encontrar uma categoria padrão para cada tipo
    const [expenseCategories] = await targetConnection.execute(
      "SELECT id FROM categories WHERE type = 'expense' LIMIT 1"
    );
    const [incomeCategories] = await targetConnection.execute(
      "SELECT id FROM categories WHERE type = 'income' LIMIT 1"
    );

    if (expenseCategories.length === 0 || incomeCategories.length === 0) {
      console.error('Erro: Nao ha categorias de receita ou despesa no banco.');
      process.exit(1);
    }

    const expenseCategoryId = expenseCategories[0].id;
    const incomeCategoryId = incomeCategories[0].id;

    console.log(`Usando categoria de despesa padrão: ${expenseCategoryId}`);
    console.log(`Usando categoria de receita padrão: ${incomeCategoryId}\n`);

    // Corrigir transações com categoryId inválido
    console.log('Corrigindo transacoes com categoryId invalido...');
    
    // Encontrar transações com categoryId inválido
    const [invalidTransactions] = await targetConnection.execute(
      `SELECT id, type FROM transactions t 
       WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.categoryId)`
    );

    if (invalidTransactions.length > 0) {
      for (const tx of invalidTransactions) {
        const categoryId = tx.type === 'income' ? incomeCategoryId : expenseCategoryId;
        await targetConnection.execute(
          'UPDATE transactions SET categoryId = ? WHERE id = ?',
          [categoryId, tx.id]
        );
      }
      console.log(`  Corrigidas ${invalidTransactions.length} transacoes`);
    } else {
      console.log('  Nenhuma transacao invalida encontrada');
    }

    // Corrigir transações de cartão com categoryId inválido
    console.log('Corrigindo transacoes de cartao com categoryId invalido...');
    
    const [invalidCCTX] = await targetConnection.execute(
      `SELECT id FROM creditCardTransactions t 
       WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.categoryId)`
    );

    if (invalidCCTX.length > 0) {
      for (const cctx of invalidCCTX) {
        await targetConnection.execute(
          'UPDATE creditCardTransactions SET categoryId = ? WHERE id = ?',
          [expenseCategoryId, cctx.id]
        );
      }
      console.log(`  Corrigidas ${invalidCCTX.length} transacoes de cartao`);
    } else {
      console.log('  Nenhuma transacao de cartao invalida encontrada');
    }

    // Corrigir orçamentos com categoryId inválido
    console.log('Corrigindo orcamentos com categoryId invalido...');
    
    const [invalidBudgets] = await targetConnection.execute(
      `SELECT id FROM budgets b 
       WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = b.categoryId)`
    );

    if (invalidBudgets.length > 0) {
      for (const budget of invalidBudgets) {
        await targetConnection.execute(
          'UPDATE budgets SET categoryId = ? WHERE id = ?',
          [expenseCategoryId, budget.id]
        );
      }
      console.log(`  Corrigidos ${invalidBudgets.length} orcamentos`);
    } else {
      console.log('  Nenhum orcamento invalido encontrado');
    }

    console.log('\nSUCESSO: Todas as referencias orfas foram corrigidas!');

  } catch (error) {
    console.error('ERRO:', error.message);
    process.exit(1);
  } finally {
    if (targetConnection) await targetConnection.end();
  }
}

fixOrphanedReferences();
