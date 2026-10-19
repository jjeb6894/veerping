"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ADAPTERS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  adapterLogoDomain,
  groupAdaptersByCategory,
} from "@/lib/adapters";
import { BrandLetterCycle } from "@/components/BrandLetterCycle";
import { LogoBubble } from "@/components/LogoBubble";
import { CheckProgress, PREVIEW_MIN_MS } from "@/components/CheckProgress";
import type { TrustScoreResult } from "@/types";

function isValidListingUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function storeCachedResult(result: TrustScoreResult) {
  try {
    sessionStorage.setItem(`templatechecklist:check-result:${result.url}`, JSON.stringify(result));
  } catch { /* Cache is best-effort; the results page falls back to fetching. */ }
}

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlatform = searchParams.get("platform") ?? "";
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState(initialPlatform);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [requestDone, setRequestDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptUrl, setAttemptUrl] = useState<string | null>(null);
  const loadId = useRef(0);
  const navigationTimer = useRef(0);

  const grouped = useMemo(() => groupAdaptersByCategory(), []);

  useEffect(() => () => window.clearTimeout(navigationTimer.current), []);

  // Reveal only once BOTH conditions hold: the request completed result and
  // at least seven seconds have elapsed since the check started.
  useEffect(() => {
    if (!requestDone || !loading || !attemptUrl) return;
    const remaining = Math.max(0, PREVIEW_MIN_MS - (performance.now() - startedAt));
    navigationTimer.current = window.setTimeout(() => {
      router.push(`/results?url=${encodeURIComponent(attemptUrl)}`);
    }, remaining + 600);
    return () => window.clearTimeout(navigationTimer.current);
  }, [requestDone, loading, attemptUrl, startedAt, router]);

  async function runCheck(target: string) {
    const currentId = ++loadId.current;
    setError(null);
    setRequestDone(false);
    setAttemptUrl(target);
    setLoading(true);
    setStartedAt(performance.now());

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await response.json().catch(() => ({}));
      if (loadId.current !== currentId) return;
      if (!response.ok) {
        setError(data.error ?? "Could not prepare that link. Please check the link and try again.");
        setAttemptUrl(target);
        setLoading(false);
        return;
      }
      const result = data as TrustScoreResult;
      storeCachedResult(result);
      setRequestDone(true);
    } catch {
      if (loadId.current !== currentId) return;
      setError("Something went wrong preparing the report. Please try again in a moment.");
      setAttemptUrl(target);
      setLoading(false);
    }
  }

  function openReport(value: string) {
    const pasted = value.trim();
    if (!pasted || !isValidListingUrl(pasted)) {
      setError("Please enter a valid listing link.");
      return;
    }
    setError(null);
    void runCheck(pasted);
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
              disabled={loading}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={(e) => {
                if (loading) return;
                const pasted = e.clipboardData.getData("text").trim();
                if (pasted) {
                  e.preventDefault();
                  setUrl(pasted);
                  openReport(pasted);
                }
              }}
              aria-label="Car listing link"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "listing-url-error" : undefined}
              placeholder="https://www.autotrader.co.uk/car-details/…"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3.5 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Preparing preview…" : "Preview this vehicle"}
            </button>
          </div>

          {loading && <div className="mt-4"><CheckProgress startedAt={startedAt} requestDone={requestDone} /></div>}

          {error && (
            <div id="listing-url-error" className="mt-4 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
              <p role="alert" className="text-sm font-medium text-red-600">{error}</p>
              {!loading && (
                <button
                  type="button"
                  onClick={() => attemptUrl && runCheck(attemptUrl)}
                  className="mt-2 text-sm font-semibold text-red-700 underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </form>

        {!loading && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            After you submit, listing details and seller ratings are shown only when the source provides them. Missing fields stay marked as unavailable.
          </p>
        )}

        {!loading && (
          <>
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
          </>
        )}
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