"use client";

import { useState, type FormEvent } from "react";
import { cleanEnteredListing, suggestListingDetails, type EnteredListing } from "@/lib/listing-input";

const fields: { key: keyof EnteredListing; label: string; placeholder: string }[] = [
  { key: "title", label: "Vehicle and trim", placeholder: "2022 Honda Civic EX" },
  { key: "price", label: "Price", placeholder: "$24,995" },
  { key: "mileage", label: "Mileage", placeholder: "18,342 miles" },
  { key: "seller", label: "Dealer or seller", placeholder: "Dealer name" },
  { key: "location", label: "Seller location", placeholder: "Austin, TX" },
  { key: "vin", label: "VIN (optional)", placeholder: "17-character VIN" },
];

export function ListingDetailsEditor({ initial, onSave }: {
  initial: EnteredListing;
  onSave: (details: EnteredListing) => void;
}) {
  const [draft, setDraft] = useState<EnteredListing>(initial);
  const [copiedText, setCopiedText] = useState("");
  const [saved, setSaved] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = cleanEnteredListing(draft);
    if (!details.title) return;
    onSave(details);
    setSaved(true);
  }

  return (
    <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <summary className="cursor-pointer font-semibold text-brand-700">Add or correct listing details</summary>
      <p className="mt-3 text-sm text-slate-600">
        Open the listing in your browser. Copy its visible details, paste them below, then check each suggested field before saving.
        This is useful when AutoTrader blocks the automatic lookup.
      </p>
      <form onSubmit={save} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700" htmlFor="copied-listing">
          Copied listing text (optional)
        </label>
        <textarea id="copied-listing" value={copiedText} onChange={event => setCopiedText(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" rows={4} maxLength={100000}
          placeholder="Paste copied details from the listing page" />
        <button type="button" onClick={() => { setDraft(previous => ({ ...previous, ...suggestListingDetails(copiedText) })); setSaved(false); }}
          disabled={!copiedText.trim()} className="rounded-lg border border-brand-600 px-3 py-2 text-sm font-semibold text-brand-700 disabled:opacity-50">
          Suggest fields from text
        </button>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(({ key, label, placeholder }) => (
            <label key={key} className="block text-sm font-medium text-slate-700">
              {label}
              <input value={draft[key] ?? ""} onChange={event => { setDraft(previous => ({ ...previous, [key]: event.target.value })); setSaved(false); }}
                maxLength={160} placeholder={placeholder} required={key === "title"}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
          ))}
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save details to this report</button>
        {saved && <p role="status" className="text-sm text-emerald-700">Saved in this browser for this listing.</p>}
      </form>
    </details>
  );
}
