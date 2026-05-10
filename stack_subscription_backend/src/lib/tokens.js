const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}
async function hashToken(token) {
  return bcrypt.hash(token, 12);
}
async function compareToken(token, hash) {
  return bcrypt.compare(token, hash);
}
module.exports = { createRawToken, hashToken, compareToken };
