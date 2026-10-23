import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { detectPlatform } from "@/lib/adapters";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    paymentIntent?: boolean;
    note?: string;
    title?: string;
  };

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  if (!detectPlatform(url)) {
    return NextResponse.json({ error: "Unsupported listing link." }, { status: 422 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Request storage is not connected on this deployment." },
      { status: 501 }
    );
  }

  const { data, error } = await supabase
    .from("checkup_requests")
    .insert({
      vehicle_link: url,
      vehicle_title: body.title ?? null,
      buyer_payment_intent: Boolean(body.paymentIntent),
      buyer_note: body.note?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create the request." }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    sellerUrl: `/checkup/${data.id}`,
  });
}
