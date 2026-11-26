import type Stripe from "stripe";

export interface CheckupPaymentAttempt {
  id: string;
  request_id: string;
  payer: "buyer" | "seller";
  stripe_session_id: string;
  price_id: string;
  product_id: string;
  amount: number;
  currency: string;
  livemode: boolean;
}

/** A Checkout redirect or webhook is only evidence after these Stripe-owned fields match the saved attempt. */
export function matchesCheckupPayment(session: Stripe.Checkout.Session, attempt: CheckupPaymentAttempt): boolean {
  const lines = session.line_items?.data ?? [];
  const product = lines[0]?.price?.product;
  return session.metadata?.attemptId === attempt.id &&
    session.id === attempt.stripe_session_id &&
    session.client_reference_id === attempt.request_id &&
    session.metadata?.product === "tcl-vehicle-checkup" &&
    session.metadata?.checkupRequestId === attempt.request_id &&
    session.metadata?.paidBy === attempt.payer &&
    session.mode === "payment" && session.payment_status === "paid" &&
    session.amount_total === attempt.amount && session.currency === attempt.currency &&
    session.livemode === attempt.livemode && lines.length === 1 &&
    lines[0].price?.id === attempt.price_id &&
    (typeof product === "string" ? product : product?.id) === attempt.product_id &&
    lines[0].quantity === 1;
}
