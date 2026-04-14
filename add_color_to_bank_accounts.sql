-- Migration: Adicionar campo color à tabela bankAccounts
-- Execute este script no banco de dados de produção

ALTER TABLE bankAccounts 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#3b82f6' 
COMMENT 'Hex color for card/account display';

-- Verificar se a coluna foi adicionada
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'bankAccounts' AND COLUMN_NAME = 'color';
