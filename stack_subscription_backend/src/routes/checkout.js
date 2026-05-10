const express = require('express');
const Stripe = require('stripe');
const { grantEntitlement } = require('../lib/entitlements');
const { setSessionCookie } = require('../middleware/auth');
const { audit } = require('../lib/audit');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing');

const TIERS = {
  retail: {
    productKey: 'stack_retail',
    priceEnv: 'STACK_RETAIL_PRICE_ID',
    label: '$STACK Retail'
  },
  institutional: {
    productKey: 'stack_institutional',
    priceEnv: 'STACK_INSTITUTIONAL_PRICE_ID',
    label: '$STACK Institutional'
  }
};

function getTierConfig(tierInput) {
  const tier = String(tierInput || 'retail').toLowerCase();

  if (!TIERS[tier]) {
    const error = new Error('Invalid tier selected.');
    error.status = 400;
    throw error;
  }

  const config = TIERS[tier];
  const priceId = process.env[config.priceEnv];

  if (!priceId) {
    const fallback = process.env.STACK_PRICE_ID;
    if (fallback && tier === 'retail') {
      return { tier, ...config, priceId: fallback };
    }

    const error = new Error(`${config.priceEnv} missing`);
    error.status = 500;
    throw error;
  }

  return { tier, ...config, priceId };
}

router.post('/create', async (req, res, next) => {
  try {
    const baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) return res.status(500).json({ error: 'APP_BASE_URL missing' });

    const email = req.body.email?.trim().toLowerCase();
    const tierConfig = getTierConfig(req.body.tier);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [{ price: tierConfig.priceId, quantity: 1 }],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,
      metadata: {
        product_key: tierConfig.productKey,
        tier: tierConfig.tier
      },
      subscription_data: {
        metadata: {
          product_key: tierConfig.productKey,
          tier: tierConfig.tier
        }
      }
    });

    await audit('checkout_session_created', email || null, {
      session_id: session.id,
      product_key: tierConfig.productKey,
      tier: tierConfig.tier
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

async function handleCheckoutSuccess(req, res, next) {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.redirect('/login.html');

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    const email =
      session.customer_details?.email ||
      session.customer_email ||
      session.customer?.email;

    if (!email) {
      return res.status(400).send('Could not verify customer email.');
    }

    const paid =
      session.payment_status === 'paid' ||
      session.status === 'complete';

    if (!paid) {
      return res.redirect('/access-denied.html');
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id || null;

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || null;

    let currentPeriodEnd = null;
    if (session.subscription?.current_period_end) {
      currentPeriodEnd = new Date(session.subscription.current_period_end * 1000);
    }

    const productKey =
      session.metadata?.product_key ||
      session.subscription?.metadata?.product_key ||
      'stack_retail';

    await grantEntitlement({
      email,
      productKey,
      status: 'active',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeCheckoutSessionId: session.id,
      currentPeriodEnd
    });

    setSessionCookie(res, email);

    await audit('checkout_success_verified', email, {
      session_id: session.id,
      subscription_id: subscriptionId,
      product_key: productKey
    });

    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
}

router.get('/verify-session', async (req, res, next) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) return res.status(400).json({ error: 'session_id required' });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    res.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      email: session.customer_details?.email || session.customer_email || session.customer?.email || null,
      product_key: session.metadata?.product_key || session.subscription?.metadata?.product_key || null,
      tier: session.metadata?.tier || session.subscription?.metadata?.tier || null
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.handleCheckoutSuccess = handleCheckoutSuccess;
