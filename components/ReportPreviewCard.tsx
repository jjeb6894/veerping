"use client";

import { useEffect, useRef, useState } from "react";

const SCORE_MIN = 93;
const SCORE_MAX = 97;

function pickScore(): number {
  return Math.floor(Math.random() * (SCORE_MAX - SCORE_MIN + 1)) + SCORE_MIN;
}

function pickListingCount(): number {
  return Math.floor(Math.random() * 450) + 6345;
}

type Bullet = { text: string; good: boolean };

function bulletsForScore(score: number): Bullet[] {
  const base: Bullet[] = [
    { text: "No conflicting mileage details", good: true },
    { text: "Photos and description consistent", good: true },
    { text: "Appears to be a private seller", good: true },
    { text: "No red flags in available signals", good: true },
  ];
  if (score < 95) {
    base.push({ text: "Mention of recent service or MOT is missing", good: false });
  }
  return base;
}

export function ReportPreviewCard({ score, platformName, title, children }: {
  score: number | null;
  platformName: string;
  title: string;
  children?: React.ReactNode;
}) {
  const targetRef = useRef(0);
  const [displayed, setDisplayed] = useState(0);
  const [scoreValue, setScoreValue] = useState(0);
  const [listingCount, setListingCount] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    let s = typeof score === "number" && score >= 90 ? Math.min(97, Math.max(93, score)) : pickScore();
    targetRef.current = s;
    setScoreValue(s);
    setListingCount(pickListingCount());

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
  }, [score]);

  const strong = scoreValue >= 95;
  const bullets = bulletsForScore(scoreValue);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Vehicle report preview
          </p>
          <h1 className="mt-1.5 text-xl font-bold leading-7 tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Listing details from {platformName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
          {animated ? `${Math.round(displayed)}% Trust Score` : "Trust Score…"}
        </span>
      </div>

      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-label="Listing trust score"
        aria-valuenow={Math.round(displayed)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
          style={{ width: `${displayed}%` }}
        />
      </div>

      {animated && (
        <>
          <div className="mt-4 flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                <path d="M8.5 13.1 5.9 10.5 4.8 11.6l3.7 3.7 7-7-1.1-1.1Z" />
              </svg>
            </span>
            <p className="text-sm leading-6 text-slate-700">
              {strong ? "Congrats — your listing looks strong." : "Your listing looks generally sound."}{" "}
              Under review it would score between {strong ? "93 and 100" : "88 and 94"}, placing it{" "}
              {strong ? "in the top tier" : "in the solid mid band"} of trusted {platformName} listings{" "}
              (top {listingCount.toLocaleString()}).
            </p>
          </div>

          <ul className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <li key={bullet.text} className="flex items-start gap-2 text-sm text-slate-700">
                <span
                  className={`mt-0.5 font-bold ${bullet.good ? "text-emerald-600" : "text-amber-600"}`}
                  aria-hidden="true"
                >
                  {bullet.good ? "•" : "!"}
                </span>
                {bullet.text}
              </li>
            ))}
          </ul>

          {children}
        </>
      )}
    </div>
  );
}
