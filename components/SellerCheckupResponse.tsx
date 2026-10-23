"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { CheckupView, AccessRole } from "@/types/checkup";

export function SellerCheckupResponse({ requestId }: { requestId: string }) {
  const [view, setView] = useState<CheckupView | null>(null);
  const [role, setRole] = useState<AccessRole | null>(null);
  const [token, setToken] = useState("");
  const [sellerToken, setSellerToken] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const load = useCallback(async (access: string) => {
    const response = await fetch(`/api/checkup-requests/${requestId}`, { headers: { Authorization: `Bearer ${access}` }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not open this page.");
    setView(data);
  }, [requestId]);
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const buyer = fragment.get("buyer"), seller = fragment.get("seller");
    const access = buyer ?? seller;
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    const refresh = async () => {
      if (!access) throw new Error("Open the complete private access link.");
      if (sessionId) await fetch(`/api/checkup-requests/${requestId}/confirm`, { method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      await load(access);
      setRole(buyer ? "buyer" : "seller"); setToken(access); setSellerToken(seller ?? "");
    };
    refresh().catch(e => setError(e.message));
  }, [requestId, load]);
  async function checkout() {
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/checkup-requests/${requestId}/checkout`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sellerToken }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? "Could not start payment.");
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start payment."); setWorking(false); }
  }
  async function respond(sellerResponse: string) {
    setWorking(true); setError("");
    const response = await fetch(`/api/checkup-requests/${requestId}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sellerResponse }) });
    if (response.ok) await load(token); else setError("Could not save your response.");
    setWorking(false);
  }
  if (error && !view) return <p role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700">{error}</p>;
  if (!view) return <p role="status" className="py-20 text-center">Loading the seller page…</p>;
  const sellerUrl = `${window.location.origin}/checkup/${requestId}#seller=${sellerToken}`;
  return <div className="space-y-6">
    {role === "buyer" && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><h1 className="text-xl font-bold text-emerald-900">Seller page created</h1><p className="mt-2 text-sm">Share this private link with the seller. No message has been delivered yet.</p><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => navigator.clipboard.writeText(sellerUrl)} className="rounded-xl bg-emerald-600 px-4 py-3 text-white">Copy seller link</button><a href={sellerUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-600 px-4 py-3 text-emerald-800">Open seller page</a></div></section>}
    <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">TCL vehicle checkup request</p><h2 className="mt-2 text-2xl font-bold">{view.vehicle.title ?? "Vehicle title unavailable"}</h2>
      <p className="mt-3">Price: {view.vehicle.price ?? "Unavailable"}</p><p className="mt-2">Summary: {view.vehicle.summary ?? "Unavailable"}</p>
      {view.vehicle.images.length ? <div className="mt-4 grid grid-cols-2 gap-3">{view.vehicle.images.map((src, i) => <Image key={src} src={src} alt={`Vehicle photo ${i + 1}`} width={600} height={338} unoptimized className="aspect-video w-full rounded-xl object-cover" />)}</div> : <p className="mt-3 text-sm text-slate-500">Photos unavailable</p>}
      <a href={view.vehicle.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-blue-700 underline">Open original listing</a>
    </section>
    <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"><h2 className="font-bold">Message from potential buyer</h2><p className="mt-3 rounded-xl bg-slate-50 p-4">{view.message}</p>
      <p className="mt-4 font-semibold">WhatsApp: {view.contact.full ?? view.contact.masked ?? "Unavailable"}</p>
      {view.contact.whatsappUrl ? <a href={view.contact.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-xl bg-emerald-600 px-4 py-3 text-white">Contact buyer on WhatsApp</a> : <p className="mt-2 text-sm text-slate-600">Full contact becomes visible after payment is verified.</p>}
    </section>
    <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"><h2 className="font-bold">Buyer payment choice</h2><p className="mt-2">Buyer is {view.buyerWillingToPay ? "" : "not "}willing to pay for the report. This is a preference, not a completed payment.</p><p className="mt-2">Payment: {view.paymentStatus === "paid" ? `Verified, paid by ${view.paidBy}` : "Not paid"}</p><p className="mt-2">Checkup: {view.checkupStatus.replaceAll("_", " ")}</p>
      {view.paymentStatus !== "paid" && (role === "seller" || view.buyerWillingToPay) && <button disabled={working} onClick={checkout} className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-white disabled:opacity-60">Pay for checkup as {role}</button>}
      {role === "seller" && <div className="mt-4 flex flex-wrap gap-2">{(["available", "available_no_checkup", "unavailable"] as const).map(value => <button key={value} disabled={working} onClick={() => respond(value)} className="rounded-xl border border-blue-200 px-4 py-2">{value.replaceAll("_", " ")}</button>)}</div>}
      {view.sellerResponse && <p className="mt-3">Seller response: {view.sellerResponse.replaceAll("_", " ")}</p>}{error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
    </section>
  </div>;
}
