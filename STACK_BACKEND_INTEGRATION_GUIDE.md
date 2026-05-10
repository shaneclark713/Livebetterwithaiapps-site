# $STACK Backend Integration Guide

I added the backend files inside this repo under:

```txt
stack_subscription_backend/
```

## Important

This backend is a **Node/Express app**. It is not just another static HTML page.

Your current website can stay as the public front-end, but the protected dashboard should be served by this backend so the page cannot load unless a paid user has access.

## Recommended Deployment

### Option 1 — Render Web Service from this same GitHub repo

When creating the Render Web Service, set the root directory to:

```txt
stack_subscription_backend
```

Build command:

```bash
npm install && npm run init-db
```

Start command:

```bash
npm start
```

### Option 2 — Separate backend repo

You can also copy only the `stack_subscription_backend/` folder into its own GitHub repository and deploy that as a separate Render Web Service.

## Required Environment Variables

Set these in Render, not in GitHub:

```txt
NODE_ENV=production
APP_BASE_URL=https://your-backend-domain.onrender.com
CLIENT_ORIGIN=https://your-backend-domain.onrender.com
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=long_random_secret
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_key
STACK_RETAIL_PRICE_ID=price_id_for_49_99_monthly
STACK_INSTITUTIONAL_PRICE_ID=price_id_for_249_99_monthly
COOKIE_NAME=stack_session
```

Optional email login variables:

```txt
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="$STACK Access <no-reply@livebetterwithaiapps.com>"
```

## Stripe Webhook URL

Once deployed, add this webhook in Stripe:

```txt
https://your-backend-domain.onrender.com/webhooks/stripe
```

Recommended Stripe events:

```txt
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
```

## Public Site Button

Your public site can link to the backend checkout page:

```html
<a href="https://your-backend-domain.onrender.com/">Subscribe</a>
```

Or you can later wire your existing button to call:

```txt
POST https://your-backend-domain.onrender.com/api/checkout/create
```

## Dashboard Protection

The protected dashboard is here inside the backend:

```txt
stack_subscription_backend/protected/dashboard.html
```

It is not served from the public folder.

The backend only sends that file after this server-side route passes:

```txt
/dashboard
```

That means people cannot view the dashboard just by guessing the URL.

## Do Not Commit Secrets

Never commit a real `.env` file to GitHub.

Only commit:

```txt
.env.example
```

