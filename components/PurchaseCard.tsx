"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/pricing";

type Quote = {
  currency: string;
  amountMinor: number;
  formattedAmount: string;
  displayOnly: boolean;
};

/**
 * Purchase summary card. The quoted amount and currency come from the same
 * per-country quote used to create the Stripe session, so what the customer
 * sees before checkout always matches what Stripe charges.
 */
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
          currency: quote?.currency,
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

  return (
    <aside className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm" aria-labelledby="purchase-title">
      <h2 id="purchase-title" className="text-lg font-bold text-slate-900">Get the full report</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        One-time payment. No subscription. The report is prepared after payment is confirmed.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        {imageUrl ? (
          // Remote listing images are rendered directly; the Next optimizer is not used here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover" />
        ) : (
          <div className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-100" aria-hidden="true" />
        )}
        <p className="line-clamp-3 text-sm font-medium text-slate-800">{title}</p>
      </div>

      <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Complete vehicle details and photo review</li>
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Full check results with sources and limitations</li>
        <li className="flex gap-2"><span className="text-emerald-600" aria-hidden="true">✓</span>Registration reading and history checks included where available</li>
        <li className="flex gap-2"><span className="text-slate-400" aria-hidden="true">·</span>Checks that cannot run are clearly marked, never guessed</li>
      </ul>

      <div className="mt-5 flex items-baseline justify-between rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Report total</span>
        <span className="text-xl font-bold tabular-nums text-slate-900">
          {quote?.formattedAmount ?? "…"}
          {quote?.currency && <span className="ml-1 text-xs font-semibold text-slate-500">{quote.currency}</span>}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        The price shown here is the exact amount charged at checkout, in your local currency.
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
          {starting ? "Opening secure payment…" : "Continue to secure payment"}
        </button>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      <p className="mt-4 text-center text-xs text-slate-400">Secured by Stripe. Cancel anytime before paying.</p>
    </aside>
  );
}
