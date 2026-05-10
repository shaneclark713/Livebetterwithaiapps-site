const { Pool } = require('pg');

if (!process.env.DATABASE_URL) console.warn('DATABASE_URL is missing. Set it in .env before running.');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withClient(callback) {
  const client = await pool.connect();
  try { return await callback(client); }
  finally { client.release(); }
}

module.exports = { query, withClient, pool };
