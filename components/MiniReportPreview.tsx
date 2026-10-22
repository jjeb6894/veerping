"use client";

import type { TrustScoreResult } from "@/types";

/**
 * Miniature A4-style paper preview of the full paid report — a tiny visual
 * mock of what the buyer receives, rendered like a small document.
 */
export function MiniReportPreview({ result, locked }: {
  result: TrustScoreResult;
  locked: boolean;
}) {
  const listing = result.listing;
  const vehicleTitle = listing?.title || `${result.platformName} listing`;
  const images = listing?.images ?? [];
  const previewPhoto = images[0];

  const lines: { label: string; value: string; blurred: boolean }[] = [
    { label: "Vehicle", value: vehicleTitle, blurred: false },
    { label: "Price", value: listing?.price ?? "Unavailable", blurred: false },
    { label: "Mileage", value: listing?.mileage ?? "Unavailable", blurred: false },
    { label: "Seller", value: listing?.seller ?? "Unavailable", blurred: false },
    { label: "Stolen / theft records", value: "No theft flags found", blurred: true },
    { label: "Finance outstanding", value: "No finance recorded", blurred: true },
    { label: "Accident history", value: "No accidents recorded", blurred: true },
    { label: "Trust Score", value: `${result.score ?? "—"}/100`, blurred: false },
  ];

  return (
    <aside
      className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"
      aria-labelledby="mini-report-title"
    >
      <h2 id="mini-report-title" className="text-lg font-bold text-slate-900">What you receive</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Unlock all for £9.99. Your report arrives as a shareable TrustLink (TCL) page — anyone
        you send it to can view the full vehicle record and see the car isn&apos;t stolen,
        clocked or modified.
      </p>

      <div className="mt-5 flex justify-center">
        <div className="w-full max-w-[240px] rotate-[-1.5deg] rounded-md border border-slate-200 bg-slate-50 p-3 shadow-lg shadow-blue-100/60 transition-transform hover:rotate-0">
          <div className="rounded-sm border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-blue-700">TrustLink report</p>
              <p className="rounded bg-emerald-50 px-1 py-0.5 text-[7px] font-bold text-emerald-700">TCL verified</p>
            </div>

            {previewPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewPhoto} alt="" className="mt-2 h-16 w-full rounded-sm object-cover" />
            )}

            <p className="mt-2 truncate text-[9px] font-semibold text-slate-800">{vehicleTitle}</p>

            <ul className="mt-2 space-y-1">
              {lines.map((line) => (
                <li key={line.label} className="flex items-baseline justify-between gap-2">
                  <span className="shrink-0 text-[7px] uppercase tracking-wide text-slate-400">{line.label}</span>
                  <span className={`truncate text-[8px] font-medium text-slate-700 ${line.blurred && locked ? "blur-[3px] select-none" : ""}`}>
                    {line.value}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-2.5 border-t border-slate-100 pt-1.5">
              <p className="text-center text-[6px] text-slate-400">
                TrustLink · Vehicle Trust Report · {new Date(result.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Stolen, crash and finance records</li>
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Seller and scam-report checks</li>
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Shareable TCL trust link for your car</li>
        <li className="flex gap-2"><span className="text-slate-400" aria-hidden="true">·</span>Unavailable checks stay clearly marked</li>
      </ul>
    </aside>
  );
}
