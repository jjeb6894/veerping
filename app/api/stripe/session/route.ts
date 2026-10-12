import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const requestedUrl = searchParams.get("url");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id.", paid: false }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_placeholder") {
    return NextResponse.json(
      { error: "Stripe checkout is not connected on this deployment.", paid: false, configured: false },
      { status: 501 }
    );
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const listingUrl = session.metadata?.listingUrl ?? null;
    const paid =
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      session.metadata?.product === "vehicle-report-unlock" &&
      (!requestedUrl || requestedUrl === listingUrl);

    return NextResponse.json({
      paid,
      listingUrl,
      currency: session.currency?.toUpperCase() ?? null,
      amountTotal: session.amount_total ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not verify that checkout session.", paid: false },
      { status: 502 }
    );
  }
}
