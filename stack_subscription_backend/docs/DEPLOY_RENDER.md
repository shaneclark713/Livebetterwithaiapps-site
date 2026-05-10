# Render Deployment

## 1. Create a PostgreSQL database

Create a Render PostgreSQL instance and copy its connection string.

Set:

```txt
DATABASE_URL=...
```

## 2. Create a Web Service

Build command:

```bash
npm install && npm run init-db
```

Start command:

```bash
npm start
```

## 3. Environment variables

Required:

```txt
NODE_ENV=production
APP_BASE_URL=https://your-render-service.onrender.com
CLIENT_ORIGIN=https://your-render-service.onrender.com
DATABASE_URL=...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STACK_PRICE_ID=...
```

## 4. Stripe webhook URL

Use:

```txt
https://your-render-service.onrender.com/webhooks/stripe
```
