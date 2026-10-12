import Link from "next/link";
import { CountryBrandBackdrop } from "@/components/CountryBrandBackdrop";
import { LogoBubble } from "@/components/LogoBubble";
import { ADAPTERS, adapterLogoDomain } from "@/lib/adapters";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      <CountryBrandBackdrop />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.05fr,0.95fr] md:items-center">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Vehicle listing intelligence · AutoTrader UK live extraction
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Paste a car listing.
            <br />
            Get a <span className="text-brand-500">report preview.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-600">
            Add an AutoTrader UK or US link and we’ll prepare a clear vehicle report template.
            Listing details fill in where available, while unknown checks stay marked for review.
          </p>

          <div className="mt-8 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Works with popular listing platforms
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

          <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-white/80 px-3 py-2 ring-1 ring-slate-100">AutoTrader UK + US</span>
            <span className="rounded-full bg-white/80 px-3 py-2 ring-1 ring-slate-100">Empty fields stay visible</span>
            <span className="rounded-full bg-white/80 px-3 py-2 ring-1 ring-slate-100">Preview before payment</span>
          </div>
        </div>

        <div className="relative animate-fade-in-up md:pl-6">
          <div className="absolute -inset-4 rounded-[2rem] bg-white/30 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Listing preview
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Vehicle report</h2>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
                Awaiting link
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Vehicle details</span>
                <span className="text-xs text-slate-400">Awaiting listing link</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Vehicle", "—"],
                  ["Price", "—"],
                  ["Mileage", "—"],
                  ["Seller", "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="mt-1 font-semibold text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Trust check preview</p>
                <span className="text-xs font-semibold text-brand-600">5 ready</span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {["Identity & registration", "Stolen vehicle status", "Image reuse"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-600">
                      ✓
                    </span>
                    {item}
                  </div>
                ))}
                <p className="pt-1 text-xs text-slate-500">More checks unlock after the report is prepared.</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Ready for a listing</span>
              <span>Source-backed details shown on report</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
