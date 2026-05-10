const express = require('express');
const { query } = require('../db');
const { hasActiveStackAccess } = require('../lib/entitlements');
const { createRawToken, hashToken, compareToken } = require('../lib/tokens');
const { sendLoginLink } = require('../lib/mailer');
const { setSessionCookie, clearSessionCookie } = require('../middleware/auth');
const { audit } = require('../lib/audit');

const router = express.Router();

router.post('/request-login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email required' });

    const entitlement = await hasActiveStackAccess(email);
    if (!entitlement) {
      await audit('login_denied_no_entitlement', email);
      return res.status(403).json({
        error: 'No active $STACK subscription found for this email.'
      });
    }

    const token = createRawToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await query(
      `INSERT INTO login_tokens (email, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [email, tokenHash, expiresAt]
    );

    const loginUrl = `${process.env.APP_BASE_URL}/auth/verify?token=${token}`;

    const result = await sendLoginLink(email, loginUrl);
    await audit('login_link_requested', email, { sent: result.sent });

    const response = { ok: true, message: 'If your subscription is active, a login link has been sent.' };

    // Development-only convenience.
    if (process.env.NODE_ENV !== 'production' && result.devLoginUrl) {
      response.devLoginUrl = result.devLoginUrl;
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/verify', async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) return res.redirect('/login.html');

    const result = await query(
      `SELECT *
       FROM login_tokens
       WHERE used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 20`
    );

    for (const row of result.rows) {
      const ok = await compareToken(token, row.token_hash);
      if (!ok) continue;

      await query(
        `UPDATE login_tokens SET used_at = NOW() WHERE id = $1`,
        [row.id]
      );

      const entitlement = await hasActiveStackAccess(row.email);
      if (!entitlement) {
        return res.redirect('/access-denied.html');
      }

      setSessionCookie(res, row.email);
      await audit('login_verified', row.email);
      return res.redirect('/dashboard');
    }

    return res.status(400).send('Invalid or expired login link.');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
