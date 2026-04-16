import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  let connection;
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');

    const url = new URL(dbUrl);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.hostname.includes('tidbcloud') || url.hostname.includes('rds') ? { rejectUnauthorized: false } : undefined,
    };

    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);

    // Read migration file
    const migrationFile = path.join(process.cwd(), 'drizzle/0010_naive_titanium_man.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    console.log('Executing migration...');
    console.log(sql);
    
    // Execute migration
    await connection.query(sql);

    console.log('✅ Migration executed successfully!');

    // Verify table was created
    const [tables] = await connection.query("SHOW TABLES LIKE 'importHistory'");
    if (tables.length > 0) {
      console.log('✅ importHistory table created successfully');
    } else {
      console.log('⚠️ importHistory table not found after migration');
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
