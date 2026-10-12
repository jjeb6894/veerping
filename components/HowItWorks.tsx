const STEPS = [
  {
    step: "1",
    title: "Paste a link or search",
    description:
      "Drop in a listing URL and we will prepare a report for that specific vehicle.",
  },
  {
    step: "2",
    title: "We run the Trust Check pipeline",
    description:
      "We read the public details and photos the source exposes, then label anything unavailable.",
  },
  {
    step: "3",
    title: "Get a Trust Score & badge",
    description:
      "Review the report score alongside the source details and the checks available for that listing.",
  },
  {
    step: "4",
    title: "Optional human validation",
    description:
      "Manual reviews are not available in this prototype.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
        <p className="mt-3 text-slate-600">
          Four steps between a sketchy link and real confidence.
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-4">
        {STEPS.map((item) => (
          <div key={item.step} className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
              {item.step}
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
