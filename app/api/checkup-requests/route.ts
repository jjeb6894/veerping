import { detectPlatform } from "@/lib/adapters";
import { fetchAutoTraderListing } from "@/lib/listing-parser";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { buyerName, privatePhone, redactContact } from "@/lib/checkup-contact";
import { accessToken, json, tokenHash } from "@/lib/checkup-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  try {
    if (typeof body.paymentIntent !== "boolean") return json({ error: "Choose a payment preference." }, 400);
    const name = buyerName(body.name);
    const contact = privatePhone(body.country, body.whatsapp);
    const url = new URL(body.url);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !detectPlatform(url.toString())) return json({ error: "Enter a supported HTTPS listing link." }, 422);
    url.search = ""; url.hash = "";
    const db = getAdminSupabase();
    if (!db) return json({ error: "Request storage is not connected." }, 503);
    const listing = detectPlatform(url.toString())?.id === "autotrader" ? await fetchAutoTraderListing(url.toString()) : undefined;
    const buyerToken = accessToken(), sellerToken = accessToken();
    const { data: id, error } = await db.rpc("create_private_checkup", {
      request_data: {
        vehicle_link: url.toString(), vehicle_title: redactContact(listing?.title),
        vehicle_price: redactContact(listing?.price),
        vehicle_summary: redactContact([listing?.year, listing?.make, listing?.model, listing?.mileage].filter(Boolean).join(" · ")),
        vehicle_images: (listing?.images ?? []).filter(image => { try { return new URL(image).protocol === "https:"; } catch { return false; } }).slice(0, 8),
        buyer_name: name, buyer_payment_intent: body.paymentIntent,
        buyer_access_hash: tokenHash(buyerToken), seller_access_hash: tokenHash(sellerToken), contact_masked: contact.masked,
      }, phone: contact.full,
    });
    if (error || !id) return json({ error: "Could not save the seller page." }, 503);
    return json({ sellerUrl: `/checkup/${id}#seller=${sellerToken}`, buyerUrl: `/checkup/${id}#buyer=${buyerToken}&seller=${sellerToken}` }, 201);
  } catch (error) {
    return json({ error: error instanceof Error && /^(Enter|Use|Choose)/.test(error.message) ? error.message : "Check the information and try again." }, 400);
  }
}
