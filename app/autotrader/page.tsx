"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { ScoreGauge } from "@/components/ScoreGauge";
import { TrustBadge } from "@/components/TrustBadge";
import type { TrustScoreResult } from "@/types";

export default function AutotraderPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<TrustScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load that listing.");
        return;
      }
      setResult(data as TrustScoreResult);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const listing = result?.listing;
  const images = listing?.images ?? [];
  const title = listing?.title ?? result?.platformName + " listing";
  const price = listing?.price;
  const previewUrl = result ? `/results?url=${encodeURIComponent(result.url)}` : "#";
  const pricingUrl = result ? `/pricing?url=${encodeURIComponent(result.url)}` : "#";

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900">AutoTrader Listing</h1>
      <p className="mt-2 text-slate-600">
        Paste an AutoTrader listing link to pull the photos, add our logo, and show the trust score preview.
      </p>

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
          disabled={loading}
          className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? "Loading…" : "Bring up listing"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      {result && (
        <div className="mt-10 space-y-8">
          {/* Full link preview card with logo-overlaid image and trust score */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative">
              {images[0] ? (
                <div className="relative h-64 w-full bg-slate-100">
                  <img
                    src={images[0]}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 shadow-md ring-1 ring-slate-200">
                    <LogoMark className="h-6 w-6" />
                    <span className="text-xs font-semibold text-slate-800">TemplateChecklist</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center bg-slate-100 text-slate-400">
                  No photo available
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                    Link preview
                  </p>
                  <h2 className="mt-1 truncate text-xl font-bold text-slate-900">{title}</h2>
                  {price && <p className="mt-1 text-lg font-semibold text-slate-700">{price}</p>}
                  <p className="mt-1 truncate text-sm text-slate-500">{result.url}</p>
                </div>
                <div className="shrink-0 text-center">
                  <ScoreGauge score={result.score} tier={result.tier} size={100} />
                  <TrustBadge tier={result.tier} label={result.tierLabel} size="sm" />
                </div>
              </div>

              {listing?.sourceStatus === "extracted" ? (
                <p className="mt-4 text-xs text-slate-500">
                  Photos and details pulled from the AutoTrader listing. Logo added for branding.
                </p>
              ) : (
                <p className="mt-4 text-xs text-amber-700">
                  {listing?.sourceMessage ?? "Could not fully extract listing details."}
                </p>
              )}
            </div>
          </div>

          {/* Additional photos with logo overlay */}
          {images.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900">More photos</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.slice(1, 7).map((img, i) => (
                  <div key={i} className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
                    <img src={img} alt={`Photo ${i + 2}`} className="h-full w-full object-cover" />
                    <div className="absolute bottom-1.5 right-1.5">
                      <LogoMark className="h-5 w-5 rounded-md bg-white/90 p-0.5 shadow" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full trust score */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Full Trust Score</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Aggregate score based on the available checks for this listing.
                </p>
              </div>
              <div className="text-center">
                <ScoreGauge score={result.score} tier={result.tier} size={140} label={result.tierLabel} />
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link
                href={previewUrl}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                View full report preview →
              </Link>
            </div>
          </div>

          {/* Pay £9.99 to unlock */}
          <div className="rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100">
            <p className="text-sm font-semibold text-slate-900">Unlock the complete report</p>
            <p className="mt-1 text-sm text-slate-600">
              Pay £9.99 to unlock the remaining verification checks and the full report for this listing.
            </p>
            <Link
              href={pricingUrl}
              className="mt-4 inline-flex rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Unlock complete report · £9.99
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
