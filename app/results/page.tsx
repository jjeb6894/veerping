"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ListingDetailsEditor } from "@/components/ListingDetailsEditor";
import { ListingPhotoPicker } from "@/components/ListingPhotoPicker";
import { cleanEnteredListing, type EnteredListing } from "@/lib/listing-input";
import type { TrustScoreResult } from "@/types";

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
  const [result, setResult] = useState<TrustScoreResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(Boolean(sessionId && url));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading && url) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-slate-500">
        Preparing your listing preview…
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{!url ? "No listing URL provided." : error ?? "No result found."}</p>
        <Link href="/search" className="mt-4 inline-block text-brand-600 hover:underline">
          Try another link
        </Link>
      </div>
    );
  }

  const entered = enteredByUrl[result.url] ?? {};
  const hasEnteredDetails = Object.keys(entered).length > 0;
  const listing = { ...result.listing, ...entered };
  const listingValue = (value?: string) => value ?? "Unavailable from listing";

  function saveEnteredDetails(details: EnteredListing) {
    setEnteredByUrl(previous => ({ ...previous, [result!.url]: details }));
    try { sessionStorage.setItem(`templatechecklist:listing:${result!.url}`, JSON.stringify(details)); }
    catch { /* The report still displays the details if browser storage is unavailable. */ }
  }

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
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-100">
          {paid
            ? "Payment confirmed. Only details actually available from the listing or supplied by you are shown below."
            : "This preview shows listing details that could be retrieved, or details you add yourself. Vehicle history and independent checks are not yet connected."}
        </div>

        <section className="mt-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Listing details</h2>
              <p className="mt-1 text-sm text-slate-500">Fields come from the listing when available. You can supply missing details below.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Template
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Vehicle", listingValue(listing?.title ?? ([listing?.year, listing?.make, listing?.model, listing?.trim].filter(Boolean).join(" ") || undefined))],
              ["Price", listingValue(listing?.price)],
              ["Mileage", listingValue(listing?.mileage)],
              ["Seller", listingValue(listing?.seller)],
              ["Seller rating", listingValue(listing?.sellerRating)],
              ["Location", listingValue(listing?.location)],
              ...(listing?.vin ? [["VIN", listing.vin]] : []),
              ...(listing?.condition ? [["Condition", listing.condition]] : []),
            ].map(([field, value]) => (
              <div key={field} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field}</p>
                <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {hasEnteredDetails
              ? "Some details were entered by you and have not been verified against the listing. " + (result.listing?.sourceMessage ?? "")
              : listing?.sourceStatus === "extracted"
              ? "Details were read from the public listing page metadata."
              : listing?.sourceMessage ?? "The source did not provide readable listing details."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Seller ratings are shown only when the submitted source provides them; unavailable ratings stay clearly marked.
          </p>
          {result.platformId === "autotrader" && (
            <>
              <a href={result.url} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-medium text-brand-700 underline">
                Open the original AutoTrader listing
              </a>
              <ListingDetailsEditor key={result.url} initial={{
                title: listing.title, price: listing.price, mileage: listing.mileage,
                seller: listing.seller, location: listing.location, vin: listing.vin,
              }} onSave={saveEnteredDetails} />
            </>
          )}
        </section>

        {(listing?.images?.length ?? 0) > 0 && (
          <figure className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
            <div className="grid gap-2 sm:grid-cols-2">
              {listing?.images?.slice(0, 8).map((image, index) => (
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
        {result.platformId === "autotrader" && <ListingPhotoPicker key={result.url} />}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Vehicle history and checks</h2>
          <p className="mt-2 text-sm text-slate-600">
            Independent vehicle history and seller checks are not connected yet. No trust score or check results are available for this listing.
          </p>
          {!paid && <p className="mt-3 text-sm text-slate-600">Paid reports will be available once the report and publishing service is connected.</p>}
        </section>

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


