"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ScoreGauge } from "@/components/ScoreGauge";
import { TrustBadge } from "@/components/TrustBadge";
import type { TrustScoreResult } from "@/types";

type ReportQuote = {
  formattedAmount: string;
  currency: string;
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const sessionId = searchParams.get("session_id");
  const [result, setResult] = useState<TrustScoreResult | null>(null);
  const [quote, setQuote] = useState<ReportQuote | null>(null);
  const [paid, setPaid] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setError("No listing URL provided.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [checkResponse, quoteResponse] = await Promise.all([
          fetch("/api/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          }),
          fetch("/api/report-quote"),
        ]);
        const data = await checkResponse.json();
        const quoteData = await quoteResponse.json().catch(() => null);

        if (cancelled) return;
        if (!checkResponse.ok) {
          setError(data.error ?? "Could not prepare that link.");
        } else {
          setResult(data as TrustScoreResult);
          if (quoteResponse.ok && quoteData) setQuote(quoteData as ReportQuote);
        }
      } catch {
        if (!cancelled) setError("Something went wrong preparing the report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!sessionId || !url) return;
    let cancelled = false;
    setPaymentChecking(true);
    fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}&url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.paid === true) setPaid(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setPaymentChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, url]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-slate-500">
        Preparing your empty report template…
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{error ?? "No result found."}</p>
        <Link href="/search" className="mt-4 inline-block text-brand-600 hover:underline">
          Try another link
        </Link>
      </div>
    );
  }

  const previewCount = Math.max(1, Math.ceil(result.checks.length / 2));
  const previewChecks = result.checks.slice(0, previewCount);
  const lockedChecks = paid ? [] : result.checks.slice(previewCount);
  const visibleChecks = paid ? result.checks : previewChecks;
  const reportUrl = `/pricing?url=${encodeURIComponent(result.url)}`;
  const listing = result.listing;
  const listingValue = (value?: string) => value ?? "Unavailable from listing";

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/search" className="text-sm text-brand-600 hover:underline">
        ← Check another car
      </Link>

      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-6 border-b border-slate-100 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Vehicle report preview
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{result.platformName} listing</h1>
            <p className="mt-1 max-w-sm truncate text-sm text-slate-500">{result.url}</p>
            <div className="mt-4">
              <TrustBadge tier={result.tier} label={paid ? "Unlocked" : "Preview only"} size="lg" />
            </div>
          </div>
          <div className="text-center">
            <ScoreGauge score={result.score} tier={result.tier} />
            <p className="mt-2 text-xs text-slate-500">Preview score</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
          {paid
            ? "Payment confirmed. Some provider-backed checks may remain unavailable until their data source is connected."
            : "This report starts with the listing data we can read. Remaining provider checks are shown as unavailable until the complete report is unlocked."}
        </div>

        <section className="mt-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Listing details</h2>
              <p className="mt-1 text-sm text-slate-500">Fields are filled from the listing when available.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Template
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Vehicle", listingValue(listing?.title)],
              ["Price", listingValue(listing?.price)],
              ["Mileage", listingValue(listing?.mileage)],
              ["Seller", listingValue(listing?.seller)],
              ["Seller rating", listingValue(listing?.sellerRating)],
              ["Location", listingValue(listing?.location)],
            ].map(([field, value]) => (
              <div key={field} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field}</p>
                <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {listing?.sourceStatus === "extracted"
              ? "Details were read from the public AutoTrader page metadata."
              : listing?.sourceMessage ?? "The source did not provide readable listing details."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Seller ratings are shown only when the submitted source provides them; unavailable ratings stay clearly marked.
          </p>
        </section>

        {(listing?.images?.length ?? 0) > 0 && (
          <figure className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            <div className="grid gap-2 sm:grid-cols-2">
              {listing?.images?.slice(0, 4).map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={`Vehicle photo ${index + 1} from the ${result.platformName} listing`}
                  className="h-56 w-full object-cover"
                />
              ))}
            </div>
            <figcaption className="px-4 py-2 text-xs text-slate-500">
              Photos supplied by the listing source; not independently verified.
            </figcaption>
          </figure>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {paid ? "Completed checks" : "Preview checks"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {paid
                  ? "Payment confirmed; the full check list is now visible."
                  : previewChecks.length + " of " + result.checks.length + " checks are shown in this preview."}
              </p>
            </div>
            <span className="text-sm font-semibold text-brand-600">
              {paid ? "Paid report" : (quote?.formattedAmount ?? "£9.99") + " to unlock"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {visibleChecks.map((check) => (
              <div
                key={check.type}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{check.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{check.summary}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {paid ? "Unlocked" : "Preview"}
                </span>
              </div>
            ))}
            {lockedChecks.map((check) => (
              <div
                key={`locked-${check.type}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-medium text-slate-500">{check.label}</p>
                  <p className="mt-1 text-sm text-slate-400">Complete verification is locked.</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-500">
                  Locked
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100">
          <p className="text-sm font-semibold text-slate-900">
            {paid ? "Report unlocked" : "Finish this vehicle report"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {paid
              ? "The paid Checkout session is linked to this listing. The report keeps provider-backed results separate from source listing data."
              : "Unlock the remaining checks and the completed report template for this exact listing. The displayed local price is an estimate; payment opens Stripe Checkout when live billing is configured."}
          </p>
          {paid ? (
            <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-5 py-2.5 text-sm font-semibold text-emerald-800">
              Payment confirmed
            </span>
          ) : (
            <Link
              href={reportUrl}
              className="mt-4 inline-flex rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Unlock complete report · {quote?.formattedAmount ?? "£9.99"}
            </Link>
          )}
        </div>

        {paymentChecking && (
          <p className="mt-4 text-center text-xs text-slate-500">Confirming your Stripe payment…</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/claims?url=${encodeURIComponent(result.url)}`}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-600"
          >
            File a claim
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsContent />
    </Suspense>
  );
}

