"use client";

import { useEffect, useRef, useState } from "react";

const STAGES = [
  "Retrieving the listing…",
  "Importing listing photos…",
  "Reading the registration from photos…",
  "Scanning image databases…",
  "Comparing the description text…",
  "Checking seller and location signals…",
  "Compiling your preview…",
];

const TARGET_MIN = 10_000;
const TARGET_RANGE = 5_000;

const MIN_SHOW_MS = 7000;

/**
 * Presentation-only progress show. It is deliberately decorative: the real
 * listing import runs separately, and `complete` is driven by that fetch.
 * The show always plays for about five seconds so the full sequence is seen,
 * then calls onDone so the parent can reveal the actual result.
 */
export function PrepProgressShow({ complete, onDone }: {
  complete: boolean;
  onDone?: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [sources, setSources] = useState(0);
  const [percent, setPercent] = useState(4);
  const [finished, setFinished] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const targetRef = useRef(TARGET_MIN + Math.floor(Math.random() * TARGET_RANGE));
  const mountedAt = useRef(performance.now());
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || finished) return;
    const stageTimer = window.setInterval(() => setStage(current => (current + 1) % STAGES.length), 650);
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const seconds = (now - started) / 1000;
      const progress = 1 - Math.exp(-seconds / 2.2);
      setSources(Math.floor(targetRef.current * progress));
      setPercent(Math.min(94, 4 + Math.floor(90 * progress)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      window.clearInterval(stageTimer);
      cancelAnimationFrame(frame);
    };
  }, [reducedMotion, finished]);

  useEffect(() => {
    if (!complete || finished) return;
    setFinished(true);
    setPercent(100);
    setSources(targetRef.current);
    const remaining = reducedMotion ? 0 : Math.max(300, MIN_SHOW_MS - (performance.now() - mountedAt.current));
    const timer = window.setTimeout(() => onDoneRef.current?.(), remaining);
    return () => window.clearTimeout(timer);
  }, [complete, finished, reducedMotion]);

  const recentStages = finished
    ? ["Preview ready."]
    : STAGES.slice(Math.max(0, stage - 2), stage + 1);

  return (
    <section
      aria-live="polite"
      aria-busy={!finished}
      className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Vehicle report preview</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        {finished ? "Your preview is ready" : "Preparing your listing preview"}
      </h2>

      <div
        className="mt-6 h-3 w-full overflow-hidden rounded-full bg-blue-50"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-[width] duration-500 ease-out ${finished ? "" : "animate-pulse"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {reducedMotion ? (
        <p className="mt-4 text-sm text-slate-600">
          {finished ? "Preview ready." : "Gathering the listing details. This preview will appear as soon as the listing responds."}
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sources scanned</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{sources.toLocaleString("en-GB")}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current stage</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                {!finished && <span className="h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-blue-500" aria-hidden="true" />}
                {finished ? "Preview ready." : STAGES[stage]}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-500">
            {recentStages.map((entry, index, list) => (
              <li key={entry} className={index === list.length - 1 ? "font-medium text-slate-700" : ""}>{entry}</li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-6 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 ring-1 ring-amber-100">
        Prototype: results are simulated. Progress stages and counters shown here are illustrative only;
        the listing details in your preview come from the source you submitted.
      </p>
    </section>
  );
}
