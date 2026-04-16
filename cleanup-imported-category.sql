-- Migration: Allow NULL categoryId and remove "Imported" category
-- Step 1: Allow NULL in categoryId column
ALTER TABLE `creditCardTransactions` MODIFY COLUMN `categoryId` int;

-- Step 2: Find and update transactions with "Imported" category
UPDATE creditCardTransactions 
SET categoryId = NULL 
WHERE categoryId IN (
  SELECT id FROM categories WHERE name = 'Imported'
);

-- Step 3: Update bank transactions too
UPDATE transactions 
SET categoryId = NULL 
WHERE categoryId IN (
  SELECT id FROM categories WHERE name = 'Imported'
);

-- Step 4: Delete the "Imported" category
DELETE FROM categories WHERE name = 'Imported';

-- Verify the changes
SELECT COUNT(*) as transactions_without_category FROM creditCardTransactions WHERE categoryId IS NULL;
SELECT COUNT(*) as categories_total FROM categories;
