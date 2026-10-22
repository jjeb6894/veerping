"use client";

import type { TrustScoreResult } from "@/types";

export type CheckRowState = "queued" | "running" | "completed" | "after_payment" | "unavailable" | "failed";

export type CheckRow = {
  label: string;
  state: CheckRowState;
  note: string;
  sensitive?: boolean;
};

export const STATE_STYLES: Record<CheckRowState, string> = {
  queued: "bg-slate-100 text-slate-500",
  running: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  after_payment: "bg-blue-50 text-blue-700",
  unavailable: "bg-slate-100 text-slate-500",
  failed: "bg-red-50 text-red-700",
};

export const STATE_LABELS: Record<CheckRowState, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  after_payment: "Unlock all for £9.99",
  unavailable: "Unavailable",
  failed: "Failed",
};

export function buildCheckRows(result: TrustScoreResult): CheckRow[] {
  const listing = result.listing;
  const images = listing?.images ?? [];

  return [
    {
      label: "Listing details and photos",
      state: listing?.sourceStatus === "extracted" ? "completed" : "failed",
      note: listing?.sourceStatus === "extracted"
        ? `${images.length} photo${images.length === 1 ? "" : "s"} read from the listing.`
        : listing?.sourceMessage ?? "The listing details could not be read.",
    },
    {
      label: "Registration read from photos",
      state: listing?.registration ? "completed" : "unavailable",
      note: listing?.registration
        ? "The listing shows this registration. This does not verify identity or theft status."
        : "Not available in the listing data; photo plate reading is not connected.",
    },
    {
      label: "Stolen / crash / problematic records",
      state: "after_payment",
      note: "Included in the full report. Covers theft flags, finance, and accident history.",
      sensitive: true,
    },
    {
      label: "Duplicate description scan",
      state: "after_payment",
      note: "Included in the full report. Compared against other listings where sources allow.",
      sensitive: true,
    },
    {
      label: "Location and seller consistency",
      state: "after_payment",
      note: "Included in the full report. Public mentions are potential matches needing interpretation, not proof.",
      sensitive: true,
    },
    {
      label: "Phone and seller scam reports",
      state: "after_payment",
      note: "Included in the full report, from public scam-report sources where available.",
      sensitive: true,
    },
  ];
}

export function ChecksList({ result, paid, title = "Checks on this vehicle" }: {
  result: TrustScoreResult;
  paid?: boolean;
  title?: string;
}) {
  const rows = buildCheckRows(result);

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="checks-title">
      <h2 id="checks-title" className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Sensitive records stay blurred until you unlock all for £9.99.
      </p>
      <ul className="mt-5 divide-y divide-slate-100">
        {rows.map((row) => {
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
                    Unlock all for £9.99
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
