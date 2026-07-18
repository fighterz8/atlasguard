import { Flame } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type ClimatePanelProps = {
  route: ResearchResultsViewModel["route"];
  climate: NonNullable<ResearchResultsViewModel["climate"]>;
};

export function ClimatePanel({ route, climate }: ClimatePanelProps) {
  return (
    <section
      aria-labelledby="climate-heading"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Supporting factor · importance {climate.weight}/5
          </p>
          <h3
            id="climate-heading"
            className="mt-1 text-base font-semibold text-slate-950"
          >
            {climate.label}
          </h3>
          <p className="mt-1 text-xs text-slate-500 capitalize">
            Preference: {climate.preference}
          </p>
        </div>
        <Flame aria-hidden="true" className="h-6 w-6 text-amber-700" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          {
            city: route.originCity,
            value: climate.originValue,
            range: climate.originRange,
            station: climate.originStation,
          },
          {
            city: route.destinationCity,
            value: climate.destinationValue,
            range: climate.destinationRange,
            station: climate.destinationStation,
          },
        ].map((item) => (
          <div
            key={item.city}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-xs font-medium text-slate-500">{item.city}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Station range: {item.range}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Urban reference: {item.station}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold capitalize text-slate-900">
            {climate.classification}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold capitalize text-amber-900">
            {climate.quality} evidence
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {climate.interpretation}
        </p>
      </div>
    </section>
  );
}
