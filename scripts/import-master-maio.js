/**
 * import-master-maio.js
 *
 * Importa a fatura do Mastercard Black Itaú com vencimento 06/05/2026.
 * Classifica cada transação em:
 *   - À vista       (installments = 1)
 *   - Parcelada     (installments > 1, currentInstallment = X extraído da descrição)
 *   - Crédito/Estorno (amount < 0)
 * Atribui categoria via regras do banco + fallback por palavra-chave.
 * NENHUMA linha é descartada — inclusive PAGAMENTO EFETUADO.
 *
 * Como rodar:
 *   DATABASE_URL="mysql://root:SENHA@HOST:3306/tio_patinhas" node scripts/import-master-maio.js
 */

'use strict';
const mysql = require('mysql2/promise');

// ─── Dados da fatura (CSV completo) ──────────────────────────────────────────
const CSV_ROWS = [
  { date: '2026-04-28', description: 'IOF COMPRA INTERNACIONA',        amount:    4.06 },
  { date: '2026-04-27', description: 'CLAUDE.AI SUBSCRIPTION',         amount:  116.63 },
  { date: '2026-04-23', description: 'PETRA BRONZE',                   amount:  320.00 },
  { date: '2026-04-20', description: 'Microsoft*Microsoft 36',         amount:   12.00 },
  { date: '2026-04-19', description: 'ENJOEI *Gabriela S01/04',        amount:  970.44 },
  { date: '2026-04-16', description: 'PETRA BRONZE',                   amount:  100.00 },
  { date: '2026-04-16', description: 'PETRA BRONZE',                   amount:  130.00 },
  { date: '2026-04-16', description: 'FARM ECOMMERCE CM',              amount: -181.92 },
  { date: '2026-04-16', description: 'SALAO ESTRELA BARRA',            amount:   34.00 },
  { date: '2026-04-15', description: 'ENJOEI *Gabriel fidele',         amount:-3788.70 },
  { date: '2026-04-12', description: 'PETRA BRONZE-CT',                amount:   30.00 },
  { date: '2026-04-11', description: 'MP *MERCAPAGOHRJO',              amount:  170.00 },
  { date: '2026-04-11', description: 'ALECRIM PRESENTES',              amount:  270.00 },
  { date: '2026-04-11', description: 'BARRARTE',                       amount:   12.00 },
  { date: '2026-04-10', description: 'CAFFEINE',                       amount:  288.78 },
  { date: '2026-04-09', description: 'ESTORNO CUSTO DE IOF',           amount:  -78.68 },
  { date: '2026-04-08', description: 'MANUS AI* TRIAL OVER',           amount:-2247.75 },
  { date: '2026-04-07', description: 'SALAO ESTRELA BARRA',            amount:   70.00 },
  { date: '2026-04-07', description: 'SHOPEE *SHPSTECNOLOGIA',         amount:   91.08 },
  { date: '2026-04-07', description: 'EC *SAMSUNG       01/18',        amount:  450.50 },
  { date: '2026-04-06', description: 'PAGAMENTO EFETUADO',             amount:-10530.54},
  { date: '2026-04-05', description: 'HNT LOJA - A015 - BARR',         amount:  165.50 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi08/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi03/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi09/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi04/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi07/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi02/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi10/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi05/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'IOF COMPRA INTERNACIONA',        amount:   79.77 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi06/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'ENJUPAY*Gabriel fi01/10',        amount:  378.87 },
  { date: '2026-04-04', description: 'IOF COMPRA INTERNACIONA',        amount:    0.49 },
  { date: '2026-04-03', description: 'MANUS AI* TRIAL OVER',           amount: 2279.56 },
  { date: '2026-04-03', description: 'MP *CLQE',                       amount:   35.00 },
  { date: '2026-04-03', description: 'IONOS Inc. K315321862/',         amount:   13.73 },
  { date: '2026-04-01', description: 'UAZAPI - API WHATSAPP',          amount:   29.00 },
  { date: '2026-04-01', description: 'DONA',                           amount:   45.00 },
  { date: '2026-03-31', description: 'IOF COMPRA INTERNACIONA',        amount:   24.03 },
  { date: '2026-03-30', description: 'hostinger.com',                  amount:  686.42 },
  { date: '2026-03-27', description: 'HMBRASIL    *HMBRA02/03',        amount:  144.90 },
  { date: '2026-03-17', description: 'EBN    *AMAZON RETAIL',          amount:  -77.22 },
  { date: '2026-03-11', description: 'DROGARIAS PACHECO 02/03',        amount:  397.33 },
  { date: '2026-03-11', description: 'DROGARIAS PACHECO',              amount:   -0.04 },
  { date: '2026-03-10', description: 'SAMSUNG NO ITAU',                amount:   -0.20 },
  { date: '2026-03-10', description: 'SAMSUNG NO ITAU   02/21',        amount:   95.20 },
  { date: '2026-01-26', description: 'SAMSUNG NO ITAU   04/21',        amount:   69.00 },
  { date: '2026-01-15', description: 'PG *DROGARAIA     04/06',        amount:   92.38 },
  { date: '2025-10-07', description: 'enjoei.com.br     07/10',        amount:  470.05 },
  { date: '2025-07-16', description: 'ITAUSHOP          10/15',        amount:  826.30 },
  { date: '2024-10-02', description: 'SAMSUNG           19/21',        amount:   17.10 },
  { date: '2024-09-30', description: 'SAMSUNG           19/21',        amount:  200.00 },
];

const DUE_DATE   = '2026-05-06';       // vencimento do cartão
const DATABASE_URL = process.env.DATABASE_URL ||
  'mysql://root:tiopatinhas2024@34.39.196.13:3306/tio_patinhas';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDbUrl(url) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error('DATABASE_URL inválida');
  return { user: m[1], password: m[2], host: m[3], port: parseInt(m[4]), database: m[5] };
}

/**
 * Detecta parcela no padrão NN/NN ao final da descrição.
 * Ex: "SAMSUNG NO ITAU   02/21"  → { current:2, total:21 }
 *     "ENJUPAY*Gabriel fi08/10"  → { current:8, total:10 }
 *     "IONOS Inc. K315321862/"   → null  (sem dígitos após a barra)
 */
function detectInstallment(desc) {
  const m = desc.match(/(\d{1,2})\/(\d{2})\s*$/);
  if (!m) return null;
  const current = parseInt(m[1], 10);
  const total   = parseInt(m[2], 10);
  return (total > 1 && current >= 1 && current <= total) ? { current, total } : null;
}

/** Aplica as regras de categorização do banco (mesma lógica do servidor). */
function applyRules(desc, rules) {
  const sorted = [...rules].sort((a, b) =>
    b.priority !== a.priority ? b.priority - a.priority
      : new Date(a.createdAt) - new Date(b.createdAt)
  );
  for (const rule of sorted) {
    let kws;
    try { kws = JSON.parse(rule.keywords); } catch { kws = [rule.keywords]; }
    for (const kw of kws) {
      const src = rule.caseSensitive ? desc : desc.toLowerCase();
      const pat = rule.caseSensitive ? kw   : kw.toLowerCase();
      const hit = rule.matchType === 'exact'      ? src === pat
                : rule.matchType === 'startsWith' ? src.startsWith(pat)
                : rule.matchType === 'endsWith'   ? src.endsWith(pat)
                : src.includes(pat);
      if (hit) return rule.categoryId;
    }
  }
  return null;
}

/** Fallback: mapeamento por palavra-chave → fragmento de nome de categoria. */
const KW_MAP = [
  { kws: ['ifood','caffeine','restaurante','lanche','pizza','dona ','barrarte'], cats: ['alimenta','comida','refeic','restaur'] },
  { kws: ['wellhub','academia','gym','fitness','smartfit'],                      cats: ['saúde','saude','sport','bem-estar'] },
  { kws: ['farmacia','farmácia','drogar','drogaria','remedio','pacheco','drogaraia','pg *drogar'], cats: ['saúde','saude','farmac','medicam'] },
  { kws: ['claude.ai','anthropic','manus ai','microsoft','ionos','hostinger','uazapi','subscription'], cats: ['assinatura','subscr','tecnolog','servic','digital'] },
  { kws: ['shopee','amazon','enjoei','enjupay','mercapago','mp *','itaushop','hnt loja','alecrim'], cats: ['compra','shopping','market','present'] },
  { kws: ['farm ecomm','hmbrasil'],                                              cats: ['vestuário','vestuario','roupa','moda'] },
  { kws: ['petra bronze','petra bronze-ct','salao','salão','cabeler','beleza','bronze'], cats: ['beleza','pessoal','estetica','estética'] },
  { kws: ['iof compra','estorno custo de iof','pagamento efetuado'],             cats: ['imposto','tax','iof','pagamento','financ'] },
  { kws: ['estorno','farm ecommerce cm','ebn    *amazon','amazon retail'],       cats: ['estorno','reembolso','devolu'] },
  { kws: ['samsung','ec *samsung'],                                              cats: ['eletrônic','eletronic','tecnolog','compra'] },
  { kws: ['mp *clqe'],                                                           cats: ['servic','outros'] },
];

function fallbackCat(desc, categories) {
  const d = desc.toLowerCase();
  for (const { kws, cats } of KW_MAP) {
    if (kws.some(k => d.includes(k.toLowerCase()))) {
      for (const frag of cats) {
        const found = categories.find(c => c.name.toLowerCase().includes(frag));
        if (found) return found.id;
      }
    }
  }
  return null;
}

function toMySQLDate(str) {
  // "2026-04-28" → Date object → MySQL timestamp
  return new Date(str + 'T12:00:00Z');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cfg  = parseDbUrl(DATABASE_URL);
  const conn = await mysql.createConnection({ ...cfg, connectTimeout: 15000 });
  console.log(`\n✅ Conectado a ${cfg.host}/${cfg.database}`);

  // Carregar categorias e regras
  const [categories] = await conn.execute('SELECT id, name, type FROM categories ORDER BY name');
  const [rules]      = await conn.execute(
    'SELECT id, categoryId, keywords, matchType, caseSensitive, priority, enabled, createdAt FROM categorizationRules WHERE enabled = 1 ORDER BY priority DESC'
  );
  console.log(`Categorias: ${categories.length}  |  Regras: ${rules.length}`);

  // Imprimir categorias disponíveis
  console.log('\n── Categorias disponíveis ──');
  categories.forEach(c => console.log(`  [${c.id}] ${c.name} (${c.type})`));

  // Encontrar o Mastercard Black (venc. dia 6)
  const [cards] = await conn.execute('SELECT id, name, brand, dueDay FROM creditCards ORDER BY id');
  console.log('\n── Cartões ──');
  cards.forEach(c => console.log(`  [${c.id}] ${c.name} (${c.brand}) venc. dia ${c.dueDay}`));

  const card = cards.find(c =>
    c.dueDay === 6 ||
    c.brand.toLowerCase().includes('master') ||
    c.name.toLowerCase().includes('master') ||
    c.name.toLowerCase().includes('black')
  );
  if (!card) {
    console.error('\n❌ Mastercard não encontrado!');
    await conn.end(); process.exit(1);
  }
  console.log(`\n✅ Mastercard identificado: [${card.id}] ${card.name}`);

  // Verificar se já há transações de Maio/2026 para este cartão
  const [existing] = await conn.execute(
    `SELECT COUNT(*) AS n FROM creditCardTransactions WHERE cardId = ? AND YEAR(dueDate) = 2026 AND MONTH(dueDate) = 5`,
    [card.id]
  );
  if (existing[0].n > 0) {
    console.log(`\n⚠️  Já existem ${existing[0].n} transações em Maio/2026 para este cartão.`);
    console.log('   Deletando todas antes de reimportar...');
    await conn.execute(
      `DELETE FROM creditCardTransactions WHERE cardId = ? AND YEAR(dueDate) = 2026 AND MONTH(dueDate) = 5`,
      [card.id]
    );
    console.log('   ✅ Deletadas.');
  }

  // Obter userId do cartão
  const [[cardFull]] = await conn.execute('SELECT userId FROM creditCards WHERE id = ?', [card.id]);
  const userId = cardFull.userId;

  // ─── Inserir transações ───────────────────────────────────────────────────
  console.log(`\n── Importando ${CSV_ROWS.length} transações ──`);

  let countVista     = 0;
  let countParcelada = 0;
  let countCredito   = 0;
  let countSemCat    = 0;

  for (const row of CSV_ROWS) {
    const inst    = detectInstallment(row.description);
    const catId   = applyRules(row.description, rules) || fallbackCat(row.description, categories);
    const isCredit = row.amount < 0;

    const installments       = inst ? inst.total   : 1;
    const currentInstallment = inst ? inst.current : 1;

    // Classificação para log
    let tipo;
    if (isCredit)       { tipo = '💳 CRÉDITO '; countCredito++;   }
    else if (inst)      { tipo = `📦 ${inst.current}/${inst.total}`; countParcelada++; }
    else                { tipo = '🔵 À VISTA  '; countVista++;    }

    const catName = catId ? (categories.find(c => c.id === catId)?.name ?? `id:${catId}`) : '❌ SEM CATEGORIA';
    if (!catId) countSemCat++;

    console.log(`  ${tipo} | ${row.date} | R$${String(row.amount).padStart(10)} | ${row.description.padEnd(35)} | ${catName}`);

    await conn.execute(
      `INSERT INTO creditCardTransactions
         (userId, cardId, categoryId, description, amount, date, dueDate, installments, currentInstallment, paid, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        userId,
        card.id,
        catId ?? null,
        row.description,
        row.amount,
        toMySQLDate(row.date),
        toMySQLDate(DUE_DATE),
        installments,
        currentInstallment,
      ]
    );
  }

  // ─── Resumo ───────────────────────────────────────────────────────────────
  const total = CSV_ROWS.reduce((s, r) => s + r.amount, 0);
  const debitos = CSV_ROWS.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const creditos = CSV_ROWS.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  RESUMO DA IMPORTAÇÃO                                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Total de linhas importadas:   ${String(CSV_ROWS.length).padStart(4)}                  ║`);
  console.log(`║  🔵 À vista:                  ${String(countVista).padStart(4)}                  ║`);
  console.log(`║  📦 Parceladas:               ${String(countParcelada).padStart(4)}                  ║`);
  console.log(`║  💳 Créditos/Estornos:        ${String(countCredito).padStart(4)}                  ║`);
  console.log(`║  ❌ Sem categoria (manual):   ${String(countSemCat).padStart(4)}                  ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Total débitos:   R$ ${String(debitos.toFixed(2)).padStart(12)}              ║`);
  console.log(`║  Total créditos:  R$ ${String(creditos.toFixed(2)).padStart(12)}              ║`);
  console.log(`║  Saldo líquido:   R$ ${String(total.toFixed(2)).padStart(12)}              ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  await conn.end();
  console.log('✅ Importação concluída!\n');
}

main().catch(e => { console.error('\n❌ ERRO:', e.message); process.exit(1); });
