"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  ADAPTERS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  adapterLogoDomain,
  groupAdaptersByCategory,
} from "@/lib/adapters";
import { BrandLetterCycle } from "@/components/BrandLetterCycle";
import { LogoBubble } from "@/components/LogoBubble";

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlatform = searchParams.get("platform") ?? "";
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState(initialPlatform);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => groupAdaptersByCategory(), []);

  function openReport(value: string) {
    const pasted = value.trim();
    try {
      const parsed = new URL(pasted);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    } catch {
      setError("Please enter a valid listing link.");
      return;
    }
    setError(null);
    setLoading(true);
    router.push(`/results?url=${encodeURIComponent(pasted)}`);
  }

  function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    openReport(url);
  }

  const filteredPlatforms = ADAPTERS.filter((a) =>
    query ? a.name.toLowerCase().includes(query.toLowerCase()) : true
  ).filter((a) => (platformFilter ? a.id === platformFilter : true));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 via-white to-emerald-50/60">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Vehicle report template
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Paste a listing link</h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
          Paste a car listing link to start the preview. We’ll show the details and photos we can read
          and clearly mark any checks that aren’t available yet.
        </p>

        <form onSubmit={handlePasteSubmit} className="mt-10 rounded-3xl border border-blue-100 bg-white p-5 shadow-lg shadow-blue-100/60 sm:p-6">
          <label htmlFor="listing-url" className="text-sm font-semibold text-slate-900">AutoTrader listing link</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="listing-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").trim();
                if (pasted) {
                  e.preventDefault();
                  setUrl(pasted);
                  openReport(pasted);
                }
              }}
              aria-label="Car listing link"
              placeholder="https://www.autotrader.co.uk/car-details/…"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Preparing preview…" : "Preview this vehicle"}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <p className="mt-3 text-xs leading-5 text-slate-500">
          After you submit, listing details and seller ratings are shown only when the source provides them. Missing fields stay marked as unavailable.
        </p>

        <div className="mt-12 rounded-2xl bg-white/70 p-4">
          <BrandLetterCycle />
        </div>

        <div className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Supported sources</h2>
            <input
              type="search"
              placeholder="Search platforms…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          {platformFilter && (
            <button
              onClick={() => setPlatformFilter("")}
              className="mt-3 text-xs font-medium text-blue-600 hover:underline"
            >
              Clear filter ({ADAPTERS.find((a) => a.id === platformFilter)?.name})
            </button>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {CATEGORY_ORDER.map((category) => {
              const items = grouped[category].filter((a) => filteredPlatforms.includes(a));
              if (items.length === 0) return null;
              return (
                <div key={category} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {CATEGORY_LABELS[category]}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {items.map((adapter) => (
                      <li key={adapter.id}>
                        <button
                          onClick={() => setPlatformFilter(adapter.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <LogoBubble name={adapter.name} domain={adapterLogoDomain(adapter)} size={24} />
                          {adapter.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchForm />
    </Suspense>
  );
}
