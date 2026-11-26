import Stripe from "stripe";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { matchesCheckupPayment } from "@/lib/checkup-payment-validation";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_placeholder") throw new Error("Stripe is not configured");
  return new Stripe(key);
}
export async function verifyCheckupSession(stripe: Stripe, sessionId: string) {
  const db = getAdminSupabase();
  if (!db) throw new Error("Storage is not configured");
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  const attemptId = session.metadata?.attemptId;
  if (!attemptId) return false;
  const { data: attempt, error } = await db.from("checkup_payments").select("id,request_id,payer,stripe_session_id,price_id,product_id,amount,currency,livemode,status").eq("id", attemptId).maybeSingle();
  if (error || !attempt || !matchesCheckupPayment(session, attempt)) return false;
  const { data: fulfilled, error: fulfillmentError } = await db.rpc("fulfill_checkup_payment", { attempt_id: attempt.id, session_id: session.id });
  if (fulfillmentError) throw fulfillmentError;
  return fulfilled === true;
}
