import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Request storage is not connected." }, { status: 501 });
  }

  const { data, error } = await supabase
    .from("checkup_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not load that request." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as {
    sellerResponse?: string;
    paidBy?: string;
    checkupStatus?: string;
    stripeSessionId?: string;
  };

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Request storage is not connected." }, { status: 501 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.sellerResponse) {
    if (!["available", "unavailable", "available_no_checkup"].includes(body.sellerResponse)) {
      return NextResponse.json({ error: "Invalid seller response." }, { status: 400 });
    }
    update.seller_response = body.sellerResponse;
  }
  if (body.paidBy) {
    if (!["buyer", "seller", "none"].includes(body.paidBy)) {
      return NextResponse.json({ error: "Invalid paid_by value." }, { status: 400 });
    }
    update.paid_by = body.paidBy;
  }
  if (body.checkupStatus) {
    if (!["not_started", "pending_checkup", "completed"].includes(body.checkupStatus)) {
      return NextResponse.json({ error: "Invalid checkup status." }, { status: 400 });
    }
    update.checkup_status = body.checkupStatus;
  }
  if (body.stripeSessionId) update.stripe_session_id = body.stripeSessionId;

  const { data, error } = await supabase
    .from("checkup_requests")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update the request." }, { status: 500 });
  }

  return NextResponse.json(data);
}
