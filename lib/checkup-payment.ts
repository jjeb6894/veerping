import Stripe from "stripe";
import { getAdminSupabase } from "@/lib/supabase-admin";

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
  if (error || !attempt || attempt.stripe_session_id !== session.id || session.client_reference_id !== attempt.request_id ||
      session.metadata?.product !== "tcl-vehicle-checkup" || session.metadata?.checkupRequestId !== attempt.request_id ||
      session.metadata?.paidBy !== attempt.payer || session.mode !== "payment" || session.payment_status !== "paid" ||
      session.amount_total !== attempt.amount || session.currency !== attempt.currency || session.livemode !== attempt.livemode ||
      session.line_items?.data.length !== 1 || session.line_items.data[0].price?.id !== attempt.price_id ||
      session.line_items.data[0].price?.product !== attempt.product_id || session.line_items.data[0].quantity !== 1) return false;
  const { data: fulfilled, error: fulfillmentError } = await db.rpc("fulfill_checkup_payment", { attempt_id: attempt.id, session_id: session.id });
  if (fulfillmentError) throw fulfillmentError;
  return fulfilled === true;
}
