# $STACK Subscription Backend

This backend protects the `$STACK Index | Secure Dashboard` so it cannot be viewed just by knowing the URL.

## What it does

- Creates Stripe Checkout sessions for the $STACK subscription.
- Receives Stripe webhooks.
- Grants dashboard access after successful checkout.
- Uses secure HTTP-only cookies.
- Lets paid users log back in through magic email links.
- Protects `/dashboard` server-side before the HTML or Google Analytics tag loads.
- Stores users, entitlements, login links, and audit events in PostgreSQL.

## Flow

1. Visitor goes to `/`.
2. Visitor enters email and clicks subscribe.
3. Server creates Stripe Checkout Session.
4. Stripe redirects buyer to `/checkout/success?session_id=...`.
5. Server verifies the Checkout Session with Stripe.
6. Server grants `stack_dashboard` entitlement.
7. Server sets a secure login cookie.
8. Buyer is redirected to `/dashboard`.
9. `/dashboard` only loads if the cookie and active entitlement both pass.

## Quick local setup

```bash
cp .env.example .env
npm install
npm run init-db
npm run dev
```

You need PostgreSQL and Stripe keys in `.env`.

## Important security notes

- Never commit `.env`.
- Use a real PostgreSQL database in production.
- Use Stripe webhooks for real fulfillment.
- Put Google Analytics inside the protected dashboard only after the access check.
- Keep raw customer/subscriber data private.


## Two-tier pricing

This version supports two monthly Stripe prices:

```txt
Retail: $49.99/month
Institutional: $249.99/month
```

Set these in Render:

```txt
STACK_RETAIL_PRICE_ID=price_xxxxx
STACK_INSTITUTIONAL_PRICE_ID=price_xxxxx
```

The frontend sends `tier=retail` or `tier=institutional`, and the backend maps it to the right Stripe Price ID.
