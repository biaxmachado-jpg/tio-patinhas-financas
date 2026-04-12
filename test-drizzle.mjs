import { drizzle } from "drizzle-orm/mysql2";
import { sql, eq, and, desc } from "drizzle-orm";
import * as schema from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function test() {
  try {
    console.log("Testando query com Drizzle...\n");
    
    const result = await db.select()
      .from(schema.creditCardTransactions)
      .where(and(
        eq(schema.creditCardTransactions.userId, 270515),
        eq(schema.creditCardTransactions.cardId, 1),
        sql`YEAR(${schema.creditCardTransactions.dueDate}) = 2026`,
        sql`MONTH(${schema.creditCardTransactions.dueDate}) = 4`
      ))
      .orderBy(desc(schema.creditCardTransactions.dueDate))
      .limit(5);
    
    console.log(`Encontradas ${result.length} transações`);
    result.forEach(t => {
      console.log(`  ID: ${t.id}, Desc: ${t.description}, Amount: ${t.amount}`);
    });
    
  } catch (error) {
    console.error("Erro:", error.message);
    console.error(error);
  }
}

test();
