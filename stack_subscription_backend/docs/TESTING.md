# Testing Checklist

## Test 1: Dashboard blocked without login

Open incognito:

```txt
/dashboard
```

Expected: redirect to `/login.html`.

## Test 2: Login blocked without subscription

Enter an email that has not paid.

Expected: no login link granted.

## Test 3: Checkout grants access

Complete Stripe test checkout.

Expected: redirect to `/dashboard`.

## Test 4: Reload dashboard

Reload `/dashboard`.

Expected: still accessible because secure cookie is set.

## Test 5: Logout

Click logout.

Expected: dashboard becomes inaccessible.

## Test 6: Subscription canceled

Send `customer.subscription.deleted` webhook.

Expected: entitlement status becomes inactive and dashboard blocks access.
