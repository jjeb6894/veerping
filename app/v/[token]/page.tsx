"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckProgress, PREVIEW_MIN_MS } from "@/components/CheckProgress";
import { SafeProgress } from "@/components/SafeProgress";
import { ChecksList } from "@/components/ChecksList";
import { MiniReportPreview } from "@/components/MiniReportPreview";
import { PurchaseCard } from "@/components/PurchaseCard";
import { TrustScoreBar } from "@/components/TrustScoreBar";
import { storeCachedResult } from "@/lib/check-link";
import type { TrustScoreResult } from "@/types";

const RESULT_CACHE_PREFIX = "templatechecklist:check-result:";

function ViewerContent() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const checkoutCancelled = searchParams.get("checkout") === "cancelled";

  const [result, setResult] = useState<TrustScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [requestDone, setRequestDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    setStartedAt(performance.now());
    (async () => {
      try {
        const response = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Could not prepare that vehicle report.");
        } else {
          setResult(data as TrustScoreResult);
          try {
            sessionStorage.setItem(RESULT_CACHE_PREFIX + (data as TrustScoreResult).url, JSON.stringify(data));
          } catch { /* Best-effort cache. */ }
        }
      } catch {
        if (!cancelled) setError("Something went wrong preparing the vehicle report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const paymentChecking = false;
  void paymentChecking;
  void sessionId;
  void checkoutCancelled;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 via-white to-emerald-50/60">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
            TrustLink vehicle check
          </p>
          <h1 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-900">
            Loading vehicle details…
          </h1>
          <div className="mt-8">
            <SafeProgress>
              <CheckProgress startedAt={startedAt} requestDone={requestDone} />
            </SafeProgress>
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{error ?? "This vehicle report could not be loaded."}</p>
        <Link href="/search" className="mt-4 inline-block text-blue-600 hover:underline">
          Run your own vehicle check
        </Link>
      </div>
    );
  }

  const listing = result.listing;
  const images = listing?.images ?? [];
  const vehicleTitle = listing?.title || `${result.platformName} listing`;
  const listingValue = (value?: string) => value ?? "Unavailable";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 via-white to-emerald-50/60">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-emerald-50/50 p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  TrustLink vehicle check · shared report
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{vehicleTitle}</h1>
                <p className="mt-2 text-sm text-slate-600">Listing details from {result.platformName}</p>
              </div>

              <div className="p-6 sm:p-8">
                <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900 ring-1 ring-blue-100">
                  Someone you know ran a TrustLink check on this vehicle. The Trust Score and public
                  listing details are shown below. Sensitive records (stolen, crash, finance, scam) stay
                  blurred — unlock all for £9.99 to see everything, and get a shareable TCL trust link
                  proving the car isn&apos;t stolen, clocked or modified.
                </div>

                <section className="mt-8">
                  <h2 className="text-lg font-bold text-slate-900">Vehicle summary</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {([
                      ["Vehicle", listingValue(listing?.title ?? ([listing?.year, listing?.make, listing?.model, listing?.trim].filter(Boolean).join(" ") || undefined))],
                      ["Price", listingValue(listing?.price)],
                      ["Mileage", listingValue(listing?.mileage)],
                      ["Seller", listingValue(listing?.seller)],
                      ["Location", listingValue(listing?.location)],
                      ...(listing?.registration ? [["Registration", listing.registration]] : []),
                      ...(listing?.vin ? [["VIN", listing.vin]] : []),
                    ] as [string, string][]).map(([field, value]) => (
                      <div key={field} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field}</p>
                        <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {listing?.sourceStatus === "extracted"
                      ? "Details were read from the public listing page metadata."
                      : listing?.sourceMessage ?? "The source did not provide readable listing details."}
                  </p>
                </section>
              </div>
            </section>

            <ChecksList result={result} />
            <TrustScoreBar score={result.score} />
          </div>

          <div className="space-y-6 lg:sticky lg:top-8">
            <PurchaseCard
              listingUrl={result.url}
              title={vehicleTitle}
              imageUrl={images[0]}
              disabled={!result || typeof result.score !== "number"}
            />
            <MiniReportPreview result={result} locked />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VehicleViewerPage() {
  return (
    <Suspense fallback={null}>
      <ViewerContent />
    </Suspense>
  );
}
