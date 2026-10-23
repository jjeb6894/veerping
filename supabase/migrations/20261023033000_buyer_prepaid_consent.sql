-- Persist explicit buyer consent for a conditional $9.99 checkup payment.
ALTER TABLE checkup_requests
  ADD COLUMN IF NOT EXISTS buyer_prepaid_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_prepaid_consent_at timestamptz;
