"use client";

import { useState } from "react";

type Choice = "willing" | "not_willing" | null;

const EXCLUSION_NOTE =
  "Make/model not on exclusion list — does not apply to this vehicle. No impact on you.";

export function BuyerPrePurchaseRequest({ listingUrl }: { listingUrl: string }) {
  const [choice, setChoice] = useState<Choice>(null);

  const options: { id: Exclude<Choice, null>; label: string }[] = [
    { id: "willing", label: "Buyer is willing to pay for the report" },
    { id: "not_willing", label: "Buyer is not willing to pay for the report" },
  ];

  return (
    <section className="mt-6 border-t border-emerald-100 pt-5" aria-labelledby="buyer-request-title">
      <h2 id="buyer-request-title" className="text-base font-bold text-slate-900">
        Buyer pre-purchase request
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">
        The pre-purchase report includes a reverse image check and insurance damage claims looked up by
        VIN number. Coverage spans Europe, excluding Poland, Malta and Sicily. Some Schengen areas may
        also be excluded depending on the VIN number.
      </p>

      <div className="mt-4 space-y-3" role="radiogroup" aria-label="Buyer payment willingness">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3.5 text-sm font-medium transition ${
              choice === option.id
                ? "border-emerald-400 ring-2 ring-emerald-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name={`buyer-request:${listingUrl}`}
              checked={choice === option.id}
              onChange={() => setChoice(option.id)}
              className="h-4 w-4 accent-emerald-600"
            />
            {option.label}
          </label>
        ))}
      </div>

      <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
        {EXCLUSION_NOTE}
      </p>
    </section>
  );
}
