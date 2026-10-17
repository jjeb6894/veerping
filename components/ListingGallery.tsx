"use client";

import { useState } from "react";

export function ListingGallery({ images, platform }: { images: string[]; platform: string }) {
  const [enhanced, setEnhanced] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);

  return (
    <section className="mt-8" aria-labelledby="listing-photos-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">From the listing</p>
          <h2 id="listing-photos-title" className="mt-1 text-xl font-bold text-slate-900">Vehicle photos</h2>
        </div>
        <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold" aria-label="Photo appearance">
          <button type="button" onClick={() => setEnhanced(true)} aria-pressed={enhanced} className={`rounded-full px-4 py-2 ${enhanced ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Enhanced</button>
          <button type="button" onClick={() => setEnhanced(false)} aria-pressed={!enhanced} className={`rounded-full px-4 py-2 ${!enhanced ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Original</button>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-500">{enhanced ? "Enhanced preview: subtle colour and brightness adjustments. Select Original to see the source photos." : "Original photos as supplied by the listing source."}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {images.slice(0, 8).map((image, index) => (
          <figure key={image} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
              {failed.includes(image) ? <p className="px-4 text-center text-sm text-slate-500">This listing photo is unavailable.</p> : (
                <img src={image} alt={`Vehicle photo ${index + 1} from the ${platform} listing`} loading={index > 1 ? "lazy" : "eager"} onError={() => setFailed(current => [...current, image])} className={`h-full w-full object-contain ${enhanced ? "brightness-[1.02] contrast-[1.02] saturate-[1.03]" : ""}`} />
              )}
              {enhanced && !failed.includes(image) && <span className="absolute right-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-bold tracking-widest text-white">TCL PREVIEW</span>}
            </div>
            <figcaption className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
              <span className="text-xs font-bold tracking-wide text-slate-700">TCL <span className="font-normal text-slate-400">|</span> LISTING PREVIEW</span>
              <span className="text-xs text-slate-500">{enhanced ? "Enhanced" : "Original"} · {index + 1}/{Math.min(images.length, 8)}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Photos supplied by the listing source. Appearance adjustments do not verify vehicle condition.</p>
    </section>
  );
}
