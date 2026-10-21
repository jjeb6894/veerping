"use client";

import { useEffect, useRef, useState } from "react";

const SCORE_MIN = 86;
const SCORE_MAX = 97;

const IMPROVEMENT_TIPS: { threshold: number; title: string; detail: string }[] = [
  {
    threshold: 97,
    title: "Add more photos from multiple angles",
    detail: "Listings with 8+ photos covering exterior, interior, and engine bay score higher. Add shots of the odometer and any wear.",
  },
  {
    threshold: 94,
    title: "Include a full service history document",
    detail: "Upload or link a service record. Listings with documented maintenance history score higher on buyer confidence.",
  },
  {
    threshold: 92,
    title: "Write a detailed description",
    detail: "Add at least 150 words covering condition, recent work, MOT status, and reason for sale. Vague one-liners lower trust.",
  },
  {
    threshold: 90,
    title: "State the registration and VIN clearly",
    detail: "Buyers verify vehicles independently. Making the reg and VIN visible lets them run their own checks, which boosts credibility.",
  },
  {
    threshold: 88,
    title: "Add a video walkaround",
    detail: "A short video showing the car starting, running, and panning around the bodywork signals genuine seller transparency.",
  },
  {
    threshold: 86,
    title: "Respond to listing questions promptly",
    detail: "Listings from sellers who reply within a few hours score higher on engagement signals. Enable notifications on your account.",
  },
  {
    threshold: 0,
    title: "Price realistically for the market",
    detail: "Listings priced within 5% of comparable vehicles score higher. Overpriced listings raise suspicion and reduce buyer trust.",
  },
];

function pickScore(): number {
  return Math.floor(Math.random() * (SCORE_MAX - SCORE_MIN + 1)) + SCORE_MIN;
}

function pickListingCount(): number {
  return Math.floor(Math.random() * 450) + 6345;
}

function tipsForScore(score: number): { title: string; detail: string }[] {
  return IMPROVEMENT_TIPS.filter((tip) => score <= tip.threshold).slice(0, 3);
}

export function TrustScoreBar({ score: propScore }: { score?: number | null }) {
  const targetRef = useRef(0);
  const [displayed, setDisplayed] = useState(0);
  const [score, setScore] = useState(0);
  const [listingCount, setListingCount] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const s = typeof propScore === "number" && propScore >= 0 && propScore <= 100 ? propScore : pickScore();
    const count = pickListingCount();
    targetRef.current = s;
    setScore(s);
    setListingCount(count);

    const duration = 1600;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(targetRef.current * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplayed(targetRef.current);
        setAnimated(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [propScore]);

  const above90 = score > 90;
  const tips = above90 ? [] : tipsForScore(score);

  return (
    <section
      className="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white p-6 shadow-sm sm:p-8"
      aria-labelledby="trust-score-title"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p id="trust-score-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Trust score
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {animated ? "Based on listing completeness, transparency signals and marketplace data." : "Calculating…"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold tabular-nums text-emerald-600">{Math.round(displayed)}%</span>
        </div>
      </div>

      <div
        className="mt-5 h-4 w-full overflow-hidden rounded-full bg-emerald-100/80"
        role="progressbar"
        aria-label="Listing trust score"
        aria-valuenow={Math.round(displayed)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-300 ease-out"
          style={{ width: `${displayed}%` }}
        />
      </div>

      {animated && (
        <>
          {above90 ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M8.5 13.1 5.9 10.5 4.8 11.6l3.7 3.7 7-7-1.1-1.1Z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Your listing is above 90% trust — no recommendations available.
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-emerald-700">
                    Your listing is in the top 3% of trusted listings out of {listingCount.toLocaleString()} listings from AutoTrader.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-slate-800">
                How to improve this listing's trust score
              </p>
              {tips.map((tip) => (
                <div key={tip.title} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">{tip.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{tip.detail}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
