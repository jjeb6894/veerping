import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminSupabase } from "@/lib/supabase-admin";

const CHECKUP_PRICE = "price_1UPgSy0sal1TIs1TeLoZ9Iib";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
    paidBy?: "buyer" | "seller";
    origin?: string;
  };

  const requestId = body.requestId?.trim();
  if (!requestId || !body.paidBy || !["buyer", "seller"].includes(body.paidBy)) {
    return NextResponse.json({ error: "Missing requestId or paidBy." }, { status: 400 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Request storage is not connected." }, { status: 501 });
  }

  const { data: checkup } = await supabase
    .from("checkup_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (!checkup) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_placeholder") {
    return NextResponse.json(
      { error: "Stripe checkout is not connected on this deployment.", configured: false },
      { status: 501 }
    );
  }

  const origin = body.origin || new URL(request.url).origin;
  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: CHECKUP_PRICE, quantity: 1 }],
      success_url: `${origin}/checkup/${requestId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkup/${requestId}?checkout=cancelled`,
      metadata: {
        plan: "tcl-checkup",
        product: "tcl-vehicle-checkup",
        checkupRequestId: requestId,
        paidBy: body.paidBy,
        listingUrl: checkup.vehicle_link,
      },
      client_reference_id: requestId,
    });

    await supabase
      .from("checkup_requests")
      .update({
        stripe_session_id: session.id,
        paid_by: body.paidBy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Payment could not be started. Please try again in a moment." },
      { status: 502 }
    );
  }
}
