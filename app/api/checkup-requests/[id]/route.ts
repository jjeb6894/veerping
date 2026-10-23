import { authorizeCheckup, checkupView, json } from "@/lib/checkup-server";
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCheckup(request, (await ctx.params).id);
  if (auth.response) return auth.response;
  try { return json(await checkupView(auth)); }
  catch { return json({ error: "Could not load the request." }, 503); }
}
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCheckup(request, (await ctx.params).id);
  if (auth.response) return auth.response;
  if (auth.role !== "seller") return json({ error: "Seller access required." }, 403);
  const body = await request.json().catch(() => ({}));
  if (Object.keys(body).length !== 1 || !["available", "unavailable", "available_no_checkup"].includes(body.sellerResponse)) {
    return json({ error: "Only a seller response can be changed here." }, 400);
  }
  const { error } = await auth.db!.from("checkup_requests").update({ seller_response: body.sellerResponse, updated_at: new Date().toISOString() }).eq("id", auth.row!.id);
  return error ? json({ error: "Could not save the response." }, 503) : json({ sellerResponse: body.sellerResponse });
}
