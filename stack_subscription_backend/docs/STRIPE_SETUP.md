# Stripe Setup

## 1. Create the product and price

In Stripe Dashboard:

1. Products
2. Add product
3. Name: `$STACK Intelligence` or `$STACK Dashboard Access`
4. Add recurring price
5. Copy the `price_...` ID into `STACK_PRICE_ID`

## 2. Add webhook endpoint

Add endpoint:

```txt
https://YOUR_DOMAIN.com/webhooks/stripe
```

Recommended events:

```txt
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
```

Copy the webhook signing secret into:

```txt
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 3. Test locally with Stripe CLI

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Use the printed `whsec_...` for local testing.

## 4. Test checkout

Open:

```txt
http://localhost:3000/
```

Complete Stripe test checkout. You should be redirected to `/dashboard`.
