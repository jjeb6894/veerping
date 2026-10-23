"use client";

import { useState } from "react";
import type { BuyerIntent } from "@/types/checkup";

const PRICE_LABEL = "$9.99";

const OPTIONS: {
  id: BuyerIntent;
  boxTitle: string;
  label: string;
  description: string;
}[] = [
  {
    id: "buyer_paid",
    boxTitle: "I'm a Buyer — I'll Pay for the TCL Checkup",
    label: `I'm a Buyer & I'm Offering to Pay for the TCL Vehicle Checkup (${PRICE_LABEL})`,
    description:
      "I will cover the cost of the TCL vehicle checkup report. The seller will be notified that payment is ready.",
  },
  {
    id: "inquiry_only",
    boxTitle: "I'm a Buyer — Inquiring if Vehicle is Still Available",
    label: "I'm a Buyer — Asking if This Vehicle is Still Available",
    description:
      "I'm interested in this vehicle and would like to know if it's still available. We can discuss the checkup payment after.",
  },
];

export function BuyerCheckupRequestForm({ listingUrl, listingTitle }: {
  listingUrl: string;
  listingTitle?: string;
}) {
  const [selected, setSelected] = useState<BuyerIntent | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function send() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/checkup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: listingUrl,
          paymentIntent: selected === "buyer_paid",
          note,
          title: listingTitle,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.sellerUrl) {
        setShareLink(`${window.location.origin}${data.sellerUrl}`);
      } else {
        setError(data.error ?? "Could not create the request. Please try again.");
      }
    } catch {
      setError("Could not create the request. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (shareLink) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6" aria-labelledby="share-title">
        <h2 id="share-title" className="text-lg font-bold text-emerald-900">Request sent — share this link with the seller</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The seller will see your selection{note ? " and your note" : ""} when they open the link.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={shareLink}
            aria-label="Seller link"
            className="flex-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareLink).then(
                () => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); },
                () => undefined
              );
            }}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg shadow-blue-100/60 sm:p-6" aria-labelledby="buyer-request-title">
      <h2 id="buyer-request-title" className="text-lg font-bold text-slate-900">Before you send the link</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose what to tell the seller. Their response page is built from your selection.
      </p>

      <div className="mt-5 space-y-3">
        {OPTIONS.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(option.id)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                }`}
                aria-hidden="true"
              >
                {active && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                    <path d="M8.5 13.1 5.9 10.5 4.8 11.6l3.7 3.7 7-7-1.1-1.1Z" />
                  </svg>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{option.boxTitle}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{option.label}</span>
                <span className="mt-1.5 block text-xs leading-5 text-slate-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <label htmlFor="buyer-note" className="text-sm font-semibold text-slate-900">
          Add a Note or Comment for the Seller (Optional)
        </label>
        <textarea
          id="buyer-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="e.g. I'm very interested in this vehicle, please let me know if it's still available..."
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <button
        type="button"
        onClick={send}
        disabled={!selected || sending || !listingUrl}
        className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? "Creating your link…" : !listingUrl ? "Paste a listing link above first" : "Send Checkup Request to Seller"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </section>
  );
}
