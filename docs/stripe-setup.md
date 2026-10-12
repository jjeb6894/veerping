# Stripe checkout setup

The vehicle-report unlock uses hosted Stripe Checkout.

Set these secrets in the Cloudflare Worker environment that deploys `trustping`:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ONE_OFF_GBP`
- `STRIPE_PRICE_ONE_OFF_EUR`
- `STRIPE_PRICE_ONE_OFF_USD`

Optional currency hooks are also supported for `STRIPE_PRICE_ONE_OFF_CAD` and
`STRIPE_PRICE_ONE_OFF_AUD`.

Create one-time Stripe Prices for the same report product in each currency. The
site expects the local display amount to be 9.99 in that currency. Do not put
secret keys in GitHub or client-side code.

Configure the Stripe webhook endpoint as:

`https://templatechecklist.com/api/stripe/webhook`

Subscribe to `checkout.session.completed`. The app verifies the signature and
only treats a session as paid when it matches the vehicle-report product and the
listing URL stored in Checkout metadata.

Use Stripe test mode and test Price IDs first. Switch the Cloudflare secrets
and the Stripe webhook to live mode only after a successful test checkout.
