import { ArrowRight, CircleGauge, ShieldCheck } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type SummaryPanelProps = Pick<
  ResearchResultsViewModel,
  "route" | "condition" | "confidence" | "stability"
>;

const statusTone: Record<string, string> = {
  limited: "bg-amber-100 text-amber-900",
  moderate: "bg-sky-100 text-sky-900",
  high: "bg-emerald-100 text-emerald-900",
  not_evaluated: "bg-slate-100 text-slate-700",
  stable: "bg-emerald-100 text-emerald-900",
  assumption_sensitive: "bg-amber-100 text-amber-900",
};

const humanize = (value: string) => value.replaceAll("_", " ");

export function SummaryPanel({
  route,
  condition,
  confidence,
  stability,
}: SummaryPanelProps) {
  return (
    <section aria-labelledby="decision-heading" className="pt-10 sm:pt-14">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-teal-800">
        <span>{route.originCity}</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        <span>{route.destinationCity}</span>
      </div>
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Decision condition
          </p>
          <h1
            id="decision-heading"
            className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl"
          >
            {condition.label}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            {condition.summary}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-teal-700" />
            <dt className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Evidence confidence
            </dt>
            <dd
              className={`mt-2 w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone[confidence.level]}`}
            >
              {confidence.level}
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CircleGauge aria-hidden="true" className="h-5 w-5 text-teal-700" />
            <dt className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Decision stability
            </dt>
            <dd
              className={`mt-2 w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone[stability.level]}`}
            >
              {humanize(stability.level)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
