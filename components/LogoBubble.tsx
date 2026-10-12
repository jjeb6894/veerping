"use client";

import { useState } from "react";

const PALETTE = [
  "bg-brand-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-600",
];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface LogoBubbleProps {
  name: string;
  /** Hostname to look up a logo for, e.g. "ebay.com". Omit to always show the initial badge. */
  domain?: string;
  size?: number;
  /** "circle" (default) or "square" corner style. */
  shape?: "circle" | "square";
}

/**
 * Renders a company's logo mark (via public, domain-keyed logo services)
 * purely to visually identify well-known brands by name — not a claim of
 * affiliation or endorsement. Falls back to a colored initial badge if no
 * domain is known or the logo can't be loaded, so nothing renders as a broken
 * image icon or a decorative emoji.
 */
export function LogoBubble({ name, domain, size = 28, shape = "circle" }: LogoBubbleProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const radius = shape === "circle" ? "rounded-full" : "rounded-lg";

  const sources = domain
    ? [
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
        `https://logo.clearbit.com/${domain}?size=128`,
      ]
    : [];

  if (!domain || sourceIndex >= sources.length) {
    return (
      <span
        className={`inline-flex items-center justify-center ${radius} text-[10px] font-bold text-white ${colorFor(name)}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {name.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- third-party logo lookup, not an optimizable local/remote asset
    <img
      src={sources[sourceIndex]}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={`${radius} bg-white object-contain ring-1 ring-slate-100`}
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setSourceIndex((index) => index + 1)}
    />
  );
}

