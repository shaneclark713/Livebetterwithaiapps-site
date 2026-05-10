const { query } = require('../db');

async function audit(eventType, email = null, payload = {}) {
  try {
    await query(`INSERT INTO audit_events (event_type, email, payload) VALUES ($1, $2, $3)`, [eventType, email, payload]);
  } catch (err) {
    console.error('Audit failed:', err.message);
  }
}

module.exports = { audit };
