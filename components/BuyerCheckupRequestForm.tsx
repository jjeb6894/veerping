"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/max";
import { buyerName, privatePhone } from "@/lib/checkup-contact";

export function BuyerCheckupRequestForm() {
  const router = useRouter();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState<CountryCode>("GB");
  const [whatsapp, setWhatsapp] = useState("");
  const [url, setUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try {
      if (choice === null) throw new Error("Choose a payment preference.");
      buyerName(name); privatePhone(country, whatsapp);
      setWorking(true);
      const response = await fetch("/api/checkup-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, country, whatsapp, url, paymentIntent: choice }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create the seller page.");
      router.push(data.buyerUrl);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not create the seller page."); setWorking(false); }
  }
  return <form onSubmit={submit} className="mt-10 rounded-3xl border border-blue-100 bg-white p-5 shadow-lg shadow-blue-100/60 sm:p-6">
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold text-slate-900">Who will pay for the report?</legend>
      {([true, false] as const).map(value => <label key={String(value)} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${choice === value ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
        <input type="radio" name="payment-choice" required checked={choice === value} onChange={() => setChoice(value)} className="h-5 w-5 accent-emerald-600" />
        <span aria-hidden="true" className="w-4">{choice === value ? "✓" : ""}</span>
        Buyer is {value ? "" : "not "}willing to pay for the report.
      </label>)}
    </fieldset>
    <label className="mt-5 block text-sm font-semibold text-slate-900">Your name
      <input required value={name} onChange={e => setName(e.target.value)} maxLength={60} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Your name" />
    </label>
    <div className="mt-5"><label htmlFor="whatsapp" className="text-sm font-semibold text-slate-900">WhatsApp contact number</label>
      <div className="mt-2 flex gap-2"><select aria-label="Country code" value={country} onChange={e => setCountry(e.target.value as CountryCode)} className="w-40 rounded-xl border border-slate-200 px-2 py-3">
        {getCountries().map(code => <option value={code} key={code}>{code} +{getCountryCallingCode(code)}</option>)}
      </select><input id="whatsapp" type="tel" required autoComplete="tel-national" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3" placeholder="National number" /></div>
      <p className="mt-2 text-xs text-slate-500">The seller sees only your country code and first three digits until payment is verified. Your full number then becomes visible.</p>
    </div>
    <label className="mt-5 block text-sm font-semibold text-slate-900">Vehicle listing link
      <input type="url" required value={url} onChange={e => setUrl(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="https://www.autotrader.co.uk/car-details/…" />
    </label>
    <p className="mt-4 text-xs text-slate-500">We’ll create your message automatically. You can share the seller link after the page is created.</p>
    <button disabled={working} type="submit" className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60">{working ? "Creating seller page…" : "Create seller page"}</button>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </form>;
}
