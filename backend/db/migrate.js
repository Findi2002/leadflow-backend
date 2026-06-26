// Runs schema.sql against DATABASE_URL. Idempotent (uses IF NOT EXISTS).
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✓ Schema applied.');
  await pool.end();
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
