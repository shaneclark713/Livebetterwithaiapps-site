# Security Notes

## Protected route

The protected dashboard is served from:

```txt
/dashboard
```

The file is not inside `/public`, so Express will not serve it unless access is approved.

## Do not use hidden URLs

A hidden URL is not protection. The backend must check entitlement before loading the page.

## Google Analytics

Place the Google Analytics tag inside `protected/dashboard.html`, not on a public redirect page.

Because `/dashboard` is protected server-side, a GA dashboard page view will only fire after the server confirms access.

## Webhooks

Stripe webhook verification uses the raw request body and Stripe signature header.

Do not put `express.json()` before the Stripe webhook route.

## Cookies

The backend uses an HTTP-only cookie so JavaScript cannot read the session token.

In production, `secure: true` is enabled automatically when `NODE_ENV=production`.
