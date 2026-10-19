/*
# Store vehicle report payments for durable fulfilment

1. Purpose
- Records one row per Stripe Checkout session used to unlock a vehicle report.
- Lets the results page confirm a payment on later visits without trusting the
  success URL alone, and prevents duplicate fulfilment of the same session.

2. New Tables
- `report_payments`
  - `session_id` (text, primary key) - the Stripe Checkout session ID.
  - `listing_url` (text, not null) - the listing the payment unlocks.
  - `currency` (text, not null) - three-letter currency code charged.
  - `amount_total` (integer, not null) - amount charged in minor units.
  - `payment_status` (text, not null) - "paid" once confirmed server-side.
  - `created_at` (timestamptz, default now()).

3. Security
- RLS enabled on `report_payments`.
- No public policies are granted: the browser never reads this table
  directly. Fulfilment state is only exposed through the server-side
  `/api/stripe/session` route, which verifies against Stripe and upserts the
  confirmed result. This is deny-by-default.

4. Notes
- The primary key on `session_id` makes re-confirmation idempotent: repeated
  success-URL visits upsert the same row without double fulfilment.
*/

CREATE TABLE IF NOT EXISTS report_payments (
  session_id text PRIMARY KEY,
  listing_url text NOT NULL,
  currency text NOT NULL,
  amount_total integer NOT NULL,
  payment_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_payments ENABLE ROW LEVEL SECURITY;
