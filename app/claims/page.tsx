import Link from "next/link";

export default function ClaimsPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-slate-900">Claims support</h1>
      <p className="mt-3 text-slate-600">
        Claims submission is not enabled yet. Do not send personal or transaction details through this page.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:underline">
        Return home
      </Link>
    </div>
  );
}
