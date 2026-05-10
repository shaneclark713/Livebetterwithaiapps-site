# $STACK Tier Pricing Setup

You have two monthly subscription tiers:

```txt
Retail: $49.99/month
Institutional: $249.99/month
```

Each tier needs its own Stripe Price ID.

## Stripe

In Stripe, create or open your `$STACK` product.

You can either:

1. Keep both prices under one `$STACK` product, or
2. Use separate products for Retail and Institutional.

Either way, the backend needs the two Price IDs that start with:

```txt
price_
```

Do not use the Product ID that starts with:

```txt
prod_
```

## Render environment variables

Set these in Render:

```txt
STACK_RETAIL_PRICE_ID=price_xxxxx
STACK_INSTITUTIONAL_PRICE_ID=price_xxxxx
```

The checkout form sends:

```txt
tier=retail
```

or

```txt
tier=institutional
```

The backend maps that tier to the correct Stripe Price ID.

## Stored entitlement keys

Retail buyers are stored as:

```txt
stack_retail
```

Institutional buyers are stored as:

```txt
stack_institutional
```

Both tiers can access `/dashboard`.

The dashboard API returns the buyer's tier so you can show different data later.
