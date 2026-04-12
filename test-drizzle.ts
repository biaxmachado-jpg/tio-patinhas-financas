import { drizzle } from "drizzle-orm/mysql2";
import { sql, eq, and, desc } from "drizzle-orm";
import { creditCardTransactions } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function test() {
  try {
    console.log("Testando query com Drizzle...\n");
    
    const result = await db.select()
      .from(creditCardTransactions)
      .where(and(
        eq(creditCardTransactions.userId, 270515),
        eq(creditCardTransactions.cardId, 1),
        sql`YEAR(${creditCardTransactions.dueDate}) = 2026`,
        sql`MONTH(${creditCardTransactions.dueDate}) = 4`
      ))
      .orderBy(desc(creditCardTransactions.dueDate))
      .limit(5);
    
    console.log(`Encontradas ${result.length} transações`);
    result.forEach(t => {
      console.log(`  ID: ${t.id}, Desc: ${t.description}, Amount: ${t.amount}`);
    });
    
  } catch (error) {
    console.error("Erro:", (error as any).message);
    console.error(error);
  }
}

test();
