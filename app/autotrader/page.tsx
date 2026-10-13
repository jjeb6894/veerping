"use client";

import { useState } from "react";

export default function AutotraderPage() {
  const [url, setUrl] = useState("");
  const [listingUrl, setListingUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim()) {
      setListingUrl(url.trim());
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900">AutoTrader Listing</h1>
      <p className="mt-2 text-slate-600">Paste an AutoTrader listing link to bring it up.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.autotrader.co.uk/car-details/…"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          Bring up listing
        </button>
      </form>

      {listingUrl && (
        <div className="mt-8">
          <p className="mb-4 text-sm text-slate-600">
            Listing: <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">{listingUrl}</a>
          </p>
          <iframe
            src={listingUrl}
            title="AutoTrader listing"
            className="h-[600px] w-full rounded-xl border border-slate-200"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
