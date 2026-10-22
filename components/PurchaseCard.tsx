"use client";

import { useEffect, useState } from "react";

type Quote = {
  currency: string;
  amountMinor: number;
  formattedAmount: string;
  displayOnly: boolean;
};

export function PurchaseCard({ listingUrl, title, imageUrl, disabled, disabledReason }: {
  listingUrl: string;
  title: string;
  imageUrl?: string;
  disabled: boolean;
  disabledReason?: string;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/report-quote")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.formattedAmount) setQuote(data as Quote);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function startCheckout() {
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "one-off-check",
          currency: quote?.currency ?? "GBP",
          url: listingUrl,
          successUrl: `${window.location.origin}/results?url=${encodeURIComponent(listingUrl)}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/results?url=${encodeURIComponent(listingUrl)}&checkout=cancelled`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && typeof data.url === "string") {
        window.location.assign(data.url);
        return;
      }
      setError(
        response.status === 501
          ? "Secure payment is not connected on this deployment yet. Your preview is saved and safe."
          : "Payment could not be started. Please try again in a moment."
      );
    } catch {
      setError("Payment could not be started. Please check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  const displayPrice = quote?.formattedAmount ?? "£9.99";

  return (
    <aside className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm" aria-labelledby="purchase-title">
      <h2 id="purchase-title" className="text-lg font-bold text-slate-900">Unlock all</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        One-time payment. Reveals blurred stolen, crash, finance and problematic records, and gives you a shareable TCL trust link for this car.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover" />
        ) : (
          <div className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-100" aria-hidden="true" />
        )}
        <p className="line-clamp-3 text-sm font-medium text-slate-800">{title}</p>
      </div>

      <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Full vehicle details and photos</li>
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Stolen, crash and finance records</li>
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Seller and scam-report checks</li>
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Shareable TCL trust link for your car</li>
        <li className="flex gap-2"><span className="text-slate-400" aria-hidden="true">·</span>Unavailable checks stay clearly marked</li>
      </ul>

      <div className="mt-5 flex items-baseline justify-between rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Unlock price</span>
        <span className="text-xl font-bold tabular-nums text-slate-900">
          {displayPrice}
          <span className="ml-1 text-xs font-semibold text-slate-500">GBP</span>
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        £9.99 one-time. Unlocks the blurred sections of the Trust Score report and issues your TCL trust link.
      </p>

      {disabled ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          {disabledReason ?? "Purchasing is unavailable for this report right now."}
        </p>
      ) : (
        <button
          type="button"
          onClick={startCheckout}
          disabled={starting}
          className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {starting ? "Opening secure payment…" : "Unlock all for £9.99"}
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      <p className="mt-4 text-center text-xs text-slate-400">Secured by Stripe. Cancel anytime before paying.</p>
    </aside>
  );
}
