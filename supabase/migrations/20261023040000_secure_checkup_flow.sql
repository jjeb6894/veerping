BEGIN;
REVOKE ALL ON public.checkup_requests FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS checkup_requests_public_select ON public.checkup_requests;
DROP POLICY IF EXISTS checkup_requests_public_insert ON public.checkup_requests;
DROP POLICY IF EXISTS checkup_requests_public_update ON public.checkup_requests;
ALTER TABLE public.checkup_requests ADD COLUMN buyer_name text,
  ADD COLUMN buyer_access_hash text, ADD COLUMN seller_access_hash text,
  ADD COLUMN contact_masked text, ADD COLUMN vehicle_price text,
  ADD COLUMN vehicle_summary text, ADD COLUMN vehicle_images jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN payment_verified_at timestamptz;
CREATE TABLE public.checkup_request_contacts (
  request_id uuid PRIMARY KEY REFERENCES public.checkup_requests(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'));
CREATE TABLE public.checkup_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.checkup_requests(id),
  payer text NOT NULL CHECK (payer IN ('buyer', 'seller')),
  stripe_session_id text UNIQUE, price_id text NOT NULL, product_id text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0), currency text NOT NULL, livemode boolean NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.checkup_request_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkup_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkup_request_contacts, public.checkup_payments FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.checkup_request_contacts, public.checkup_payments TO service_role;
CREATE FUNCTION public.create_private_checkup(request_data jsonb, phone text) RETURNS uuid
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE request_id uuid;
BEGIN
  INSERT INTO checkup_requests(vehicle_link,vehicle_title,vehicle_price,vehicle_summary,vehicle_images,
    buyer_name,buyer_note,buyer_payment_intent,buyer_access_hash,seller_access_hash,contact_masked)
  VALUES(request_data->>'vehicle_link',request_data->>'vehicle_title',request_data->>'vehicle_price',
    request_data->>'vehicle_summary',request_data->'vehicle_images',request_data->>'buyer_name',
    NULL,(request_data->>'buyer_payment_intent')::boolean,
    request_data->>'buyer_access_hash',request_data->>'seller_access_hash',request_data->>'contact_masked')
  RETURNING id INTO request_id;
  INSERT INTO checkup_request_contacts VALUES(request_id, phone);
  RETURN request_id;
END $$;
CREATE FUNCTION public.fulfill_checkup_payment(attempt_id uuid, session_id text) RETURNS boolean
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE payment checkup_payments;
BEGIN
  SELECT * INTO payment FROM checkup_payments WHERE id = attempt_id FOR UPDATE;
  IF NOT FOUND OR payment.stripe_session_id IS DISTINCT FROM session_id THEN RETURN false; END IF;
  UPDATE checkup_payments SET status = 'paid', verified_at = coalesce(verified_at, now()) WHERE id = attempt_id;
  UPDATE checkup_requests SET payment_status = 'paid', paid_by = payment.payer,
    stripe_session_id = session_id, payment_verified_at = now(), updated_at = now()
    WHERE id = payment.request_id AND payment_status <> 'paid';
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.create_private_checkup(jsonb,text), public.fulfill_checkup_payment(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_private_checkup(jsonb,text), public.fulfill_checkup_payment(uuid,text) TO service_role;
COMMIT;
