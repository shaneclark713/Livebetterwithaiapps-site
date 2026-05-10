require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database initialized successfully.');
  await pool.end();
}

main().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
