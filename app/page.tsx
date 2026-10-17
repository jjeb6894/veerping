import Link from "next/link";
import { LogoBubble } from "@/components/LogoBubble";
import { ADAPTERS, adapterLogoDomain } from "@/lib/adapters";

const features = [
  ["⌁", "AI Reverse Image Search", "Find where an image appears online and detect duplicates or fakes."],
  ["▣", "VIN Number Verification", "Verify VIN, history, title, and mileage on supported vehicle listings."],
  ["◎", "Social Account & Profile Checks", "Verify profiles, followers, engagement, and authenticity signals."],
  ["◆", "Seller History & Reputation", "Check ratings, past listings, complaints, and behaviour patterns."],
  ["✦", "Instant Trust Score", "Get an AI-powered score based on 20+ trust factors."],
  ["✓", "Get Your Listing Verified", "Stand out with a trusted badge and build buyer confidence."],
];

const proofPoints = [
  "Advanced AI & machine learning",
  "Cross-checks across 100s of sources",
  "Real-time data & seller insights",
  "Privacy-first. No spam. Just results",
];

const marketplacePreviews = [
  {
    name: "Facebook Marketplace",
    domain: "facebook.com",
    title: "2019 car · automatic",
    detail: "Automatic · 54,000 miles",
    price: "£14,750",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Car parked outdoors",
  },
  {
    name: "Gumtree",
    domain: "gumtree.com",
    title: "2018 sports car · manual",
    detail: "Manual · 61,000 miles",
    price: "£9,450",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Car on a road",
  },
  {
    name: "eBay",
    domain: "ebay.com",
    title: "Apple MacBook Pro 13-inch",
    detail: "16GB RAM · 512GB SSD · Used",
    price: "£549",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Laptop on a desk",
  },
];

export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden border-b border-slate-100">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20">
          <div className="mx-auto grid max-w-6xl grid-cols-3 gap-8 px-6 pt-8 text-2xl font-bold text-slate-500 sm:grid-cols-6">
            {["PayPal", "VISA", "mastercard", "eBay", "Toyota", "BMW", "Mercedes", "Google", "Apple", "Wells Fargo", "Chase", "Amazon"].map((brand, index) => (
              <span key={brand} className={`text-center ${["text-blue-700", "text-indigo-700", "text-orange-600", "text-rose-600", "text-red-700", "text-sky-700", "text-slate-600", "text-emerald-700", "text-violet-700", "text-red-800", "text-blue-800", "text-amber-700"][index]}`}>{brand}</span>
            ))}
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Trusted listing intelligence</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Check <span className="text-brand-600">Any Listing</span> in Seconds
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            AI-powered reverse image search, VIN checks, social account verification, and more.
            Know what&apos;s real before you buy or sell.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/search" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700">⌕ Check a Listing</Link>
            <Link href="/search" className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50">♢ Get My Listing Trusted</Link>
          </div>
          <div className="mx-auto mt-4 max-w-2xl rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <strong>20% off your vehicle report</strong> with code <span className="font-bold tracking-wide">LISTING20</span> for users from Wells Fargo, bet365, AutoTrader UK, mobile.de, HSBC, Middlesea Insurance, Revolut, Wise, and Nestlé.
          </div>
          <div className="mx-auto mt-8 grid max-w-5xl divide-y rounded-xl border border-slate-200 bg-white text-left shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              ["2.4M+", "listings checked"],
              ["180K+", "users"],
              ["3,500+", "companies & sellers trust us"],
              ["✓", "Most advanced trust factor check"],
            ].map(([value, label]) => (
              <div key={label} className="flex items-center gap-3 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-brand-600">{value === "✓" ? "✓" : "▣"}</span>
                <div><p className="text-sm font-bold text-slate-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            <span className="font-medium">Trusted by teams and platforms like</span>
            {ADAPTERS.slice(0, 5).map((adapter) => (
              <span key={adapter.id} className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                <LogoBubble name={adapter.name} domain={adapterLogoDomain(adapter)} size={20} />{adapter.name}
              </span>
            ))}
            {[
              { name: "HSBC", domain: "hsbc.com" },
              { name: "Primark", domain: "primark.com" },
              { name: "Citi", domain: "citigroup.com" },
              { name: "ING Insurance", domain: "ing.com" },
            ].map((company) => (
              <span key={company.name} className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                <LogoBubble name={company.name} domain={company.domain} size={20} />{company.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Listing context</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">See the source before you submit</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Explore the kinds of listings you can check. These examples are illustrative, not live listings.
          </p>
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {marketplacePreviews.map((preview) => (
            <article key={preview.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-48 overflow-hidden bg-slate-100">
                {/* Illustrative stock photo; the card does not represent a live listing. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.image} alt={preview.imageAlt} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Example listing
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <LogoBubble name={preview.name} domain={preview.domain} size={26} shape="square" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{preview.name}</p>
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">{preview.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{preview.detail}</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <span className="text-sm font-bold text-slate-900">{preview.price}</span>
                  <Link href="/search" className="text-xs font-semibold text-brand-600 hover:underline">Check a listing →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">How TemplateChecklist works</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Powerful tools. Instant trust.</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([icon, title, body]) => (
            <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl font-bold text-brand-600" aria-hidden="true">{icon}</span>
              <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="why-trust-us" className="border-y border-slate-100 bg-slate-50/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr,1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Why people trust us</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">See the full trust factor.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">We combine AI, data, and real-world signals to give you the clearest picture of what&apos;s trustworthy.</p>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              {proofPoints.map((point) => <li key={point} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">✓</span>{point}</li>)}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-32 items-center justify-center bg-slate-100"><div className="h-16 w-32 rounded-[50%] bg-gradient-to-br from-slate-400 to-slate-700 shadow-lg" /></div>
              <div className="p-4"><p className="text-xs font-semibold text-slate-400">Verified Car Listing</p><div className="mt-1 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">2021 Toyota Camry SE</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">✓ Trusted</span></div><p className="mt-3 text-xs text-slate-600">VIN: 4T1B11HK4MU23456</p><p className="mt-1 text-xs text-slate-500">Mileage: 34,215 miles · Price: $22,490</p><Link href="/search" className="mt-4 block border-t border-slate-100 pt-3 text-xs font-semibold text-brand-600 hover:underline">View full report →</Link></div>
            </article>
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-32 items-center justify-center bg-amber-50"><div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-3xl text-white shadow-lg">⌚</div></div>
              <div className="p-4"><p className="text-xs font-semibold text-slate-400">Verified Product / Profile</p><div className="mt-1 flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-900">Tech Essentials</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">✓ Trusted</span></div><p className="mt-3 text-xs text-slate-600">Seller since 2019</p><p className="mt-1 text-xs text-slate-500">Positive feedback 98.6% · 1,245 listings sold</p><Link href="/search" className="mt-4 block border-t border-slate-100 pt-3 text-xs font-semibold text-brand-600 hover:underline">View full report →</Link></div>
            </article>
          </div>
        </div>
      </section>

      <section id="whats-new" className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-6 py-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Ready to buy or sell with confidence?</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/search" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">⌕ Check a Listing</Link>
            <Link href="/search" className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">♢ Get My Listing Trusted</Link>
          </div>
          <p id="help" className="mt-4 text-xs text-slate-500">Free to check · Instant results · Most advanced trust verification</p>
        </div>
      </section>
    </div>
  );
}

