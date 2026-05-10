const Stripe = require('stripe');
const { grantEntitlement, updateSubscriptionStatus } = require('../lib/entitlements');
const { audit } = require('../lib/audit');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_missing');

function mapSubscriptionStatus(status) {
  if (['active', 'trialing'].includes(status)) return status;
  return 'inactive';
}

async function getCustomerEmail(customerId) {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer?.email || null;
  } catch (err) {
    console.error('Could not retrieve customer email:', err.message);
    return null;
  }
}

async function getSubscriptionProductKey(subscriptionId) {
  if (!subscriptionId) return 'stack_retail';

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.metadata?.product_key || 'stack_retail';
  } catch (err) {
    console.error('Could not retrieve subscription metadata:', err.message);
    return 'stack_retail';
  }
}

async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET missing');
    }

    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        const email =
          session.customer_details?.email ||
          session.customer_email ||
          await getCustomerEmail(session.customer);

        const productKey = session.metadata?.product_key || 'stack_retail';

        if (email) {
          await grantEntitlement({
            email,
            productKey,
            status: 'active',
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: session.subscription || null,
            stripeCheckoutSessionId: session.id
          });

          await audit('webhook_checkout_completed', email, {
            event_id: event.id,
            session_id: session.id,
            subscription_id: session.subscription,
            product_key: productKey
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const status = mapSubscriptionStatus(subscription.status);
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        const updated = await updateSubscriptionStatus(
          subscription.id,
          status,
          currentPeriodEnd
        );

        await audit('webhook_subscription_status', null, {
          event_id: event.id,
          subscription_id: subscription.id,
          status,
          updated: !!updated
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;

        if (invoice.subscription && invoice.customer) {
          const email = await getCustomerEmail(invoice.customer);
          const productKey = await getSubscriptionProductKey(invoice.subscription);

          if (email) {
            await grantEntitlement({
              email,
              productKey,
              status: 'active',
              stripeCustomerId: invoice.customer,
              stripeSubscriptionId: invoice.subscription
            });

            await audit('webhook_invoice_paid', email, {
              event_id: event.id,
              invoice_id: invoice.id,
              subscription_id: invoice.subscription,
              product_key: productKey
            });
          }
        }
        break;
      }

      default:
        await audit('webhook_ignored', null, { event_id: event.id, type: event.type });
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}

module.exports = { handleStripeWebhook };
