import { isUkAutotraderVehicleLink } from "@/lib/autotrader-list";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { privatePhone } from "@/lib/checkup-contact";
import { accessToken, json, tokenHash } from "@/lib/checkup-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    if (typeof body.paymentIntent !== "boolean") return json({ error: "Choose a payment preference." }, 400);
    const contact = privatePhone(body.country, body.whatsapp);
    const url = new URL(body.url);
    if (!isUkAutotraderVehicleLink(url.toString())) {
      return json({ error: "Enter an AutoTrader UK vehicle listing link." }, 422);
    }
    url.search = ""; url.hash = "";
    const db = getAdminSupabase();
    if (!db) return json({ error: "Request storage is not connected." }, 503);
    const buyerToken = accessToken(), sellerToken = accessToken();
    const { data: id, error } = await db.rpc("create_private_checkup", {
      request_data: {
        vehicle_link: url.toString(), vehicle_title: null,
        vehicle_price: null,
        vehicle_summary: null,
        vehicle_images: [],
        buyer_name: null, buyer_payment_intent: body.paymentIntent,
        buyer_access_hash: tokenHash(buyerToken), seller_access_hash: tokenHash(sellerToken), contact_masked: contact.masked,
      }, phone: contact.full,
    });
    if (error || !id) return json({ error: "Could not save the seller page." }, 503);
    return json({ sellerUrl: `/checkup/${id}#seller=${sellerToken}`, buyerUrl: `/checkup/${id}#buyer=${buyerToken}&seller=${sellerToken}` }, 201);
  } catch (error) {
    return json({ error: error instanceof Error && /^(Enter|Use|Choose)/.test(error.message) ? error.message : "Check the information and try again." }, 400);
  }
}
