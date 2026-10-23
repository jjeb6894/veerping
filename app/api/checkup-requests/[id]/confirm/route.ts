import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminSupabase } from "@/lib/supabase-admin";

/** Confirm the $9.99 payment after the Stripe redirect and mark the checkup pending. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Request storage is not connected." }, { status: 501 });
  }

  const { data: checkup } = await supabase
    .from("checkup_requests")
    .select("id, stripe_session_id, checkup_status")
    .eq("id", id)
    .maybeSingle();

  if (!checkup) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const sessionId = body.sessionId ?? checkup.stripe_session_id;
  if (!sessionId) {
    return NextResponse.json({ paid: false, checkupStatus: checkup.checkup_status });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_placeholder") {
    return NextResponse.json(
      { error: "Stripe is not connected on this deployment.", paid: false, configured: false },
      { status: 501 }
    );
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid =
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      session.metadata?.product === "tcl-vehicle-checkup" &&
      session.metadata?.checkupRequestId === id;

    if (paid) {
      const { data: updated } = await supabase
        .from("checkup_requests")
        .update({
          checkup_status: "pending_checkup",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("checkup_status")
        .single();

      return NextResponse.json({
        paid: true,
        paidBy: session.metadata?.paidBy ?? null,
        checkupStatus: updated?.checkup_status ?? "pending_checkup",
      });
    }

    return NextResponse.json({ paid: false, checkupStatus: checkup.checkup_status });
  } catch {
    return NextResponse.json(
      { error: "Could not verify that payment.", paid: false },
      { status: 502 }
    );
  }
}
