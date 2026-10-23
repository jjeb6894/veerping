"use client";

import { useEffect, useState } from "react";
import type { CheckupRequestRow } from "@/types/checkup";

type Phase = "loading" | "ready" | "redirecting" | "closed" | "paid" | "error";

export function SellerCheckupResponse({ requestId }: { requestId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [request, setRequest] = useState<CheckupRequestRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    const load = async () => {
      if (sessionId) {
        try {
          const confirmResponse = await fetch(`/api/checkup-requests/${requestId}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const confirmData = await confirmResponse.json().catch(() => ({}));
          if (!cancelled && confirmData.paid === true) {
            setPhase("paid");
            return;
          }
        } catch { /* fall through to loading the request normally. */ }
      }
      fetch(`/api/checkup-requests/${requestId}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Could not load this request.");
          setPhase("error");
          return;
        }
        setRequest(data as CheckupRequestRow);
        setPhase("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load this request. Check the link and try again.");
          setPhase("error");
        }
      });
    };

    void load();
    return () => { cancelled = true; };
  }, [requestId]);

  async function startCheckout(paidBy: "buyer" | "seller") {
    setWorking(paidBy);
    setError(null);
    try {
      const response = await fetch(`/api/checkup-requests/${requestId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, paidBy, origin: window.location.origin }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && typeof data.url === "string") {
        setPhase("redirecting");
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Payment could not be started. Please try again.");
      setWorking(null);
    } catch {
      setError("Payment could not be started. Please check your connection and try again.");
      setWorking(null);
    }
  }

  async function closeRequest(sellerResponse: "unavailable" | "available_no_checkup") {
    setWorking(sellerResponse);
    setError(null);
    try {
      const response = await fetch(`/api/checkup-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerResponse }),
      });
      if (response.ok) {
        setPhase("closed");
        return;
      }
      setError("Could not save your response. Please try again.");
    } catch {
      setError("Could not save your response. Please try again.");
    }
    setWorking(null);
  }

  if (phase === "loading") {
    return (
      <div className="py-20 text-center" role="status" aria-live="polite">
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading the request…</p>
      </div>
    );
  }

  if (phase === "redirecting") {
    return (
      <div className="py-20 text-center" role="status" aria-live="polite">
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-500" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-slate-600">Opening secure Stripe payment…</p>
      </div>
    );
  }

  if (phase === "paid") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 text-center sm:p-8" role="status">
        <p className="text-lg font-bold text-emerald-900">Payment confirmed — TCL checkup is starting</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The $9.99 checkup payment went through. The request is now marked as pending checkup and the
          TCL vehicle checkup process has been triggered.
        </p>
      </div>
    );
  }

  if (phase === "closed") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 text-center sm:p-8" role="status">
        <p className="text-lg font-bold text-emerald-900">Response saved. Thank you.</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {request?.seller_response === "available_no_checkup"
            ? "The buyer will be told the vehicle is still available, with no checkup needed."
            : "The buyer will be told the vehicle is no longer available."}
        </p>
      </div>
    );
  }

  if (phase === "error" || !request) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50/70 p-6 text-center sm:p-8" role="alert">
        <p className="text-lg font-semibold text-red-700">{error ?? "This request could not be loaded."}</p>
        {loadError && <p className="mt-2 text-sm text-red-600">Please check the link you were sent.</p>}
      </div>
    );
  }

  const buyerWantsToPay = request.buyer_payment_intent;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          TCL vehicle checkup request
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          A Buyer is Requesting a TCL Vehicle Checkup
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vehicle:{" "}
          {request.vehicle_title ? (
            <span className="font-semibold text-slate-900">{request.vehicle_title}</span>
          ) : (
            <a href={request.vehicle_link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline">
              view the listing
            </a>
          )}
        </p>

        {request.buyer_note && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message from Buyer:</p>
            <p className="mt-2 text-sm leading-6 text-slate-800">{request.buyer_note}</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
        {buyerWantsToPay ? (
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-xl">✅</span>
            <p className="text-sm font-semibold leading-6 text-emerald-800">
              A buyer is willing to pay $9.99 for a TCL checkup on your vehicle.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-xl">ℹ️</span>
            <p className="text-sm font-semibold leading-6 text-blue-800">
              A buyer is asking if this vehicle is still available. They have not committed to paying for the checkup yet.
            </p>
          </div>
        )}

        {buyerWantsToPay && (
          <div className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${request.buyer_prepaid_consent ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            <p className="font-semibold">Buyer prepayment consent</p>
            <p>{request.buyer_prepaid_consent ? "The buyer explicitly authorized the $9.99 checkup payment after seller availability confirmation." : "No explicit prepayment consent is recorded. Do not proceed with a buyer-paid checkout."}</p>
            {request.buyer_prepaid_consent_at && <p className="mt-1 text-xs">Recorded: {new Date(request.buyer_prepaid_consent_at).toLocaleString()}</p>}
          </div>
        )}

        <p className="mt-5 text-base font-bold text-slate-900">Is this vehicle still available?</p>

        <div className="mt-4 space-y-3">
          {buyerWantsToPay ? (
            <>
              <button
                type="button"
                onClick={() => startCheckout("buyer")}
                disabled={Boolean(working)}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working === "buyer" ? "Opening secure payment…" : "Yes, Vehicle is Still Available — Accept Checkup"}
              </button>
              <button
                type="button"
                onClick={() => closeRequest("unavailable")}
                disabled={Boolean(working)}
                className="w-full rounded-xl border border-red-200 bg-white px-5 py-3.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                {working === "unavailable" ? "Saving…" : "No, Vehicle is No Longer Available"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startCheckout("seller")}
                disabled={Boolean(working)}
                className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working === "seller" ? "Opening secure payment…" : "Yes, Still Available — I'll Pay for the TCL Checkup ($9.99)"}
              </button>
              <button
                type="button"
                onClick={() => closeRequest("available_no_checkup")}
                disabled={Boolean(working)}
                className="w-full rounded-xl border border-blue-200 bg-white px-5 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
              >
                {working === "available_no_checkup" ? "Saving…" : "Yes, Still Available — No Checkup Needed"}
              </button>
              <button
                type="button"
                onClick={() => closeRequest("unavailable")}
                disabled={Boolean(working)}
                className="w-full rounded-xl border border-red-200 bg-white px-5 py-3.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                {working === "unavailable" ? "Saving…" : "No, Vehicle is No Longer Available"}
              </button>
            </>
          )}
        </div>

        {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Payment is processed securely by Stripe. When payment is confirmed, the TCL checkup starts
          automatically and the request status becomes pending checkup.
        </p>
      </section>
    </div>
  );
}
