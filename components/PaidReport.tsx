"use client";

import { useEffect, useState } from "react";
import type { TrustScoreResult } from "@/types";

type EvidenceEntry = {
  title: string;
  source: string;
  checkedAt: string;
  finding: string;
  limitation: string;
};

/**
 * Paid report panel: evidence-style rows built only from data actually
 * retrieved. Checks that could not run appear as explicit unavailable
 * entries — never estimated, never scored.
 */
export function PaidReport({ result }: { result: TrustScoreResult }) {
  const listing = result.listing;
  const checkedAt = new Date(result.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  const [photosOkay, setPhotosOkay] = useState<boolean | null>(null);
  useEffect(() => {
    if (!listing?.images?.length) {
      setPhotosOkay(null);
      return;
    }
    let cancelled = false;
    Promise.all(
      listing.images.slice(0, 4).map((src) =>
        new Promise<boolean>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = src;
        })
      )
    ).then((results) => {
      if (!cancelled) setPhotosOkay(results.some(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, [listing?.images]);

  const entries: EvidenceEntry[] = [];
  if (listing?.sourceStatus === "extracted") {
    entries.push({
      title: "Listing details",
      source: result.platformName,
      checkedAt,
      finding: `Details were read from the public listing page${listing.images?.length ? `, including ${listing.images.length} photo${listing.images.length === 1 ? "" : "s"}` : ""}.`,
      limitation: "Details reflect what the seller published at check time; they are not independently confirmed.",
    });
    entries.push({
      title: "Photo availability",
      source: result.platformName,
      checkedAt,
      finding: photosOkay === null
        ? "No photos were provided by the listing."
        : photosOkay
          ? "Listing photos loaded successfully for review."
          : "The listing photos could not be loaded from the source.",
      limitation: "Photo review shows supplied images only; it does not verify vehicle condition or authenticity.",
    });
  }
  if (result.vinDecode?.status === "decoded") {
    entries.push({
      title: "VIN specification",
      source: "US NHTSA decoder",
      checkedAt,
      finding: `The listing VIN decoded as ${[result.vinDecode.year, result.vinDecode.make, result.vinDecode.model].filter(Boolean).join(" ")}.`,
      limitation: "Decoding identifies specifications only. It does not check theft, ownership, VIN authenticity or vehicle history.",
    });
  }
  if (listing?.registration) {
    entries.push({
      title: "Registration",
      source: result.platformName,
      checkedAt,
      finding: `The listing shows registration ${listing.registration}.`,
      limitation: "Reading a number plate does not verify identity, ownership or theft status.",
    });
  }
  entries.push({
    title: "Theft, finance and accident history",
    source: "—",
    checkedAt,
    finding: "Not checked: no provider is connected for this region.",
    limitation: "This report cannot confirm a clean history. Treat the absence of this check as unknown risk.",
  });

  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="paid-report-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="paid-report-title" className="text-lg font-bold text-slate-900">Your full report</h2>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Payment confirmed</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Every entry below states its source, when it was checked, what was found, and what it cannot tell you.
      </p>

      <ul className="mt-5 space-y-4">
        {entries.map((entry) => (
          <li key={entry.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
              <p className="text-xs text-slate-400">{entry.source} · {entry.checkedAt}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{entry.finding}</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Limitation: {entry.limitation}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
        No trust score is included. A score would only be published once a documented method runs over
        sufficiently completed checks; unavailable checks are never scored.
      </p>
    </section>
  );
}
