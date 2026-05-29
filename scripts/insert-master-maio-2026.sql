-- ══════════════════════════════════════════════════════════════════════════════
-- MASTERCARD BLACK ITAÚ — FATURA MAIO/2026 (vencimento 06/05/2026)
-- Execute no Cloud SQL Studio → instância MySQL (tio-patinhas)
-- Banco: tio_patinhas
--
-- cardId = 1   (Master Black Itaú, dueDay = 6)
-- userId = 1   (Bia Machado)
-- dueDate = '2026-05-06'
--
-- Categorias usadas:
--   120016 = Assinaturas
--   120011 = Beleza
--   120012 = Médicos / Farmácia
--   1050004 = Alimentação
--   720006 = Outras compras / Presente
--   720003 = Vendas / Reembolso  (créditos e estornos)
--   420002 = Roupas
--   300016 = Taxas / Impostos    (IOF)
--   300017 = Fatura Cartão       (PAGAMENTO EFETUADO)
-- ══════════════════════════════════════════════════════════════════════════════

START TRANSACTION;

-- ─── 1. Limpar transações de Maio/2026 já existentes para o Master Black ───
DELETE FROM creditCardTransactions
WHERE cardId = 1
  AND YEAR(dueDate) = 2026
  AND MONTH(dueDate) = 5;

-- ─── 2. Confirmar limpeza ───────────────────────────────────────────────────
SELECT COUNT(*) AS deve_ser_zero
FROM creditCardTransactions
WHERE cardId = 1 AND YEAR(dueDate) = 2026 AND MONTH(dueDate) = 5;

-- ─── 3. Inserir as 53 transações ───────────────────────────────────────────
-- Colunas:
--   userId, cardId, categoryId, description, amount,
--   date, dueDate, installments, currentInstallment, paid,
--   createdAt, updatedAt
--
-- Legenda de tipo:
--   VISTA    = à vista (installments=1, currentInstallment=1)
--   PARC X/Y = parcelada (installments=Y, currentInstallment=X)
--   CREDIT   = crédito / estorno (amount negativo)

INSERT INTO creditCardTransactions
  (userId, cardId, categoryId, description, amount,
   `date`, dueDate, installments, currentInstallment, paid,
   createdAt, updatedAt)
VALUES
  -- [01] VISTA  | 300016 Taxas/Impostos
  (1, 1, 300016, 'IOF COMPRA INTERNACIONA',          4.06,    '2026-04-28', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [02] VISTA  | 120016 Assinaturas
  (1, 1, 120016, 'CLAUDE.AI SUBSCRIPTION',         116.63,    '2026-04-27', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [03] VISTA  | 120011 Beleza
  (1, 1, 120011, 'PETRA BRONZE',                   320.00,    '2026-04-23', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [04] VISTA  | 120016 Assinaturas
  (1, 1, 120016, 'Microsoft*Microsoft 36',           12.00,    '2026-04-20', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [05] PARC 1/4 | 720006 Outras compras
  (1, 1, 720006, 'ENJOEI *Gabriela S01/04',         970.44,    '2026-04-19', '2026-05-06', 4,  1,  0, NOW(), NOW()),
  -- [06] VISTA  | 120011 Beleza
  (1, 1, 120011, 'PETRA BRONZE',                   100.00,    '2026-04-16', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [07] VISTA  | 120011 Beleza
  (1, 1, 120011, 'PETRA BRONZE',                   130.00,    '2026-04-16', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [08] CREDIT | 720003 Vendas/Reembolso
  (1, 1, 720003, 'FARM ECOMMERCE CM',             -181.92,    '2026-04-16', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [09] VISTA  | 120011 Beleza
  (1, 1, 120011, 'SALAO ESTRELA BARRA',             34.00,    '2026-04-16', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [10] CREDIT | 720003 Vendas/Reembolso
  (1, 1, 720003, 'ENJOEI *Gabriel fidele',        -3788.70,    '2026-04-15', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [11] VISTA  | 120011 Beleza
  (1, 1, 120011, 'PETRA BRONZE-CT',                 30.00,    '2026-04-12', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [12] VISTA  | 720006 Outras compras
  (1, 1, 720006, 'MP *MERCAPAGOHRJO',              170.00,    '2026-04-11', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [13] VISTA  | 720006 Outras compras / Presente
  (1, 1, 720006, 'ALECRIM PRESENTES',              270.00,    '2026-04-11', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [14] VISTA  | 1050004 Alimentação
  (1, 1, 1050004,'BARRARTE',                        12.00,    '2026-04-11', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [15] VISTA  | 1050004 Alimentação
  (1, 1, 1050004,'CAFFEINE',                       288.78,    '2026-04-10', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [16] CREDIT | 300016 Taxas/Impostos (estorno de IOF)
  (1, 1, 300016, 'ESTORNO CUSTO DE IOF',           -78.68,    '2026-04-09', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [17] CREDIT | 720003 Vendas/Reembolso
  (1, 1, 720003, 'MANUS AI* TRIAL OVER',         -2247.75,    '2026-04-08', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [18] VISTA  | 120011 Beleza
  (1, 1, 120011, 'SALAO ESTRELA BARRA',             70.00,    '2026-04-07', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [19] VISTA  | 720006 Outras compras
  (1, 1, 720006, 'SHOPEE *SHPSTECNOLOGIA',          91.08,    '2026-04-07', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [20] PARC 1/18 | 720006 Outras compras
  (1, 1, 720006, 'EC *SAMSUNG       01/18',        450.50,    '2026-04-07', '2026-05-06', 18, 1,  0, NOW(), NOW()),
  -- [21] CREDIT | 300017 Fatura Cartão
  (1, 1, 300017, 'PAGAMENTO EFETUADO',          -10530.54,    '2026-04-06', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [22] VISTA  | 720006 Outras compras
  (1, 1, 720006, 'HNT LOJA - A015 - BARR',        165.50,    '2026-04-05', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [23] PARC 8/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi08/10',        378.87,    '2026-04-04', '2026-05-06', 10, 8,  0, NOW(), NOW()),
  -- [24] PARC 3/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi03/10',        378.87,    '2026-04-04', '2026-05-06', 10, 3,  0, NOW(), NOW()),
  -- [25] PARC 9/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi09/10',        378.87,    '2026-04-04', '2026-05-06', 10, 9,  0, NOW(), NOW()),
  -- [26] PARC 4/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi04/10',        378.87,    '2026-04-04', '2026-05-06', 10, 4,  0, NOW(), NOW()),
  -- [27] PARC 7/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi07/10',        378.87,    '2026-04-04', '2026-05-06', 10, 7,  0, NOW(), NOW()),
  -- [28] PARC 2/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi02/10',        378.87,    '2026-04-04', '2026-05-06', 10, 2,  0, NOW(), NOW()),
  -- [29] PARC 10/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi10/10',        378.87,    '2026-04-04', '2026-05-06', 10, 10, 0, NOW(), NOW()),
  -- [30] PARC 5/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi05/10',        378.87,    '2026-04-04', '2026-05-06', 10, 5,  0, NOW(), NOW()),
  -- [31] VISTA  | 300016 Taxas/Impostos
  (1, 1, 300016, 'IOF COMPRA INTERNACIONA',         79.77,    '2026-04-04', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [32] PARC 6/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi06/10',        378.87,    '2026-04-04', '2026-05-06', 10, 6,  0, NOW(), NOW()),
  -- [33] PARC 1/10 | 720006 Outras compras
  (1, 1, 720006, 'ENJUPAY*Gabriel fi01/10',        378.87,    '2026-04-04', '2026-05-06', 10, 1,  0, NOW(), NOW()),
  -- [34] VISTA  | 300016 Taxas/Impostos
  (1, 1, 300016, 'IOF COMPRA INTERNACIONA',          0.49,    '2026-04-04', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [35] VISTA  | 120016 Assinaturas (cobrança que veio depois do trial)
  (1, 1, 120016, 'MANUS AI* TRIAL OVER',          2279.56,    '2026-04-03', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [36] VISTA  | 720006 Outras compras
  (1, 1, 720006, 'MP *CLQE',                        35.00,    '2026-04-03', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [37] VISTA  | 120016 Assinaturas
  (1, 1, 120016, 'IONOS Inc. K315321862/',           13.73,    '2026-04-03', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [38] VISTA  | 120016 Assinaturas
  (1, 1, 120016, 'UAZAPI - API WHATSAPP',            29.00,    '2026-04-01', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [39] VISTA  | 1050004 Alimentação
  (1, 1, 1050004,'DONA',                             45.00,    '2026-04-01', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [40] VISTA  | 300016 Taxas/Impostos
  (1, 1, 300016, 'IOF COMPRA INTERNACIONA',          24.03,    '2026-03-31', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [41] VISTA  | 120016 Assinaturas
  (1, 1, 120016, 'hostinger.com',                  686.42,    '2026-03-30', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [42] PARC 2/3 | 420002 Roupas
  (1, 1, 420002, 'HMBRASIL    *HMBRA02/03',        144.90,    '2026-03-27', '2026-05-06', 3,  2,  0, NOW(), NOW()),
  -- [43] CREDIT | 720003 Vendas/Reembolso
  (1, 1, 720003, 'EBN    *AMAZON RETAIL',           -77.22,    '2026-03-17', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [44] PARC 2/3 | 120012 Médicos/Farmácia
  (1, 1, 120012, 'DROGARIAS PACHECO 02/03',        397.33,    '2026-03-11', '2026-05-06', 3,  2,  0, NOW(), NOW()),
  -- [45] CREDIT | 720003 Vendas/Reembolso (centavos de diferença na farmácia)
  (1, 1, 720003, 'DROGARIAS PACHECO',               -0.04,    '2026-03-11', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [46] CREDIT | 720003 Vendas/Reembolso
  (1, 1, 720003, 'SAMSUNG NO ITAU',                 -0.20,    '2026-03-10', '2026-05-06', 1,  1,  0, NOW(), NOW()),
  -- [47] PARC 2/21 | 720006 Outras compras
  (1, 1, 720006, 'SAMSUNG NO ITAU   02/21',         95.20,    '2026-03-10', '2026-05-06', 21, 2,  0, NOW(), NOW()),
  -- [48] PARC 4/21 | 720006 Outras compras
  (1, 1, 720006, 'SAMSUNG NO ITAU   04/21',         69.00,    '2026-01-26', '2026-05-06', 21, 4,  0, NOW(), NOW()),
  -- [49] PARC 4/6 | 120012 Médicos/Farmácia
  (1, 1, 120012, 'PG *DROGARAIA     04/06',         92.38,    '2026-01-15', '2026-05-06', 6,  4,  0, NOW(), NOW()),
  -- [50] PARC 7/10 | 720006 Outras compras
  (1, 1, 720006, 'enjoei.com.br     07/10',        470.05,    '2025-10-07', '2026-05-06', 10, 7,  0, NOW(), NOW()),
  -- [51] PARC 10/15 | 720006 Outras compras
  (1, 1, 720006, 'ITAUSHOP          10/15',        826.30,    '2025-07-16', '2026-05-06', 15, 10, 0, NOW(), NOW()),
  -- [52] PARC 19/21 | 720006 Outras compras
  (1, 1, 720006, 'SAMSUNG           19/21',         17.10,    '2024-10-02', '2026-05-06', 21, 19, 0, NOW(), NOW()),
  -- [53] PARC 19/21 | 720006 Outras compras
  (1, 1, 720006, 'SAMSUNG           19/21',        200.00,    '2024-09-30', '2026-05-06', 21, 19, 0, NOW(), NOW());

-- ─── 4. Confirmar inserção ──────────────────────────────────────────────────
SELECT
  COUNT(*)                                                   AS total_inserido,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)           AS total_debitos,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)           AS total_creditos,
  SUM(amount)                                                AS saldo_liquido
FROM creditCardTransactions
WHERE cardId = 1
  AND YEAR(dueDate) = 2026
  AND MONTH(dueDate) = 5;

-- Esperado:
--   total_inserido = 53
--   total_debitos  ≈  9826.04
--   total_creditos ≈ -16704.13
--   saldo_liquido  ≈  -6878.09  (confirme com o total do extrato)

COMMIT;

-- ─── 5. (Opcional) Ver todas as transações inseridas ────────────────────────
SELECT
  id,
  date,
  description,
  amount,
  installments,
  currentInstallment,
  categoryId
FROM creditCardTransactions
WHERE cardId = 1
  AND YEAR(dueDate) = 2026
  AND MONTH(dueDate) = 5
ORDER BY date DESC, description;
