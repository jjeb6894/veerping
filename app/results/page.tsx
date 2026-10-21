"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ListingDetailsEditor } from "@/components/ListingDetailsEditor";
import { ListingPhotoPicker } from "@/components/ListingPhotoPicker";
import { ListingGallery } from "@/components/ListingGallery";
import { PurchaseCard } from "@/components/PurchaseCard";
import { PaidReport } from "@/components/PaidReport";
import { TrustScoreBar } from "@/components/TrustScoreBar";
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

type CheckRowState = "queued" | "running" | "completed" | "after_payment" | "unavailable" | "failed";

type CheckRow = {
  label: string;
  state: CheckRowState;
  note: string;
  sensitive?: boolean;
};

const STATE_STYLES: Record<CheckRowState, string> = {
  queued: "bg-slate-100 text-slate-500",
  running: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  after_payment: "bg-blue-50 text-blue-700",
  unavailable: "bg-slate-100 text-slate-500",
  failed: "bg-red-50 text-red-700",
};

const STATE_LABELS: Record<CheckRowState, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  after_payment: "Available after payment",
  unavailable: "Unavailable",
  failed: "Failed",
};

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
  const hasEnteredDetails = Object.keys(entered).length > 0;
  const listing = { ...result.listing, ...entered };
  const images = listing?.images ?? [];
  const listingValue = (value?: string) => value ?? "Unavailable";
  const vehicleTitle = listing?.title || `${result.platformName} listing`;

  const checkRows: CheckRow[] = [
    {
      label: "Listing details and photos",
      state: listing?.sourceStatus === "extracted" ? "completed" : "failed",
      note: listing?.sourceStatus === "extracted"
        ? `${images.length} photo${images.length === 1 ? "" : "s"} read from the listing.`
        : listing?.sourceMessage ?? "The listing details could not be read.",
    },
    {
      label: "Registration read from photos",
      state: result.listing?.registration ? "completed" : "unavailable",
      note: result.listing?.registration
        ? "The listing shows this registration. This does not verify identity or theft status."
        : "Not available in the listing data; photo plate reading is not connected.",
    },
    {
      label: "Stolen / crash / problematic records",
      state: "after_payment",
      note: "Hidden until you unlock the full Trust Score report. These checks cover theft flags, finance, and accident history.",
      sensitive: true,
    },
    {
      label: "Duplicate description scan",
      state: "after_payment",
      note: "Included in the paid report. Compared against other listings where sources allow.",
      sensitive: true,
    },
    {
      label: "Location and seller consistency",
      state: "after_payment",
      note: "Included in the paid report. Public mentions are potential matches needing interpretation, not proof.",
      sensitive: true,
    },
    {
      label: "Phone and seller scam reports",
      state: "after_payment",
      note: "Included in the paid report, from public scam-report sources where available.",
      sensitive: true,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 via-white to-emerald-50/60">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <Link href="/search" className="text-sm font-medium text-blue-600 hover:underline">
          ← Check another car
        </Link>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            {checkoutCancelled && (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
                Checkout was cancelled. Your preview is unchanged and nothing was charged.
              </p>
            )}

            <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-emerald-50/50 p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Vehicle report preview
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{vehicleTitle}</h1>
                <p className="mt-2 text-sm text-slate-600">Listing details from {result.platformName}</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
                  {paid
                    ? "Payment confirmed. Full Trust Score details are now unlocked."
                    : "This preview shows the Trust Score and public listing details. Sensitive records (stolen, crash, finance, scam) stay blurred until you unlock them for £9.99."}
                </div>

                {images.length > 0 && <ListingGallery key={`gallery:${result.url}`} images={images} platform={result.platformName} />}
                {images.length === 0 && listing?.sourceStatus === "extracted" && (
                  <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No photos were provided by the listing.</p>
                )}

                <section className="mt-8">
                  <h2 className="text-lg font-bold text-slate-900">Vehicle summary</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {([
                      ["Vehicle", listingValue(listing?.title ?? ([listing?.year, listing?.make, listing?.model, listing?.trim].filter(Boolean).join(" ") || undefined))],
                      ["Price", listingValue(listing?.price)],
                      ["Mileage", listingValue(listing?.mileage)],
                      ["Fuel and transmission", "Unavailable"],
                      ["Seller", listingValue(listing?.seller)],
                      ["Location", listingValue(listing?.location)],
                      ...(listing?.registration ? [["Registration", listing.registration]] : []),
                      ...(listing?.vin ? [["VIN", listing.vin]] : []),
                      ...(listing?.condition ? [["Condition", listing.condition]] : []),
                    ] as [string, string][]).map(([field, value]) => (
                      <div key={field} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field}</p>
                        <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {hasEnteredDetails
                      ? "Some details were entered by you and have not been verified against the listing. " + (result.listing?.sourceMessage ?? "")
                      : listing?.sourceStatus === "extracted"
                        ? "Details were read from the public listing page metadata."
                        : listing?.sourceMessage ?? "The source did not provide readable listing details."}
                  </p>
                  {result.platformId === "autotrader" && (
                    <a href={result.url} target="_blank" rel="noopener noreferrer"
                      className="mt-4 inline-block text-sm font-medium text-blue-700 underline">
                      View the original AutoTrader listing
                    </a>
                  )}
                  {result.platformId === "autotrader" && (
                    <ListingDetailsEditor key={result.url} initial={{
                      title: listing.title, price: listing.price, mileage: listing.mileage,
                      seller: listing.seller, location: listing.location, vin: listing.vin,
                    }} onSave={(details) => {
                      setEnteredByUrl(previous => ({ ...previous, [result.url]: details }));
                      try { sessionStorage.setItem(`templatechecklist:listing:${result.url}`, JSON.stringify(details)); }
                      catch { /* The report still displays the details if browser storage is unavailable. */ }
                    }} />
                  )}
                </section>

                {result.platformId === "autotrader" && <ListingPhotoPicker key={`photo-picker:${result.url}`} />}
              </div>
            </section>

            {paid && <PaidReport result={result} />}

            <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="checks-title" hidden={paid}>
              <h2 id="checks-title" className="text-lg font-bold text-slate-900">Checks on this vehicle</h2>
              <p className="mt-1 text-sm text-slate-500">Sensitive records stay blurred until you unlock the full report for £9.99.</p>
              <ul className="mt-5 divide-y divide-slate-100">
                {checkRows.map((row) => {
                  const isBlurred = row.sensitive && !paid;
                  return (
                    <li key={row.label} className="relative flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className={`min-w-0 ${isBlurred ? "select-none blur-sm" : ""}`}>
                        <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{row.note}</p>
                      </div>
                      <span className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold ${STATE_STYLES[row.state]} ${isBlurred ? "blur-sm" : ""}`}>
                        {STATE_LABELS[row.state]}
                      </span>
                      {isBlurred && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                            Unlock for £9.99
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                The Trust Score itself stays visible. Stolen, crash, finance and other sensitive records are blurred until payment.
              </p>
            </section>

            <TrustScoreBar score={result.score} />
          </div>

          <div className="space-y-6 lg:sticky lg:top-8">
            {!paid && (
              <PurchaseCard
                listingUrl={result.url}
                title={vehicleTitle}
                imageUrl={images[0]}
                disabled={!canPurchase}
                disabledReason={
                  !canPurchase && listing?.sourceStatus !== "extracted"
                    ? "Purchasing is available. Listing details were only partially readable, but your trust score is ready."
                    : undefined
                }
              />
            )}
            {paymentChecking && (
              <p className="text-center text-xs text-slate-500">Confirming your payment…</p>
            )}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Unlock the full report</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                £9.99 reveals the blurred stolen, crash, finance and problematic records. You can also{" "}
                <Link href={`/claims?url=${encodeURIComponent(result.url)}`} className="font-medium text-blue-600 hover:underline">
                  file a claim
                </Link>{" "}
                if something looks wrong.
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
