"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ReportPreviewCard } from "@/components/ReportPreviewCard";
import { ListingDetailsEditor } from "@/components/ListingDetailsEditor";
import { ListingPhotoPicker } from "@/components/ListingPhotoPicker";
import { ListingGallery } from "@/components/ListingGallery";
import { PurchaseCard } from "@/components/PurchaseCard";
import { PaidReport } from "@/components/PaidReport";
import { cleanEnteredListing, type EnteredListing } from "@/lib/listing-input";
import type { TrustScoreResult } from "@/types";

const RESULT_CACHE_PREFIX = "templatechecklist:check-result:";

function cachedResult(url: string | null): TrustScoreResult | null {
  if (!url || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESULT_CACHE_PREFIX + url);
    return raw ? (JSON.parse(raw) as TrustScoreResult) : null;
  } catch { return null; }
}

function storedListingDetails(url: string | null): EnteredListing {
  if (!url || typeof window === "undefined") return {};
  try {
    return cleanEnteredListing(JSON.parse(sessionStorage.getItem(`templatechecklist:listing:${url}`) ?? "null"));
  } catch { return {}; }
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const sessionId = searchParams.get("session_id");
  const checkoutCancelled = searchParams.get("checkout") === "cancelled";
  const [result, setResult] = useState<TrustScoreResult | null>(() => cachedResult(url));
  const [paid, setPaid] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(Boolean(sessionId && url));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !cachedResult(url));
  const [enteredByUrl, setEnteredByUrl] = useState<Record<string, EnteredListing>>(() =>
    url ? { [url]: storedListingDetails(url) } : {});

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    (async () => {
      try {
        const checkResponse = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await checkResponse.json();

        if (cancelled) return;
        if (!checkResponse.ok) {
          setError(data.error ?? "Could not prepare that link.");
        } else {
          setResult(data as TrustScoreResult);
          try {
            sessionStorage.setItem(RESULT_CACHE_PREFIX + url, JSON.stringify(data));
          } catch { /* Best-effort cache; the report still renders from state. */ }
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

  const canPurchase = Boolean(result && typeof result.score === "number" && !paid);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 via-white to-emerald-50/60">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center" role="status" aria-live="polite">
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-slate-600">Preparing your vehicle preview…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{!url ? "No listing URL provided." : error ?? "No result found."}</p>
        <Link href="/search" className="mt-4 inline-block text-blue-600 hover:underline">
          Try another link
        </Link>
      </div>
    );
  }

  const entered = enteredByUrl[result.url] ?? {};
  const listing = { ...result.listing, ...entered };
  const images = listing?.images ?? [];
  const vehicleTitle = listing?.title || `${result.platformName} listing`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <Link href="/search" className="text-sm font-medium text-blue-600 hover:underline">
          ← Check another car
        </Link>

        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            {checkoutCancelled && (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
                Checkout was cancelled. Your preview is unchanged and nothing was charged.
              </p>
            )}

            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="rounded-2xl bg-emerald-50/70 p-4 sm:p-5">
                <ReportPreviewCard
                  key={`preview:${result.url}`}
                  score={result.score}
                  platformName={result.platformName}
                  title={vehicleTitle}
                />
              </div>


              <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
                {paid
                  ? "Payment confirmed. Full Trust Score details are now unlocked."
                  : "This preview shows the Trust Score and public listing details. Sensitive records (stolen, crash, finance) stay blurred until you unlock them for £9.99."}
              </div>
            </section>

            <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
              <ListingGallery key={`gallery:${result.url}`} images={images} platform={result.platformName} />
              {images.length === 0 && listing?.sourceStatus === "extracted" && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No photos were provided by the listing.</p>
              )}

              <ListingDetailsEditor key={result.url} initial={{
                title: listing.title, price: listing.price, mileage: listing.mileage,
                seller: listing.seller, location: listing.location, vin: listing.vin,
              }} onSave={(details) => {
                setEnteredByUrl(previous => ({ ...previous, [result.url]: details }));
                try { sessionStorage.setItem(`templatechecklist:listing:${result.url}`, JSON.stringify(details)); }
                catch { /* The report still displays the details if browser storage is unavailable. */ }
              }} />
            </section>

            {result.platformId === "autotrader" && <ListingPhotoPicker key={`photo-picker:${result.url}`} />}

            {paid && <PaidReport result={result} />}

            <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="summary-title">
              <h2 id="summary-title" className="text-lg font-bold text-slate-900">Vehicle summary</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {([
                  ["Vehicle", listing?.title ?? ([listing?.year, listing?.make, listing?.model, listing?.trim].filter(Boolean).join(" ") || undefined)],
                  ["Price", listing?.price],
                  ["Mileage", listing?.mileage],
                  ["Seller", listing?.seller],
                  ["Location", listing?.location],
                  ...(listing?.registration ? [["Registration", listing.registration]] : []),
                  ...(listing?.vin ? [["VIN", listing.vin]] : []),
                  ...(listing?.condition ? [["Condition", listing.condition]] : []),
                ] as [string, string | undefined][]).map(([field, value]) => (
                  <div key={field} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field}</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{value ?? "Unavailable"}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Details were read from the public listing page metadata.
              </p>
              <a href={result.url} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-medium text-blue-700 underline">
                View the original {result.platformName} listing
              </a>
            </section>
          </div>

          <div className="space-y-6 lg:sticky lg:top-8">
            {!paid && (
              <PurchaseCard
                listingUrl={result.url}
                title={vehicleTitle}
                imageUrl={images[0]}
                disabled={!canPurchase}
              />
            )}
            {paymentChecking && (
              <p className="text-center text-xs text-slate-500">Confirming your payment…</p>
            )}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Unlock the full report</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                £9.99 unlocks the report. Stolen, crash, finance and prehistoric records. You can also{" "}
                <Link href={`/claims?url=${encodeURIComponent(result.url)}`} className="font-medium text-blue-600 hover:underline">
                  file a claim
                </Link>{" "}
                for pending blocked listings.
              </p>
            </div>
          </div>
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
