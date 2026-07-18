import { ArrowRight } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type SummaryPanelProps = Pick<ResearchResultsViewModel, "route" | "condition">;

export function SummaryPanel({ route, condition }: SummaryPanelProps) {
  return (
    <section aria-labelledby="decision-heading" className="pt-10 sm:pt-14">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-teal-800">
        <span>{route.originCity}</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        <span>{route.destinationCity}</span>
      </div>
      <div className="mt-5 max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Your current reading
        </p>
        <h1
          id="decision-heading"
          className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl"
        >
          {condition.label}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          {condition.summary}
        </p>
      </div>
    </section>
  );
}
