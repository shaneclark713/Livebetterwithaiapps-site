const { query, withClient } = require('../db');

const STACK_PRODUCT_KEYS = ['stack_retail', 'stack_institutional', 'stack_dashboard'];

function normalizeProductKey(productKey) {
  if (productKey === 'retail') return 'stack_retail';
  if (productKey === 'institutional') return 'stack_institutional';
  return productKey || 'stack_retail';
}

async function getOrCreateUser(email) {
  const normalized = email.trim().toLowerCase();

  const result = await query(
    `INSERT INTO users (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [normalized]
  );

  return result.rows[0];
}

async function grantEntitlement({
  email,
  productKey = 'stack_retail',
  status = 'active',
  stripeCustomerId = null,
  stripeSubscriptionId = null,
  stripeCheckoutSessionId = null,
  currentPeriodEnd = null
}) {
  const normalized = email.trim().toLowerCase();
  const normalizedProductKey = normalizeProductKey(productKey);

  return withClient(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING *`,
      [normalized]
    );

    const user = userResult.rows[0];

    const entitlementResult = await client.query(
      `INSERT INTO entitlements (
         user_id, product_key, status, stripe_customer_id,
         stripe_subscription_id, stripe_checkout_session_id,
         current_period_end, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, product_key)
       DO UPDATE SET
         status = EXCLUDED.status,
         stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, entitlements.stripe_customer_id),
         stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, entitlements.stripe_subscription_id),
         stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, entitlements.stripe_checkout_session_id),
         current_period_end = COALESCE(EXCLUDED.current_period_end, entitlements.current_period_end),
         updated_at = NOW()
       RETURNING *`,
      [
        user.id,
        normalizedProductKey,
        status,
        stripeCustomerId,
        stripeSubscriptionId,
        stripeCheckoutSessionId,
        currentPeriodEnd
      ]
    );

    return { user, entitlement: entitlementResult.rows[0] };
  });
}

async function updateSubscriptionStatus(stripeSubscriptionId, status, currentPeriodEnd = null) {
  const result = await query(
    `UPDATE entitlements
     SET status = $2,
         current_period_end = COALESCE($3, current_period_end),
         updated_at = NOW()
     WHERE stripe_subscription_id = $1
     RETURNING *`,
    [stripeSubscriptionId, status, currentPeriodEnd]
  );

  return result.rows[0] || null;
}

async function hasActiveEntitlement(email, productKey = 'stack_retail') {
  const normalizedProductKey = normalizeProductKey(productKey);

  const result = await query(
    `SELECT e.*
     FROM entitlements e
     JOIN users u ON u.id = e.user_id
     WHERE u.email = $1
       AND e.product_key = $2
       AND e.status IN ('active', 'trialing')
     LIMIT 1`,
    [email.trim().toLowerCase(), normalizedProductKey]
  );

  return result.rows[0] || null;
}

async function hasActiveStackAccess(email) {
  const result = await query(
    `SELECT e.*
     FROM entitlements e
     JOIN users u ON u.id = e.user_id
     WHERE u.email = $1
       AND e.product_key = ANY($2)
       AND e.status IN ('active', 'trialing')
     ORDER BY
       CASE
         WHEN e.product_key = 'stack_institutional' THEN 1
         WHEN e.product_key = 'stack_retail' THEN 2
         ELSE 3
       END
     LIMIT 1`,
    [email.trim().toLowerCase(), STACK_PRODUCT_KEYS]
  );

  return result.rows[0] || null;
}

function tierFromProductKey(productKey) {
  if (productKey === 'stack_institutional') return 'institutional';
  if (productKey === 'stack_retail') return 'retail';
  return 'legacy';
}

module.exports = {
  STACK_PRODUCT_KEYS,
  normalizeProductKey,
  getOrCreateUser,
  grantEntitlement,
  updateSubscriptionStatus,
  hasActiveEntitlement,
  hasActiveStackAccess,
  tierFromProductKey
};
