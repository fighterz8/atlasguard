import { Clock3 } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type PriorityPanelProps = {
  route: ResearchResultsViewModel["route"];
  priority: NonNullable<ResearchResultsViewModel["priority"]>;
};

const formatMoe = (value: number | null) =>
  value === null ? "MOE unavailable" : `± ${value.toFixed(1)} min (90% MOE)`;

export function PriorityPanel({ route, priority }: PriorityPanelProps) {
  return (
    <section
      aria-labelledby="priority-heading"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Supporting factor · importance {priority.weight}/5
          </p>
          <h3
            id="priority-heading"
            className="mt-1 text-base font-semibold text-slate-950"
          >
            {priority.label}
          </h3>
        </div>
        <Clock3 aria-hidden="true" className="h-6 w-6 text-teal-700" />
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {route.originCity}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
            {priority.originValue}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatMoe(priority.originMoe)}
          </p>
        </div>
        <div aria-hidden="true" className="h-px w-8 bg-slate-300 sm:w-12" />
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">
            {route.destinationCity}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
            {priority.destinationValue}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatMoe(priority.destinationMoe)}
          </p>
        </div>
      </div>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold capitalize text-slate-900">
            {priority.classification}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold capitalize text-amber-900">
            {priority.quality} evidence
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {priority.interpretation}
        </p>
      </div>
    </section>
  );
}
