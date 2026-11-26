"use client";
import { BuyerCheckupRequestForm } from "@/components/BuyerCheckupRequestForm";
import { BrandLetterCycle } from "@/components/BrandLetterCycle";

export default function SearchPage() {
  return <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 via-white to-emerald-50/60">
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Vehicle report template</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Ask to view a vehicle</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">Paste your AutoTrader UK list, choose the vehicles you want to see, and prepare a separate request for each seller. Your name will not appear on the seller page.</p>
      <BuyerCheckupRequestForm />
      <div className="mt-12 rounded-2xl bg-white/70 p-4"><BrandLetterCycle /></div>
    </div>
  </div>;
}
