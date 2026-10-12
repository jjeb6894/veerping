"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ReportQuote = {
  formattedAmount: string;
  currency: string;
  amountMinor: number;
};

function CheckoutButton({ url, quote }: { url: string; quote: ReportQuote | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "one-off-check",
          currency: quote?.currency ?? "USD",
          url,
          successUrl: `${origin}/results?url=${encodeURIComponent(url)}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/pricing?url=${encodeURIComponent(url)}&checkout=cancelled`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        setError(data.error ?? "Checkout is not available yet.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={startCheckout}
        disabled={loading}
        className="w-full rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? "Opening checkout…" : `Unlock report · ${quote?.formattedAmount ?? "£9.99"}`}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-amber-700">{error}</p>}
    </div>
  );
}

function PricingContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const [quote, setQuote] = useState<ReportQuote | null>(null);

  useEffect(() => {
    fetch("/api/report-quote")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setQuote(data as ReportQuote);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href={url ? `/results?url=${encodeURIComponent(url)}` : "/search"} className="text-sm text-brand-600 hover:underline">
        ← Back to report preview
      </Link>

      <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Complete vehicle report
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Unlock the remaining checks</h1>
        <p className="mt-3 text-slate-600">
          This unlock is tied to the listing link you just submitted. The report starts with a
          reusable template, then fills in the vehicle facts and verification details available for
          that listing.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">Estimated local price</p>
          <p className="mt-1 text-3xl font-bold text-brand-600">
            {quote?.formattedAmount ?? "£9.99"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            The currency is selected from your detected country. Stripe applies the live price for that currency at checkout.
          </p>
        </div>

        <ul className="mt-6 space-y-3 text-sm text-slate-700">
          {[
            "Complete the remaining verification sections",
            "Keep the listing-specific fields in one shareable report",
            "Show unknown or unavailable facts clearly instead of guessing",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-emerald-500">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <CheckoutButton url={url} quote={quote} />
        </div>
        <p className="mt-3 text-center text-sm text-emerald-700">
          Use code <span className="font-bold">LISTING20</span> in Stripe Checkout for 20% off if you came from one of the listed audiences.
        </p>
        <p className="mt-4 text-center text-xs text-slate-500">
          Stripe Checkout handles payment securely. If checkout is unavailable, billing still needs to be connected on the deployment.
        </p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingContent />
    </Suspense>
  );
}
