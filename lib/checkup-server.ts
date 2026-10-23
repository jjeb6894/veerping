import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { buyerMessage, buyerName, redactContact } from "@/lib/checkup-contact";
import type { AccessRole, CheckupView } from "@/types/checkup";

export const noStore = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" };
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });
export const accessToken = () => randomBytes(32).toString("hex");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const REQUEST_FIELDS = "id,vehicle_link,vehicle_title,vehicle_price,vehicle_summary,vehicle_images,buyer_name,buyer_payment_intent,contact_masked,buyer_access_hash,seller_access_hash,payment_status,paid_by,seller_response,checkup_status";

export async function authorizeCheckup(request: Request, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { response: json({ error: "Request not found." }, 404) };
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^[0-9a-f]{64}$/.test(token)) return { response: json({ error: "Open the complete private access link." }, 403) };
  const db = getAdminSupabase();
  if (!db) return { response: json({ error: "Request storage is not connected." }, 503) };
  const { data: row, error } = await db.from("checkup_requests").select(REQUEST_FIELDS).eq("id", id).maybeSingle();
  if (error) return { response: json({ error: "Could not load the request." }, 503) };
  const hash = tokenHash(token);
  const matches = (expected: unknown) => typeof expected === "string" && expected.length === hash.length && timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
  const role: AccessRole | null = matches(row?.buyer_access_hash) ? "buyer" : matches(row?.seller_access_hash) ? "seller" : null;
  if (!row || !role) return { response: json({ error: "This access link is invalid." }, 403) };
  return { db, row, role, token };
}

export async function checkupView(auth: Awaited<ReturnType<typeof authorizeCheckup>>): Promise<CheckupView> {
  if (!auth.row || !auth.db || !auth.role) throw new Error("Unauthorized");
  const { row, db, role } = auth;
  let name = "a potential buyer";
  try { name = buyerName(row.buyer_name); } catch { /* Never publish legacy notes or unsafe names. */ }
  const contact: CheckupView["contact"] = { masked: row.contact_masked };
  if (role === "seller" && row.payment_status === "paid") {
    const { data, error } = await db.from("checkup_request_contacts").select("phone_e164").eq("request_id", row.id).maybeSingle();
    if (error) throw new Error("Could not load contact");
    if (data?.phone_e164 && /^\+[1-9]\d{6,14}$/.test(data.phone_e164)) {
      contact.full = data.phone_e164;
      contact.whatsappUrl = `https://wa.me/${data.phone_e164.slice(1)}`;
    }
  }
  return {
    id: row.id, role,
    vehicle: { link: row.vehicle_link, title: redactContact(row.vehicle_title), price: redactContact(row.vehicle_price), summary: redactContact(row.vehicle_summary), images: row.vehicle_images ?? [] },
    buyerWillingToPay: row.buyer_payment_intent, message: buyerMessage(name), contact,
    paymentStatus: row.payment_status, paidBy: row.payment_status === "paid" ? row.paid_by : "none",
    checkupStatus: row.checkup_status, sellerResponse: row.seller_response,
  };
}
