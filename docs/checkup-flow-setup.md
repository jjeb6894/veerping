# Buyer to seller checkup setup

Apply `supabase/migrations/20261023040000_secure_checkup_flow.sql` before deploying this code. It revokes the old public read and update grants, adds private contact storage, and adds payment attempts. Existing requests remain in the table but their old links have no access token and cannot open the private page; create a new request after migration. Deploy the migration and app together to avoid a period where old public database policies expose new contact data.

The server needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_CHECKUP`. The Price must be an active one time Price for the checkup product. The checkout button reads its amount and currency from Stripe and verification compares the paid session against the saved Price, product, amount, currency, payer, request, and mode. Never expose the Supabase service role key to the browser.

Configure `https://templatechecklist.com/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. The webhook signature is checked and fulfillment is idempotent. Test with Stripe test mode and a test Price before switching the secrets and Price to live mode. Buyer and seller access links contain secret fragments; share only the seller link with the seller. A buyer who wants to pay can pay through their own private link. A seller who starts checkout is recorded as the seller payer regardless of the buyer's willingness.

The existing general vehicle report checkout still uses its own configured Prices. This new Price setting applies only to the checkup request flow.
