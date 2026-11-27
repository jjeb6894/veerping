export function ReportPreviewCard({ platformName, title }: {
  score: number | null;
  platformName: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Vehicle listing link</p>
      <h1 className="mt-1.5 text-xl font-bold leading-7 tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      <p className="mt-1 text-sm text-slate-700">Source: {platformName}</p>
      <p className="mt-4 text-sm leading-6 text-slate-700">
        No vehicle details or history checks have been verified. A trust score is unavailable.
        Open the original listing to review the seller’s information directly.
      </p>
    </div>
  );
}
