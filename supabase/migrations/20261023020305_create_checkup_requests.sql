/*
# Create checkup_requests table for buyer-to-seller TCL checkup flow

1. Plain-English explanation
   A buyer picks a vehicle link, chooses whether they will pay for the
   TCL checkup ($9.99) or are only asking if the vehicle is still
   available, optionally adds a note, and shares a unique link with the
   seller. The seller opens that link and responds. Payments and the
   checkup status are tracked on the same row.

2. New Tables
   - `checkup_requests`
     - `id` (uuid, primary key) — also used in the shareable seller link
     - `vehicle_link` (text) — the original listing URL
     - `vehicle_title` (text, nullable) — title read from the listing, if known
     - `buyer_payment_intent` (boolean) — true when the buyer offered to pay $9.99
     - `buyer_note` (text, nullable) — optional message from the buyer
     - `paid_by` (text) — 'buyer' | 'seller' | 'none'
     - `seller_response` (text, nullable) — 'available' | 'unavailable' | 'available_no_checkup'
     - `checkup_status` (text) — 'not_started' | 'pending_checkup' | 'completed'
     - `stripe_session_id` (text, nullable) — checkout session used for the $9.99 payment
     - `created_at`, `updated_at` (timestamptz)

3. Security
   - RLS enabled on `checkup_requests`.
   - The flow is intentionally link-based with no sign-in: buyers and
     sellers open shareable links, so rows are public to anon and
     authenticated clients. Only SELECT/INSERT/UPDATE are granted (no
     DELETE), and access is documented as intentionally public.
   - `service_role` is granted for server-side route handlers.
*/

CREATE TABLE IF NOT EXISTS checkup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_link text NOT NULL,
  vehicle_title text,
  buyer_payment_intent boolean NOT NULL DEFAULT false,
  buyer_note text,
  paid_by text NOT NULL DEFAULT 'none' CHECK (paid_by IN ('buyer', 'seller', 'none')),
  seller_response text CHECK (seller_response IN ('available', 'unavailable', 'available_no_checkup')),
  checkup_status text NOT NULL DEFAULT 'not_started' CHECK (checkup_status IN ('not_started', 'pending_checkup', 'completed')),
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE checkup_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON checkup_requests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON checkup_requests TO service_role;

DROP POLICY IF EXISTS "checkup_requests_public_select" ON checkup_requests;
CREATE POLICY "checkup_requests_public_select" ON checkup_requests
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "checkup_requests_public_insert" ON checkup_requests;
CREATE POLICY "checkup_requests_public_insert" ON checkup_requests
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "checkup_requests_public_update" ON checkup_requests;
CREATE POLICY "checkup_requests_public_update" ON checkup_requests
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
