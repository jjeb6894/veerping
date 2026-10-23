import { authorizeCheckup, json, tokenHash } from "@/lib/checkup-server";
import { stripeClient } from "@/lib/checkup-payment";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCheckup(request, (await ctx.params).id);
  if (auth.response) return auth.response;
  const { row, role, db } = auth;
  if (row!.payment_status === "paid") return json({ error: "This checkup is already paid." }, 409);
  if (role === "buyer" && !row!.buyer_payment_intent) return json({ error: "Buyer did not choose to pay." }, 403);
  const body = await request.json().catch(() => ({}));
  const sellerToken = role === "buyer" && typeof body.sellerToken === "string" && /^[0-9a-f]{64}$/.test(body.sellerToken) && tokenHash(body.sellerToken) === row!.seller_access_hash ? body.sellerToken : null;
  try {
    const priceId = process.env.STRIPE_PRICE_CHECKUP;
    if (!priceId) return json({ error: "Checkup price is not configured." }, 503);
    const stripe = stripeClient();
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || !price.unit_amount || !price.currency || !price.product || typeof price.product !== "string" || price.recurring) return json({ error: "Checkup price is unavailable." }, 503);
    const { data: attempt, error } = await db!.from("checkup_payments").insert({ request_id: row!.id, payer: role, price_id: price.id, product_id: price.product, amount: price.unit_amount, currency: price.currency, livemode: price.livemode }).select("id").single();
    if (error || !attempt) throw new Error("Could not save payment attempt");
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment", line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/checkup/${row!.id}?session_id={CHECKOUT_SESSION_ID}#${role}=${auth.token}${sellerToken ? `&seller=${sellerToken}` : ""}`,
      cancel_url: `${origin}/checkup/${row!.id}?checkout=cancelled#${role}=${auth.token}${sellerToken ? `&seller=${sellerToken}` : ""}`,
      client_reference_id: row!.id,
      metadata: { product: "tcl-vehicle-checkup", checkupRequestId: row!.id, paidBy: role!, attemptId: attempt.id },
    });
    const saved = await db!.from("checkup_payments").update({ stripe_session_id: session.id }).eq("id", attempt.id);
    if (saved.error) throw saved.error;
    return json({ url: session.url, amount: price.unit_amount, currency: price.currency });
  } catch { return json({ error: "Payment could not be started." }, 503); }
}
