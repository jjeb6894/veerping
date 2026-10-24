/*
# Add RLS policies for report_payments

1. Plain-English explanation
   `report_payments` had RLS enabled but no policies, so every write from
   the app (recording a completed £9.99 report unlock after the Stripe
   redirect) failed. The app is intentionally link-based with no sign-in,
   so both tables follow the same public pattern.

2. Security changes
   - Add anon + authenticated policies on `report_payments` for
     SELECT/INSERT/UPDATE (the verbs the app uses). No DELETE.
   - Policies are intentionally public (USING/WITH CHECK true) because
     rows are keyed by Stripe session id and the flow has no accounts.
*/

GRANT SELECT, INSERT, UPDATE ON report_payments TO anon, authenticated;

DROP POLICY IF EXISTS "report_payments_public_select" ON report_payments;
CREATE POLICY "report_payments_public_select" ON report_payments
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "report_payments_public_insert" ON report_payments
;
CREATE POLICY "report_payments_public_insert" ON report_payments
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "report_payments_public_update" ON report_payments;
CREATE POLICY "report_payments_public_update" ON report_payments
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
