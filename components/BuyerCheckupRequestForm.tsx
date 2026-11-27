"use client";
import { useState } from "react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/max";
import { privatePhone } from "@/lib/checkup-contact";
import { parseAutoTraderCsv, parseUkAutotraderList } from "@/lib/autotrader-list";

type ListingChoice = { url: string; selected: boolean };
type CreatedRequest = { url: string; buyerUrl: string; sellerUrl: string };

export function BuyerCheckupRequestForm() {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [country, setCountry] = useState<CountryCode>("GB");
  const [whatsapp, setWhatsapp] = useState("");
  const [pasted, setPasted] = useState("");
  const [listings, setListings] = useState<ListingChoice[]>([]);
  const [created, setCreated] = useState<CreatedRequest[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [importSummary, setImportSummary] = useState("");

  async function importCsv(file?: File) {
    if (!file) return;
    setError("");
    try {
      const { urls, duplicates, unsupported } = parseAutoTraderCsv(await file.text());
      setListings(previous => {
        const existing = new Set(previous.map(item => item.url));
        const added = urls.filter(url => !existing.has(url)).map(url => ({ url, selected: false }));
        const alreadyImported = urls.length - added.length;
        setImportSummary(`Added ${added.length} vehicle links · ${duplicates + alreadyImported} duplicates · ${unsupported} unsupported rows`);
        return [...previous, ...added];
      });
      setPage(0);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not read this CSV."); }
  }

  function addListings() {
    const parsed = parseUkAutotraderList(pasted);
    if (!parsed.length) { setError("Paste at least one AutoTrader UK vehicle listing link."); return; }
    setListings(previous => {
      const existing = new Set(previous.map(item => item.url));
      const added = parsed.filter(url => !existing.has(url)).map(url => ({ url, selected: false }));
      setImportSummary(`Added ${added.length} listings from pasted links`);
      return [...previous, ...added];
    });
    setPasted(""); setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try {
      if (choice === null) throw new Error("Choose a payment preference.");
      privatePhone(country, whatsapp);
      const selected = listings.filter(item => item.selected && !created.some(result => result.url === item.url));
      if (!selected.length) throw new Error("Select at least one listing that has not already been prepared.");
      setWorking(true);
      const next: CreatedRequest[] = [];
      for (const listing of selected) {
        const response = await fetch("/api/checkup-requests", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country, whatsapp, url: listing.url, paymentIntent: choice }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not prepare a request.");
        next.push({ url: listing.url, buyerUrl: data.buyerUrl, sellerUrl: data.sellerUrl });
        setCreated(previous => [...previous, next[next.length - 1]]);
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not prepare the requests."); }
    finally { setWorking(false); }
  }



  return <div className="space-y-6"><form onSubmit={submit} className="mt-10 rounded-3xl border border-blue-100 bg-white p-5 shadow-lg shadow-blue-100/60 sm:p-6">
    <fieldset className="space-y-3"><legend className="mb-3 text-sm font-semibold text-slate-900">Would you pay the contact-access fee?</legend>
      {([true, false] as const).map(value => <label key={String(value)} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${choice === value ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
        <input type="radio" name="payment-choice" required checked={choice === value} onChange={() => setChoice(value)} className="h-5 w-5 accent-emerald-600" />
        <span aria-hidden="true" className="w-4">{choice === value ? "\u2713" : ""} </span>{value ? "Yes, I would pay to unlock the WhatsApp contact." : "No, I would not pay for contact access."}
      </label>)}
    </fieldset>
    <div className="mt-5"><label htmlFor="whatsapp" className="text-sm font-semibold text-slate-900">Your WhatsApp number</label>
      <div className="mt-2 flex gap-2"><select aria-label="Country code" value={country} onChange={e => setCountry(e.target.value as CountryCode)} className="w-40 rounded-xl border border-slate-200 px-2 py-3">
        {getCountries().map(code => <option value={code} key={code}>{code} +{getCountryCallingCode(code)}</option>)}
      </select><input id="whatsapp" type="tel" required autoComplete="tel-national" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3" placeholder="National number" /></div>
      <p className="mt-2 text-xs text-slate-500">Your name is not shown. The seller sees only your country code and first three digits until payment is verified.</p>
    </div>
    <label htmlFor="listing-links" className="mt-5 block text-sm font-semibold text-slate-900">Your AutoTrader UK vehicle list</label>
    <label htmlFor="csv-file" className="mt-3 block text-sm text-slate-700">Import your CSV file</label>
    <input id="csv-file" type="file" accept=".csv,text/csv" onChange={event => void importCsv(event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" />
    {importSummary && <p role="status" className="mt-2 text-sm text-slate-600">{importSummary}. Listing details are not fetched.</p>}
    <textarea id="listing-links" value={pasted} onChange={e => setPasted(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Paste one AutoTrader UK listing link per line" />
    <button type="button" onClick={addListings} className="mt-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">Add listings to choose from</button>
    {listings.length > 0 && <fieldset className="mt-5 space-y-2"><legend className="text-sm font-semibold">Choose the vehicles you want to see ({listings.filter(i => i.selected).length} selected of {listings.length})</legend>
      <button type="button" onClick={() => { const visible = new Set(listings.slice(page * 50, page * 50 + 50).map(item => item.url)); setListings(previous => previous.map(item => visible.has(item.url) ? { ...item, selected: !previous.filter(v => visible.has(v.url)).every(v => v.selected) } : item)); }} className="rounded-lg border px-3 py-2 text-sm">Select / clear this page</button>
      {listings.slice(page * 50, page * 50 + 50).map((item, index) => <label key={item.url} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
        <input type="checkbox" checked={item.selected} onChange={e => setListings(previous => previous.map(entry => entry.url === item.url ? { ...entry, selected: e.target.checked } : entry))} className="mt-1 h-4 w-4" />
        <span className="break-all">{item.url}{created.some(result => result.url === item.url) && <span className="ml-2 text-emerald-700">Prepared</span>}</span>
      </label>)}
      <div className="flex items-center justify-between pt-2 text-sm"><button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {page + 1} of {Math.ceil(listings.length / 50)}</span><button type="button" disabled={(page + 1) * 50 >= listings.length} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div>
    </fieldset>}
    <p className="mt-4 text-xs text-slate-500">The app prepares a separate viewing request for each selection. Submitting creates private request pages and drafts only; it does not message any seller.</p>
    <button disabled={working} type="submit" className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60">{working ? "Preparing requests..." : "Prepare requests to view selected vehicles"}</button>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </form>
  {created.length > 0 && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6"><h2 className="text-xl font-bold text-emerald-900">Requests prepared</h2><p className="mt-2 text-sm">These have not been sent. AutoTrader messaging is not connected; this page only prepares drafts.</p>
    <ul className="mt-4 space-y-4">{created.map(result => <li key={result.buyerUrl} className="rounded-xl border border-emerald-200 bg-white p-4">
      <p className="break-all text-sm font-medium">{result.url}</p><div className="mt-3 flex flex-wrap gap-2">
        <a href={result.buyerUrl} className="rounded-xl border border-emerald-600 px-4 py-2 text-sm">Open your request</a>
      </div></li>)}</ul>
  </section>}
  </div>;
}
