import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'gateway05.us-east-1.prod.aws.tidbcloud.com',
  user: 'root',
  password: 'K9c4zpA6LklZos77tk3e',
  database: 'ESS7XAEQ98H8rmWRqEpy3z',
  ssl: { rejectUnauthorized: true }
});

// Query com gte e lte (como está agora)
const startDate = new Date(2026, 3, 1); // abril 1
const endDate = new Date(2026, 4, 0, 23, 59, 59); // abril 30

console.log('Start date:', startDate);
console.log('End date:', endDate);

const [rows1] = await conn.execute(
  `SELECT COUNT(*) as count, SUM(amount) as total FROM creditCardTransactions 
   WHERE userId = 1 AND cardId = 1 
   AND dueDate >= ? AND dueDate <= ?`,
  [startDate, endDate]
);

console.log('Query com gte/lte:', rows1);

// Query com YEAR e MONTH
const [rows2] = await conn.execute(
  `SELECT COUNT(*) as count, SUM(amount) as total FROM creditCardTransactions 
   WHERE userId = 1 AND cardId = 1 
   AND YEAR(dueDate) = 2026 AND MONTH(dueDate) = 4`
);

console.log('Query com YEAR/MONTH:', rows2);

conn.end();
