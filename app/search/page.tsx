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

  const grouped = useMemo(groupAdaptersByCategory, []);

  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a car listing URL first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not prepare that listing.");
        setLoading(false);
        return;
      }
      router.push(`/results?url=${encodeURIComponent(url)}`);
    } catch {
      setError("Something went wrong preparing the report. Please try again.");
      setLoading(false);
    }
  }

  const filteredPlatforms = ADAPTERS.filter((a) =>
    query ? a.name.toLowerCase().includes(query.toLowerCase()) : true
  ).filter((a) => (platformFilter ? a.id === platformFilter : true));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
        Vehicle report template
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Paste a listing link</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Start with an AutoTrader UK or US car listing. We’ll create an empty report template,
        fill in the details we can read, and leave the remaining verification ready to unlock.
      </p>

      <BrandLetterCycle />

      <form onSubmit={handlePasteSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Car listing link"
          placeholder="https://www.autotrader.co.uk/car-details/…"
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "Preparing preview…" : "Build report preview"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      <p className="mt-3 text-xs leading-5 text-slate-500">
        After you submit, listing details and seller ratings are shown only when the source provides them. Missing fields stay marked as unavailable.
      </p>

      <div className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Supported sources</h2>
          <input
            type="search"
            placeholder="Search platforms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>

        {platformFilter && (
          <button
            onClick={() => setPlatformFilter("")}
            className="mt-3 text-xs font-medium text-brand-600 hover:underline"
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
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchForm />
    </Suspense>
  );
}

