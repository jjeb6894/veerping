import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret || secretKey === "sk_test_placeholder") {
    return NextResponse.json(
      { error: "Stripe webhook is not connected on this deployment.", configured: false },
      { status: 501 }
    );
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secretKey);
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        session.payment_status === "paid" &&
        session.metadata?.product === "vehicle-report-unlock"
      ) {
        console.info("Vehicle report payment completed", {
          sessionId: session.id,
          listingUrl: session.metadata.listingUrl ?? null,
        });
      }
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.warn("Vehicle report payment failed", {
        sessionId: session.id,
        listingUrl: session.metadata?.listingUrl ?? null,
      });
    }

    return NextResponse.json({ received: true, eventType: event.type });
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }
}
