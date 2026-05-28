/**
 * Script: fix-may-invoices.js
 *
 * O que faz:
 *  1. Conecta ao banco
 *  2. Exibe os cartões e categorias disponíveis
 *  3. Remove "PAGAMENTO EFETUADO" das faturas de Maio/2026
 *  4. Remove duplicatas (mesma data + descrição + valor no mesmo cartão)
 *  5. Detecta parcelas (padrão XX/YY no final da descrição)
 *  6. Atribui categoria usando as regras do banco + fallback por palavra-chave
 *  7. Imprime resumo do que foi feito
 *
 * Como rodar:
 *   DATABASE_URL="mysql://root:SENHA@HOST:3306/tio_patinhas" node scripts/fix-may-invoices.js
 *
 *   Ou com a variável já exportada:
 *   node scripts/fix-may-invoices.js
 */

const mysql = require('mysql2/promise');

// ─── Configuração ────────────────────────────────────────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'mysql://root:tiopatinhas2024@34.39.196.13:3306/tio_patinhas';

// Mês/ano da fatura a processar
const TARGET_MONTH = 5;
const TARGET_YEAR  = 2026;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDbUrl(url) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error('DATABASE_URL inválida');
  return { user: m[1], password: m[2], host: m[3], port: parseInt(m[4]), database: m[5] };
}

/**
 * Detecta parcelas no final da descrição.
 * Ex: "SAMSUNG NO ITAU   09/21"  →  { current: 9, total: 21 }
 *     "ENJUPAY*Gabriel fi03/10"  →  { current: 3, total: 10 }
 * Ignora: "IONOS Inc. K315321862/" (sem segundo número)
 */
function detectInstallment(description) {
  const m = description.match(/(\d{1,2})\/(\d{2})\s*$/);
  if (!m) return null;
  const current = parseInt(m[1]);
  const total   = parseInt(m[2]);
  if (total > 1 && current >= 1 && current <= total) return { current, total };
  return null;
}

/**
 * Tenta casar a descrição com as regras de categorização do banco
 * (mesma lógica do categorizationEngine.ts do servidor).
 */
function applyRules(description, rules) {
  const sorted = [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  for (const rule of sorted) {
    if (!rule.enabled) continue;
    let keywords;
    try { keywords = JSON.parse(rule.keywords); } catch { keywords = [rule.keywords]; }

    for (const kw of keywords) {
      const src = rule.caseSensitive ? description : description.toLowerCase();
      const pat = rule.caseSensitive ? kw : kw.toLowerCase();
      let match = false;

      switch (rule.matchType) {
        case 'contains':    match = src.includes(pat);      break;
        case 'exact':       match = src === pat;             break;
        case 'startsWith':  match = src.startsWith(pat);    break;
        case 'endsWith':    match = src.endsWith(pat);      break;
        default:            match = src.includes(pat);
      }
      if (match) return rule.categoryId;
    }
  }
  return null;
}

/**
 * Fallback: mapeamento por palavra-chave → trecho do nome de categoria.
 */
const KEYWORD_FALLBACK = [
  { kws: ['ifood', 'ifd*', 'caffeine', 'restaurante', 'lanche', 'pizza', 'burguer', 'dona '], cat: ['alimenta', 'comida', 'refeic'] },
  { kws: ['wellhub', 'academia', 'gym', 'fitness', 'smartfit', 'pilates'], cat: ['saúde', 'saude', 'sport', 'bem-estar'] },
  { kws: ['farmacia', 'farmácia', 'drogar', 'remedio', 'remédio', 'pacheco', 'drogaraia', 'pg *drogar'], cat: ['saúde', 'saude', 'farmac'] },
  { kws: ['manus ai', 'claude.ai', 'anthropic', 'openai', 'microsoft', 'ionos', 'hostinger', 'uazapi', 'subscription'], cat: ['assinatura', 'subscr', 'tecnolog', 'servic'] },
  { kws: ['shopee', 'amazon', 'enjoei', 'mercapago', 'mp *', 'itaushop', 'hnt loja', 'alecrim'], cat: ['compra', 'shopping', 'market'] },
  { kws: ['farm ecomm', 'hmbrasil', 'barrarte'], cat: ['vestuário', 'vestuario', 'roupa', 'moda'] },
  { kws: ['petra bronze', 'salao', 'salão', 'cabeler', 'beleza', 'estetc', 'bronze'], cat: ['beleza', 'pessoal', 'estetica', 'estética'] },
  { kws: ['iof compra', 'estorno custo de iof'], cat: ['imposto', 'tax', 'iof'] },
  { kws: ['estorno', 'farm ecommerce cm -', 'ebn    *amazon retail'], cat: ['estorno', 'reembolso'] },
  { kws: ['compra de pontos', 'milhas', 'pontos'], cat: ['viagem', 'milhas'] },
  { kws: ['samsung'], cat: ['tecnolog', 'eletronic', 'compra'] },
  { kws: ['enjupay', 'josimar', 'luciana fleury', 'mm*global'], cat: ['servic', 'outros'] },
];

function fallbackCategory(description, categories) {
  const desc = description.toLowerCase();
  for (const { kws, cat } of KEYWORD_FALLBACK) {
    if (kws.some(k => desc.includes(k.toLowerCase()))) {
      for (const fragment of cat) {
        const found = categories.find(c => c.name.toLowerCase().includes(fragment));
        if (found) return found.id;
      }
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cfg  = parseDbUrl(DATABASE_URL);
  const conn = await mysql.createConnection({ ...cfg, connectTimeout: 15000 });
  console.log(`\n✅ Conectado a ${cfg.host}/${cfg.database}\n`);

  // 1. Categorias e regras
  const [categories] = await conn.execute('SELECT id, name, type FROM categories ORDER BY name');
  const [rules]      = await conn.execute(
    'SELECT id, categoryId, keywords, matchType, caseSensitive, priority, enabled, createdAt FROM categorizationRules WHERE enabled = 1 ORDER BY priority DESC'
  );
  console.log(`Categorias carregadas: ${categories.length}`);
  console.log(`Regras de categorização: ${rules.length}\n`);

  // 2. Cartões
  const [cards] = await conn.execute('SELECT id, name, brand, dueDay FROM creditCards ORDER BY id');
  console.log('── Cartões no banco ──────────────────────────────────');
  cards.forEach(c => console.log(`  [${c.id}] ${c.name} (${c.brand}) venc. dia ${c.dueDay}`));

  // Identifica Visa e Mastercard pelas faturas enviadas (venc. 05 e 06 de Maio)
  const visaCard   = cards.find(c => c.dueDay === 5  || c.brand.toLowerCase().includes('visa')   || c.name.toLowerCase().includes('visa')   || c.name.toLowerCase().includes('latam'));
  const masterCard = cards.find(c => c.dueDay === 6  || c.brand.toLowerCase().includes('master') || c.name.toLowerCase().includes('master') || c.name.toLowerCase().includes('black'));

  if (!visaCard)   { console.error('\n❌ Visa não identificado! Ajuste a lógica de busca.'); await conn.end(); process.exit(1); }
  if (!masterCard) { console.error('\n❌ Mastercard não identificado! Ajuste a lógica de busca.'); await conn.end(); process.exit(1); }

  console.log(`\nVISA identificado:       [${visaCard.id}]   ${visaCard.name}`);
  console.log(`MASTERCARD identificado: [${masterCard.id}] ${masterCard.name}`);

  // 3. Buscar transações de Maio/2026 para os dois cartões
  const [txAll] = await conn.execute(
    `SELECT * FROM creditCardTransactions
     WHERE cardId IN (?, ?)
       AND YEAR(dueDate) = ? AND MONTH(dueDate) = ?
     ORDER BY cardId, date, description, amount`,
    [visaCard.id, masterCard.id, TARGET_YEAR, TARGET_MONTH]
  );

  console.log(`\n── Transações Maio/${TARGET_YEAR} encontradas: ${txAll.length} ─────────────`);
  txAll.forEach(t => {
    const cartao = t.cardId === visaCard.id ? 'VISA' : 'MASTER';
    console.log(`  [${t.id}] ${cartao} | ${String(t.date).substring(0,10)} | R$${t.amount} | ${t.description}`);
  });

  // 4. Remover "PAGAMENTO EFETUADO"
  const pagamentos = txAll.filter(t => t.description.trim().toUpperCase().startsWith('PAGAMENTO EFETUADO'));
  if (pagamentos.length > 0) {
    console.log(`\n── Removendo PAGAMENTO EFETUADO (${pagamentos.length}) ──`);
    for (const t of pagamentos) {
      await conn.execute('DELETE FROM creditCardTransactions WHERE id = ?', [t.id]);
      console.log(`  ❌ Deletado [${t.id}] ${t.description} R$${t.amount}`);
    }
  } else {
    console.log('\n── Sem PAGAMENTO EFETUADO para remover ✓');
  }

  // 5. Detectar e remover duplicatas
  // Duplicata = mesmo cardId + mesma data (dia) + mesma descrição + mesmo valor
  const remaining = txAll.filter(t => !pagamentos.find(p => p.id === t.id));
  const seen      = new Map();
  const toDelete  = [];

  for (const t of remaining) {
    const key = `${t.cardId}|${String(t.date).substring(0,10)}|${t.description.trim()}|${parseFloat(t.amount)}`;
    if (seen.has(key)) {
      toDelete.push(t);
    } else {
      seen.set(key, t);
    }
  }

  if (toDelete.length > 0) {
    console.log(`\n── Removendo duplicatas (${toDelete.length}) ──`);
    for (const t of toDelete) {
      await conn.execute('DELETE FROM creditCardTransactions WHERE id = ?', [t.id]);
      console.log(`  ❌ Duplicata deletada [${t.id}] ${t.description} R$${t.amount}`);
    }
  } else {
    console.log('\n── Sem duplicatas encontradas ✓');
  }

  // 6. Trabalhar com o que sobrou
  const active = remaining.filter(t => !toDelete.find(d => d.id === t.id));
  console.log(`\n── Classificando ${active.length} transações ──`);

  let updatedInstallments = 0;
  let updatedCategories   = 0;
  let skippedCategories   = 0;

  for (const t of active) {
    const updates = {};

    // 6a. Parcelas
    const inst = detectInstallment(t.description);
    if (inst && (t.installments !== inst.total || t.currentInstallment !== inst.current)) {
      updates.installments        = inst.total;
      updates.currentInstallment  = inst.current;
      updatedInstallments++;
    }

    // 6b. Categoria
    if (!t.categoryId) {
      const catId = applyRules(t.description, rules) || fallbackCategory(t.description, categories);
      if (catId) {
        updates.categoryId = catId;
        updatedCategories++;
      } else {
        skippedCategories++;
      }
    }

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
      const values     = [...Object.values(updates), t.id];
      await conn.execute(`UPDATE creditCardTransactions SET ${setClauses} WHERE id = ?`, values);

      const cartao = t.cardId === visaCard.id ? 'VISA' : 'MASTER';
      const instInfo = updates.installments ? ` [${updates.currentInstallment}/${updates.installments}]` : '';
      const catInfo  = updates.categoryId   ? ` cat→${updates.categoryId}` : '';
      console.log(`  ✅ [${t.id}] ${cartao} ${t.description}${instInfo}${catInfo}`);
    }
  }

  // 7. Resumo final
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  RESUMO                                              ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Total encontrado Maio/${TARGET_YEAR}:      ${String(txAll.length).padStart(4)}                  ║`);
  console.log(`║  PAGAMENTO EFETUADO removidos:    ${String(pagamentos.length).padStart(4)}                  ║`);
  console.log(`║  Duplicatas removidas:            ${String(toDelete.length).padStart(4)}                  ║`);
  console.log(`║  Parcelas detectadas/corrigidas:  ${String(updatedInstallments).padStart(4)}                  ║`);
  console.log(`║  Categorias atribuídas:           ${String(updatedCategories).padStart(4)}                  ║`);
  console.log(`║  Sem categoria (manual):          ${String(skippedCategories).padStart(4)}                  ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Exibir transações sem categoria para revisão manual
  if (skippedCategories > 0) {
    console.log('── Transações SEM categoria (revisar manualmente) ──');
    const semCat = active.filter(t => !t.categoryId);
    semCat.forEach(t => {
      const cartao = t.cardId === visaCard.id ? 'VISA' : 'MASTER';
      console.log(`  [${t.id}] ${cartao} | ${t.description} | R$${t.amount}`);
    });
  }

  await conn.end();
  console.log('✅ Concluído!\n');
}

main().catch(e => {
  console.error('\n❌ ERRO:', e.message);
  process.exit(1);
});
