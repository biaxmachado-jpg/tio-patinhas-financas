import mysql from "mysql2/promise";

async function migrateRules() {
  const sourceConn = await mysql.createConnection(
    "mysql://SXZBwBvNV6ZYPrS.root:K9c4zpA6LklZos77tk3e@gateway05.us-east-1.prod.aws.tidbcloud.com:4000/ESS7XAEQ98H8rmWRqEpy3z?ssl={\"rejectUnauthorized\":true}"
  );
  
  const targetConn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log("🔄 Migrando regras de categorização...");
    
    // Get all rules from source
    const [rules] = await sourceConn.execute("SELECT * FROM categorizationRules");
    console.log(`✓ ${rules.length} regras encontradas no banco original`);
    
    // Create mapping of old categoryId to new categoryId
    const [oldCategories] = await sourceConn.execute("SELECT id, name FROM categories WHERE userId = 270515");
    const [newCategories] = await targetConn.execute("SELECT id, name FROM categories WHERE userId = 1");
    
    const categoryMap = {};
    oldCategories.forEach(oldCat => {
      const newCat = newCategories.find(nc => nc.name === oldCat.name);
      if (newCat) {
        categoryMap[oldCat.id] = newCat.id;
      }
    });
    
    console.log(`✓ Mapeamento de categorias criado (${Object.keys(categoryMap).length} categorias)`);
    
    // Migrate rules
    let migrated = 0;
    let failed = 0;
    
    for (const rule of rules) {
      try {
        const newCategoryId = categoryMap[rule.categoryId];
        if (!newCategoryId) {
          console.log(`⚠️ Pulando regra ${rule.id} - categoria ${rule.categoryId} não encontrada`);
          failed++;
          continue;
        }
        
        await targetConn.execute(
          `INSERT INTO categorizationRules (userId, categoryId, keywords, matchType, caseSensitive, priority, enabled, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            1, // userId
            newCategoryId,
            rule.keywords,
            rule.matchType,
            rule.caseSensitive,
            rule.priority,
            rule.enabled,
            new Date(),
            new Date()
          ]
        );
        migrated++;
      } catch (error) {
        console.error(`❌ Erro ao migrar regra ${rule.id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n✅ Migração concluída!`);
    console.log(`✓ ${migrated} regras migradas com sucesso`);
    if (failed > 0) console.log(`⚠️ ${failed} regras falharam`);
    
  } catch (error) {
    console.error("❌ Erro fatal:", error.message);
  } finally {
    await sourceConn.end();
    await targetConn.end();
  }
}

migrateRules();
