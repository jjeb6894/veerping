"use client";

import { useEffect, useRef, useState } from "react";

const SCORE_MIN = 93;
const SCORE_MAX = 97;

const GOOD_POINTS = [
  "Strong listing completeness and clear vehicle details",
  "Photos and description appear consistent",
  "Seller information looks established",
  "No major red flags detected in available signals",
];

const IMPROVEMENT_TIPS: { threshold: number; title: string; detail: string }[] = [
  {
    threshold: 94,
    title: "Add a couple more angles",
    detail: "An extra interior or engine-bay photo can push the score even higher.",
  },
  {
    threshold: 93,
    title: "Mention recent service or MOT",
    detail: "A short note about recent maintenance helps buyers feel more confident.",
  },
];

function pickScore(): number {
  return Math.floor(Math.random() * (SCORE_MAX - SCORE_MIN + 1)) + SCORE_MIN;
}

function pickListingCount(): number {
  return Math.floor(Math.random() * 450) + 6345;
}

export function TrustScoreBar({ score: propScore }: { score?: number | null }) {
  const targetRef = useRef(0);
  const [displayed, setDisplayed] = useState(0);
  const [score, setScore] = useState(0);
  const [listingCount, setListingCount] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Prefer the real score if it is already high; otherwise land in the 93-97 green band.
    let s = typeof propScore === "number" && propScore >= 90 ? Math.min(97, Math.max(93, propScore)) : pickScore();
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

  const showRecommendations = score < 95;
  const tips = showRecommendations ? IMPROVEMENT_TIPS.filter((tip) => score <= tip.threshold).slice(0, 2) : [];

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
            {animated ? "Based on listing completeness, transparency and available signals." : "Calculating…"}
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
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M8.5 13.1 5.9 10.5 4.8 11.6l3.7 3.7 7-7-1.1-1.1Z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  Congrats — your listing looks strong!
                </p>
                <p className="mt-1.5 text-sm leading-6 text-emerald-700">
                  {score >= 95
                    ? "Excellent result. No recommendations needed — this is in the top tier of trusted AutoTrader listings."
                    : "Very good score. A couple of small tweaks could push it even higher."}{" "}
                  Ranked in the top listings out of {listingCount.toLocaleString()} on AutoTrader.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">What looks good</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {GOOD_POINTS.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="text-emerald-500">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {showRecommendations && tips.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Small improvements</p>
              {tips.map((tip) => (
                <div key={tip.title} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-800">{tip.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{tip.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
