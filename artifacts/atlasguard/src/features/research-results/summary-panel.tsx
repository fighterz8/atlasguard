import type { ResearchResultsViewModel } from "./model";

type SummaryPanelProps = Pick<
  ResearchResultsViewModel,
  "condition" | "decisionMeta"
>;

export function SummaryPanel({ condition, decisionMeta }: SummaryPanelProps) {
  const meta = [
    ["Monthly difference", decisionMeta.monthlyDifference],
    ["Evidence", decisionMeta.confidenceLabel],
    ["Sensitivity", decisionMeta.stabilityLabel],
  ];

  return (
    <section
      aria-labelledby="decision-heading"
      className="grid gap-10 pb-12 pt-12 sm:pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
          {decisionMeta.routeLabel}
        </p>
        <h1
          id="decision-heading"
          className="mt-6 max-w-2xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl"
        >
          {condition.label}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
          {condition.summary}
        </p>
      </div>
      <dl className="self-end border-y border-slate-300">
        {meta.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-5 border-b border-slate-200 py-4 last:border-0"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {label}
            </dt>
            <dd className="text-right text-sm font-semibold text-slate-900 tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
