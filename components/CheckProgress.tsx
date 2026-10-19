"use client";

import { useEffect, useRef, useState } from "react";

export const PREVIEW_MIN_MS = 7000;
const CREEP_WINDOW_MS = 12000;
const CREEP_MAX = 95;
const STATUS_MESSAGES = ["Reading listing…", "Checking vehicle details…", "Preparing your preview…"];
const READY_MESSAGE = "Vehicle preview ready";

/**
 * Time-based progress bar for the listing preview flow. Percent is derived
 * from elapsed time on every frame (not from an animation duration), so the
 * seven-second minimum is reliable: 0-90% across the minimum window, a slow
 * 90-95% creep while the request is still pending, then 100% once the request
 * is done AND the minimum time has elapsed.
 */
export function CheckProgress({ startedAt, requestDone }: {
  startedAt: number;
  requestDone: boolean;
}) {
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const reducedMotion = useRef(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => { reducedMotion.current = event.matches; };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const minimumPassed = elapsed >= PREVIEW_MIN_MS;
      const next = !minimumPassed
        ? Math.min(90, (elapsed / PREVIEW_MIN_MS) * 90)
        : !requestDone
          ? 90 + Math.min(CREEP_MAX - 90, ((elapsed - PREVIEW_MIN_MS) / CREEP_WINDOW_MS) * (CREEP_MAX - 90))
          : 100;
      setPercent(next);
      setReady(requestDone && minimumPassed);
      if (requestDone && minimumPassed) {
        window.clearInterval(timer);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    if (reducedMotion.current) timer = window.setInterval(tick, 400);
    else frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [startedAt, requestDone]);

  const messageIndex = Math.min(STATUS_MESSAGES.length - 1, Math.floor(percent / 31));

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {!ready && <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-blue-500" aria-hidden="true" />}
          {ready ? READY_MESSAGE : STATUS_MESSAGES[messageIndex]}
        </p>
        <span className="text-xs font-semibold tabular-nums text-slate-500">{Math.round(percent)}%</span>
      </div>
      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-blue-50"
        role="progressbar"
        aria-label="Listing preview progress"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-busy={!ready}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-[width] duration-200 ease-out ${ready ? "" : "animate-pulse"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
