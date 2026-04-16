import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  console.log('Executing migration: ALTER TABLE creditCardTransactions MODIFY COLUMN categoryId int');
  await connection.execute('ALTER TABLE `creditCardTransactions` MODIFY COLUMN `categoryId` int');
  console.log('✓ Migration executed successfully');
  
  // Find the "Imported" category ID
  const [categories] = await connection.execute(
    'SELECT id FROM categories WHERE name = ? LIMIT 1',
    ['Imported']
  );
  
  if (categories.length > 0) {
    const importedCategoryId = categories[0].id;
    console.log(`Found "Imported" category with ID: ${importedCategoryId}`);
    
    // Update all transactions with this category to NULL
    const [result] = await connection.execute(
      'UPDATE creditCardTransactions SET categoryId = NULL WHERE categoryId = ?',
      [importedCategoryId]
    );
    
    console.log(`✓ Updated ${result.affectedRows} credit card transactions to categoryId = NULL`);
    
    // Update bank transactions too
    const [result2] = await connection.execute(
      'UPDATE transactions SET categoryId = NULL WHERE categoryId = ?',
      [importedCategoryId]
    );
    
    console.log(`✓ Updated ${result2.affectedRows} bank transactions to categoryId = NULL`);
    
    // Delete the "Imported" category
    await connection.execute(
      'DELETE FROM categories WHERE id = ?',
      [importedCategoryId]
    );
    
    console.log('✓ Deleted "Imported" category');
  } else {
    console.log('No "Imported" category found');
  }
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
