import { Building2, ExternalLink, ShieldCheck } from "lucide-react";

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
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <p className="eyebrow">Verified housing context</p>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-800">
              Context only
            </span>
          </div>
          <h2 id="housing-context-heading" className="section-heading">
            What the regional rent benchmark says
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            ACS median gross rent gives the comparison a grounded area-level
            reference. It is deliberately isolated from the illustrative
            financial inputs above.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          {housingContext.boundary}
        </div>
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

      <div className="mt-5 grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Difference: {housingContext.delta} per month
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {housingContext.reading}
          </p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
            {housingContext.caveats.map((caveat) => (
              <li key={caveat}>• {caveat}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">
          <p className="font-semibold text-white">
            {housingContext.evidence.publisher} ·{" "}
            {housingContext.evidence.tableId}
          </p>
          <p className="mt-1">{housingContext.evidence.observationPeriod}</p>
          <p className="mt-1">
            Released {housingContext.evidence.releasedOn} · verified{" "}
            {housingContext.evidence.verifiedOn}
          </p>
          <a
            href={housingContext.evidence.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-semibold text-teal-300 hover:text-teal-200"
          >
            Inspect official source
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
