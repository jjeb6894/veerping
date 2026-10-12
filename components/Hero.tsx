import Link from "next/link";
import { CountryBrandBackdrop } from "@/components/CountryBrandBackdrop";
import { LogoBubble } from "@/components/LogoBubble";
import { ADAPTERS, adapterLogoDomain } from "@/lib/adapters";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <CountryBrandBackdrop />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Interactive prototype · simulated checks
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Paste a link. <br />
            Get a <span className="text-brand-500">Trust Score</span>.
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-600">
            Explore the planned TrustLink workflow for marketplace listings and profiles.
            Results and activity shown here are simulated; no listings are verified and no
            insurance coverage is offered.
          </p>
          <div className="mt-8 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Example platforms
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Example marketplace platforms">
              {ADAPTERS.map((adapter) => (
                <span
                  key={adapter.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                >
                  <LogoBubble name={adapter.name} domain={adapterLogoDomain(adapter)} size={22} />
                  <span className="hidden sm:inline">{adapter.name}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/search"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Request my listing <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/search"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Trust my listing <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-10 grid max-w-lg gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 text-sm text-slate-600 shadow-sm sm:grid-cols-3">
            <p>
              <span className="block font-semibold text-slate-900">Demo data</span>
              Scores and activity are simulated.
            </p>
            <p>
              <span className="block font-semibold text-slate-900">No live checks</span>
              Marketplace integrations are not connected.
            </p>
            <p>
              <span className="block font-semibold text-slate-900">Preview only</span>
              No paid services, claims, or coverage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
