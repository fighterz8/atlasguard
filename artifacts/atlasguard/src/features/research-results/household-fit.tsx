import { ShieldCheck, Users } from "lucide-react";
import React from "react";

import { StatusBadge } from "../ux-system/status-badge";

import type { ResearchResultsViewModel } from "./model";

type HouseholdFitProps = {
  household: NonNullable<ResearchResultsViewModel["household"]>;
};

const contributionText = (value: number) => {
  if (value === 0) return "No score change";
  const amount = `${value > 0 ? "+" : ""}${value}`;
  return `${amount} ${Math.abs(value) === 1 ? "point" : "points"}`;
};

export function HouseholdFit({ household }: HouseholdFitProps) {
  return (
    <section
      aria-labelledby="household-fit-heading"
      className="border-t border-slate-300 py-12 sm:py-16"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="eyebrow">Household fit</p>
          <h2
            id="household-fit-heading"
            className="mt-3 max-w-2xl font-serif text-4xl tracking-[-0.035em] text-slate-950 sm:text-5xl"
          >
            What you said needs to work
          </h2>
        </div>
        <div className="border-l-4 border-teal-700 bg-teal-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-950">
            <Users aria-hidden="true" className="h-4 w-4" />
            {household.modeLabel}
          </div>
          {household.summary ? (
            <div className="mt-3">
              <StatusBadge tone={household.summary.tone}>
                {household.summary.label}
              </StatusBadge>
            </div>
          ) : null}
          <p className="mt-3 text-sm font-semibold tabular-nums text-teal-950">
            Household score effect:{" "}
            {contributionText(household.totalContribution)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {household.factors.map((factor) => (
          <article
            key={factor.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-950">{factor.label}</h3>
              <StatusBadge tone={factor.tone}>{factor.statusLabel}</StatusBadge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Expected change
                </dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {factor.impactLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Score effect
                </dt>
                <dd className="mt-1 font-semibold tabular-nums text-slate-800">
                  {contributionText(factor.contribution)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="mt-6 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Household fit comes from your easier-or-harder comparisons, not a city
          rating. Each answer contributes 0, ±10, or ±15 points, capped at ±30
          total. Essential statuses can also change the final condition;
          excluded and “not sure” factors contribute zero.
        </p>
      </div>
    </section>
  );
}
