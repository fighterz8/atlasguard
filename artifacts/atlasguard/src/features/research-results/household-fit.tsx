import { Database, Home } from "lucide-react";
import React from "react";

import { StatusBadge } from "../ux-system/status-badge";

import type { ResearchResultsViewModel } from "./model";

type HouseholdFitProps = {
  household: NonNullable<ResearchResultsViewModel["household"]>;
};

export function HouseholdFit({ household }: HouseholdFitProps) {
  const plan = household.rentalPlan;

  return (
    <section
      aria-labelledby="household-fit-heading"
      className="border-t border-slate-300 py-12 sm:py-16"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="eyebrow">Your first rental</p>
          <h2
            id="household-fit-heading"
            className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.035em] text-slate-950 sm:text-5xl"
          >
            How your rental requirement changed the result
          </h2>
        </div>
        <div className="border-l-4 border-teal-700 bg-teal-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-950">
            <Home aria-hidden="true" className="h-4 w-4" />
            {household.modeLabel}
          </div>
          {household.summary?.active ? (
            <div className="mt-3">
              <StatusBadge tone={household.summary.tone}>
                {household.summary.label}
              </StatusBadge>
            </div>
          ) : null}
        </div>
      </div>

      {plan ? (
        <>
          <div className="mt-10 border-y border-slate-300 py-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  {plan.stageLabel}
                </p>
                <p className="mt-2 text-base leading-7 text-slate-700">
                  {plan.realitySummary}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-950">
                  {plan.laterPlanLabel}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Buying later does not change this first-stage rental score.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                {plan.bedroomLabel}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-slate-600">Current metro</dt>
                  <dd className="font-semibold tabular-nums text-slate-950">
                    {plan.originRent}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-slate-600">Destination metro</dt>
                  <dd className="font-semibold tabular-nums text-slate-950">
                    {plan.destinationRent}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-slate-200 pt-4 text-sm font-semibold text-teal-900">
                {plan.rentDifference} per month
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Share of rental stock
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-slate-600">Current metro</dt>
                  <dd className="font-semibold tabular-nums text-slate-950">
                    {plan.originStockShare}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-slate-600">Destination metro</dt>
                  <dd className="font-semibold tabular-nums text-slate-950">
                    {plan.destinationStockShare}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
                {plan.supplySignal} Check current listings next.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Your rent ceiling
              </p>
              <p className="mt-4 text-2xl font-semibold tabular-nums text-slate-950">
                {plan.ceiling}
              </p>
              <div className="mt-3">
                <StatusBadge
                  tone={
                    plan.ceilingStatus === "Within rent ceiling"
                      ? "favorable"
                      : "risk"
                  }
                >
                  {plan.ceilingStatus}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                {plan.ceilingDifference}
              </p>
            </article>
          </div>

          <div className="mt-6 border-l-4 border-teal-700 bg-teal-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-900">
              How this affects your score
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {plan.scorePath}
            </p>
          </div>

          <details className="mt-6 border-y border-slate-200 py-1">
            <summary className="flex min-h-12 cursor-pointer items-center gap-2 py-3 text-sm font-semibold text-slate-800">
              <Database aria-hidden="true" className="h-4 w-4 text-slate-500" />
              Rental evidence and limits
            </summary>
            <div className="border-t border-slate-200 py-4 text-xs leading-5 text-slate-600">
              <p className="font-semibold text-slate-800">
                {plan.sourceLabel} · {plan.observationPeriod}
              </p>
              <p className="mt-2">{plan.boundary}</p>
            </div>
          </details>
        </>
      ) : (
        <p className="mt-8 border-y border-slate-300 py-5 text-sm leading-6 text-slate-600">
          Bedroom-specific rental evidence is available after the Wizard rental
          plan is submitted.
        </p>
      )}

      <section
        aria-labelledby="household-essentials-results-heading"
        className="mt-10 border-y border-slate-300 py-5"
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Household essentials
            </p>
            <h3
              id="household-essentials-results-heading"
              className="mt-2 text-lg font-semibold text-slate-950"
            >
              What still has to work
            </h3>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {household.essentials.boundary}
          </p>
        </div>
        {household.essentials.factors.length > 0 ? (
          <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {household.essentials.factors.map((factor) => (
              <li
                key={factor.id}
                className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_8rem] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {factor.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Contribution: {factor.contribution > 0 ? "+" : ""}
                    {factor.contribution}
                  </p>
                </div>
                <div>
                  <StatusBadge tone={factor.tone}>{factor.status}</StatusBadge>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 sm:text-right">
                  {factor.role}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 border-y border-slate-200 py-4 text-sm leading-6 text-slate-600">
            No non-housing household essentials were marked for this run.
          </p>
        )}
      </section>
    </section>
  );
}
