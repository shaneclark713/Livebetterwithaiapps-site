const jwt = require('jsonwebtoken');
const { hasActiveEntitlement, hasActiveStackAccess, tierFromProductKey } = require('../lib/entitlements');

const COOKIE_NAME = process.env.COOKIE_NAME || 'stack_session';

function cookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  };
}

function signSession(email) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing');
  }

  return jwt.sign(
    { email: email.trim().toLowerCase() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setSessionCookie(res, email) {
  const token = signSession(email);
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function attachUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token || !process.env.JWT_SECRET) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { email: payload.email };
  } catch (_) {
    req.user = null;
  }

  next();
}

function requireLogin(req, res, next) {
  if (!req.user?.email) {
    if (req.accepts('html')) return res.redirect('/login.html');
    return res.status(401).json({ error: 'Login required' });
  }

  next();
}

function requireEntitlement(productKey) {
  return async (req, res, next) => {
    try {
      if (!req.user?.email) {
        if (req.accepts('html')) return res.redirect('/login.html');
        return res.status(401).json({ error: 'Login required' });
      }

      const entitlement = await hasActiveEntitlement(req.user.email, productKey);

      if (!entitlement) {
        if (req.accepts('html')) return res.redirect('/access-denied.html');
        return res.status(403).json({ error: 'Active subscription required' });
      }

      req.entitlement = entitlement;
      req.stackTier = tierFromProductKey(entitlement.product_key);
      next();
    } catch (err) {
      next(err);
    }
  };
}

async function requireStackAccess(req, res, next) {
  try {
    if (!req.user?.email) {
      if (req.accepts('html')) return res.redirect('/login.html');
      return res.status(401).json({ error: 'Login required' });
    }

    const entitlement = await hasActiveStackAccess(req.user.email);

    if (!entitlement) {
      if (req.accepts('html')) return res.redirect('/access-denied.html');
      return res.status(403).json({ error: 'Active $STACK subscription required' });
    }

    req.entitlement = entitlement;
    req.stackTier = tierFromProductKey(entitlement.product_key);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  attachUser,
  requireLogin,
  requireEntitlement,
  requireStackAccess,
  setSessionCookie,
  clearSessionCookie,
  cookieOptions
};
