import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const requestedUrl = searchParams.get("url");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id.", paid: false }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  // Check stored fulfilment first so revisiting a success URL after the
  // Stripe record ages out, or a repeated refresh, still resolves correctly.
  if (supabase) {
    const { data: stored } = await supabase
      .from("report_payments")
      .select("listing_url, payment_status")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (stored?.payment_status === "paid") {
      const paid = !requestedUrl || stored.listing_url === requestedUrl;
      return NextResponse.json({ paid, listingUrl: stored.listing_url });
    }
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

    if (paid && supabase && listingUrl) {
      // Idempotent: the session_id primary key means repeated confirmations
      // upsert the same row without double fulfilment.
      await supabase.from("report_payments").upsert({
        session_id: sessionId,
        listing_url: listingUrl,
        currency: session.currency ?? "unknown",
        amount_total: session.amount_total ?? 0,
        payment_status: "paid",
      });
    }

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
