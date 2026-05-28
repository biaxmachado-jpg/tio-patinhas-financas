-- PASSO 1: Cole este SQL no Cloud SQL Studio e me mande o resultado
-- Isso vai me dar os IDs necessários para gerar os INSERTs corretos

-- Cartões disponíveis
SELECT id, name, brand, "dueDay" FROM "creditCards" ORDER BY id;

-- Categorias disponíveis
SELECT id, name, type FROM categories ORDER BY name;

-- Usuário (pegar o userId do cartão)
SELECT cc.id AS card_id, cc.name, cc."userId"
FROM "creditCards" cc ORDER BY cc.id;

-- Transações de Maio/2026 já existentes no Master (para confirmar que está vazio)
SELECT COUNT(*) AS total_maio_master
FROM "creditCardTransactions" cct
JOIN "creditCards" cc ON cc.id = cct."cardId"
WHERE EXTRACT(YEAR FROM cct."dueDate") = 2026
  AND EXTRACT(MONTH FROM cct."dueDate") = 5
  AND (cc.brand ILIKE '%master%' OR cc.name ILIKE '%master%' OR cc.name ILIKE '%black%' OR cc."dueDay" = 6);
