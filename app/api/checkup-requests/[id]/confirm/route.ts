import { authorizeCheckup, json } from "@/lib/checkup-server";
import { stripeClient, verifyCheckupSession } from "@/lib/checkup-payment";
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCheckup(request, (await ctx.params).id);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (typeof body.sessionId !== "string" || !/^cs_/.test(body.sessionId)) return json({ paid: false }, 400);
  try {
    const { data: attempt } = await auth.db!.from("checkup_payments").select("request_id,payer").eq("stripe_session_id", body.sessionId).maybeSingle();
    if (!attempt || attempt.request_id !== auth.row!.id || attempt.payer !== auth.role) return json({ paid: false }, 403);
    return json({ paid: await verifyCheckupSession(stripeClient(), body.sessionId) });
  } catch { return json({ error: "Could not verify payment." }, 503); }
}
