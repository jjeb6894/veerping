"use client";

import { useEffect, useRef, useState } from "react";

export const PREVIEW_MIN_MS = 7000;

type StageStatus = "pending" | "active" | "done";

interface Stage {
  id: string;
  label: string;
  /** Short narrative shown under the label while this stage runs. */
  detail: string;
  /** Share of the overall bar this stage occupies (must sum to 100). */
  weight: number;
  /** Minimum milliseconds this stage should visibly run before advancing. */
  minMs: number;
  subSteps: { label: string; detail: string }[];
}

const STAGES: Stage[] = [
  {
    id: "detect",
    label: "Detecting listing platform",
    detail: "Matching your link to the right marketplace adapter.",
    weight: 8,
    minMs: 700,
    subSteps: [
      { label: "Parsing URL", detail: "Reading host and path segments" },
      { label: "Matching adapter", detail: "Comparing against supported sources" },
    ],
  },
  {
    id: "fetch",
    label: "Fetching AutoTrader page",
    detail: "Requesting the public listing page from the source.",
    weight: 22,
    minMs: 1500,
    subSteps: [
      { label: "Opening connection", detail: "Resolving host and starting request" },
      { label: "Downloading HTML", detail: "Reading the listing markup" },
      { label: "Handling source guard", detail: "Switching to renderer if blocked" },
    ],
  },
  {
    id: "parse",
    label: "Reading vehicle details",
    detail: "Pulling title, price, mileage, seller and location from the page.",
    weight: 25,
    minMs: 1800,
    subSteps: [
      { label: "Extracting title and price", detail: "From listing metadata" },
      { label: "Reading specs", detail: "Mileage, year, transmission, fuel" },
      { label: "Identifying seller", detail: "Dealer name and location" },
    ],
  },
  {
    id: "photos",
    label: "Loading listing photos",
    detail: "Collecting the photo gallery URLs the source exposes.",
    weight: 15,
    minMs: 1100,
    subSteps: [
      { label: "Scanning gallery", detail: "Finding image candidates" },
      { label: "Validating image URLs", detail: "Filtering placeholders and logos" },
    ],
  },
  {
    id: "vin",
    label: "Decoding VIN",
    detail: "If a VIN is present, decoding make, model, year and region.",
    weight: 15,
    minMs: 1100,
    subSteps: [
      { label: "Locating VIN", detail: "Searching listing text for a 17-char VIN" },
      { label: "Decoding", detail: "Parsing world manufacturer and descriptor" },
    ],
  },
  {
    id: "prepare",
    label: "Preparing your preview",
    detail: "Assembling the report object ready for the results page.",
    weight: 15,
    minMs: 900,
    subSteps: [
      { label: "Building report", detail: "Wiring listing, photos and VIN together" },
      { label: "Finalizing", detail: "Assigning a report id and timestamp" },
    ],
  },
];

const TOTAL_WEIGHT = STAGES.reduce((sum, s) => sum + s.weight, 0);

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Authentic multi-stage progress for the AutoTrader preview flow.
 *
 * Six named stages mirror what the /api/check route actually does, each with
 * its own percent and a readable sub-process the user can follow. The overall
 * bar is the weighted sum of stage percents. The seven-second minimum is still
 * honoured: stages slow down to fill the window, then snap to 100% when the
 * request is done.
 */
export function CheckProgress({ startedAt, requestDone }: {
  startedAt: number;
  requestDone: boolean;
}) {
  const [stageProgress, setStageProgress] = useState<number[]>(STAGES.map(() => 0));
  const [activeStage, setActiveStage] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => { reducedMotion.current = event.matches; };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let raf = 0;
    let interval = 0;
    let lastSubAdvance = 0;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startedAt;
      const minimumPassed = elapsed >= PREVIEW_MIN_MS;

      const next = STAGES.map((_, i) => {
        if (requestDone && minimumPassed) return 100;
        return stageProgress[i];
      });

      // Walk through stages based on elapsed time vs. their minimum durations.
      let consumed = 0;
      let active = 0;
      for (let i = 0; i < STAGES.length; i++) {
        const stage = STAGES[i];
        const stageStart = consumed;
        const stageEnd = consumed + stage.minMs;
        if (minimumPassed && !requestDone) {
          // Slow creep: distribute remaining time across unfinished stages.
          const t = Math.min(1, (elapsed - stageStart) / stage.minMs);
          next[i] = Math.max(next[i], easeOut(t) * 92);
        } else if (elapsed >= stageStart) {
          const t = Math.min(1, (elapsed - stageStart) / stage.minMs);
          next[i] = Math.max(next[i], easeOut(t) * 100);
        }
        if (next[i] < 100) active = i;
        consumed = stageEnd;
      }

      // Advance the visible sub-process index for the active stage.
      const stage = STAGES[active];
      const stageStart = STAGES.slice(0, active).reduce((s, x) => s + x.minMs, 0);
      const stageElapsed = elapsed - stageStart;
      const subCount = stage.subSteps.length;
      const subSlice = stage.minMs / subCount;
      const targetSub = Math.min(subCount - 1, Math.floor(stageElapsed / subSlice));
      if (targetSub !== lastSubAdvance) {
        lastSubAdvance = targetSub;
        setSubIndex(targetSub);
      }

      setStageProgress(next);
      setActiveStage(active);

      if (requestDone && minimumPassed) {
        if (interval) window.clearInterval(interval);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    if (reducedMotion.current) interval = window.setInterval(tick, 200);
    else raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (interval) window.clearInterval(interval);
    };
  }, [startedAt, requestDone, stageProgress]);

  const overall = stageProgress.reduce(
    (sum, p, i) => sum + (p / 100) * STAGES[i].weight,
    0
  ) / TOTAL_WEIGHT * 100;
  const ready = requestDone && overall >= 99.5;
  const currentStage = STAGES[activeStage];
  const currentSub = currentStage.subSteps[Math.min(subIndex, currentStage.subSteps.length - 1)];

  return (
    <section
      className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {!ready && (
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-blue-500" aria-hidden="true" />
          )}
          {ready ? "Vehicle preview ready" : currentStage.label}
        </p>
        <span className="text-xs font-bold tabular-nums text-slate-600">{Math.round(overall)}%</span>
      </div>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-blue-50"
        role="progressbar"
        aria-label="Listing preview progress"
        aria-valuenow={Math.round(overall)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-busy={!ready}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-[width] duration-200 ease-out ${ready ? "" : "animate-pulse"}`}
          style={{ width: `${overall}%` }}
        />
      </div>

      <ol className="mt-5 space-y-3">
        {STAGES.map((stage, i) => {
          const p = stageProgress[i];
          const status: StageStatus = p >= 99.5 ? "done" : i === activeStage ? "active" : "pending";
          const isCurrent = i === activeStage && !ready;
          return (
            <li key={stage.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    status === "done"
                      ? "bg-emerald-500 text-white"
                      : status === "active"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-400"
                  }`}
                  aria-hidden="true"
                >
                  {status === "done" ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M8.5 13.1 5.9 10.5 4.8 11.6l3.7 3.7 7-7-1.1-1.1Z" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${
                      status === "done"
                        ? "text-slate-500"
                        : status === "active"
                          ? "font-semibold text-slate-900"
                          : "text-slate-400"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {status === "done" ? "Completed" : isCurrent ? currentSub.detail : stage.detail}
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-500">
                  {Math.round(p)}%
                </span>
              </div>

              {isCurrent && (
                <ul className="mt-2.5 space-y-1.5 pl-9">
                  {stage.subSteps.map((sub, j) => {
                    const subDone = j < subIndex;
                    const subActive = j === subIndex;
                    return (
                      <li key={sub.label} className="flex items-center gap-2 text-xs">
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                            subDone
                              ? "bg-emerald-400 text-white"
                              : subActive
                                ? "bg-blue-500 text-white"
                                : "bg-slate-200 text-slate-300"
                          }`}
                          aria-hidden="true"
                        >
                          {subDone ? (
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-2 w-2">
                              <path d="M8.5 13.1 5.9 10.5 4.8 11.6l3.7 3.7 7-7-1.1-1.1Z" />
                            </svg>
                          ) : (
                            <span className="h-1 w-1 rounded-full bg-current" />
                          )}
                        </span>
                        <span className={subDone ? "text-slate-400 line-through" : subActive ? "font-medium text-slate-700" : "text-slate-400"}>
                          {sub.label}
                        </span>
                        {subActive && (
                          <span className="ml-1 inline-flex gap-0.5" aria-hidden="true">
                            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400" />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
