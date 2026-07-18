import { Building2, ExternalLink } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type HousingContextPanelProps = Pick<
  ResearchResultsViewModel,
  "route" | "housingContext"
>;

export function HousingContextPanel({
  route,
  housingContext,
}: HousingContextPanelProps) {
  const places = [
    {
      city: route.originCity,
      metro: route.originMetro,
      value: housingContext.originValue,
      moe: housingContext.originMoe,
    },
    {
      city: route.destinationCity,
      metro: route.destinationMetro,
      value: housingContext.destinationValue,
      moe: housingContext.destinationMoe,
    },
  ];

  return (
    <section
      aria-labelledby="housing-context-heading"
      className="panel lg:col-span-2"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Regional context</p>
          <h2 id="housing-context-heading" className="section-heading">
            Typical rent in each metro
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            A quick area-level reference alongside the housing amount you
            entered.
          </p>
        </div>
        <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
          {housingContext.boundary}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {places.map((place) => (
          <article
            key={place.city}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {place.city}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {place.metro}
                </p>
              </div>
              <Building2
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-blue-700"
              />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 tabular-nums">
              {place.value}
              <span className="ml-1 text-sm font-medium tracking-normal text-slate-500">
                / month
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              90% margin of error ±{place.moe}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <p className="text-sm font-semibold text-slate-950">
          Difference: {housingContext.delta} per month
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {housingContext.reading}
        </p>
        <details className="mt-4 text-xs leading-5 text-slate-500">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-slate-700">
            About this benchmark
          </summary>
          <ul className="space-y-2">
            {housingContext.caveats.map((caveat) => (
              <li key={caveat}>• {caveat}</li>
            ))}
          </ul>
          <p className="mt-3">
            {housingContext.evidence.publisher} ·{" "}
            {housingContext.evidence.tableId} ·{" "}
            {housingContext.evidence.observationPeriod}
          </p>
          <a
            href={housingContext.evidence.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-950"
          >
            Official source
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </details>
      </div>
    </section>
  );
}
