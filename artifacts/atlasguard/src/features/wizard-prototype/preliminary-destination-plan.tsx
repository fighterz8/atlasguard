import { ArrowLeft, CircleAlert, RotateCcw, SearchCheck } from "lucide-react";
import React from "react";

import { StatusBadge } from "../ux-system/status-badge";
import type { PreliminaryDestinationPlan } from "./submit-wizard-draft";

type PreliminaryDestinationPlanExperienceProps = {
  plan: PreliminaryDestinationPlan;
  onEditAssumptions?: () => void;
  onReset?: () => void;
};

export function PreliminaryDestinationPlanExperience({
  plan,
  onEditAssumptions,
  onReset,
}: PreliminaryDestinationPlanExperienceProps) {
  return (
    <div className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <header className="border-b border-slate-200/80 bg-[#f7f8f4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <a
            href={import.meta.env.BASE_URL}
            className="text-lg font-semibold tracking-[-0.03em] text-slate-950"
          >
            Move<span className="text-teal-700">Wise</span>
          </a>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onEditAssumptions ? (
              <button
                type="button"
                onClick={onEditAssumptions}
                className="inline-flex min-h-11 items-center gap-2 px-2 py-2 text-sm font-semibold text-teal-900 hover:text-teal-700"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Edit assumptions
              </button>
            ) : null}
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-11 items-center gap-2 px-2 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Start over
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <section className="border-b border-slate-300 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <p className="eyebrow">Preliminary comparison</p>
              <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.04em] text-slate-950 sm:text-6xl">
                Your destination research plan
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                {plan.route.origin} to {plan.route.destination}. MoveWise has
                separated what is known now from the destination estimates that
                still need evidence or confirmation.
              </p>
            </div>
            <aside className="border-l-4 border-caution bg-caution-surface p-5">
              <div className="flex items-start gap-3">
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-caution"
                />
                <div>
                  <StatusBadge tone="caution">{plan.score.label}</StatusBadge>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {plan.score.explanation}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section
          aria-labelledby="household-plan-heading"
          className="border-b border-slate-300 py-12 sm:py-16"
        >
          <p className="eyebrow">You told us</p>
          <h2
            id="household-plan-heading"
            className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
          >
            Your household plan
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {plan.householdPlan.items.map((item) => (
              <article key={item.id} className="border-t border-slate-300 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-950">{item.label}</h3>
                  {item.stopsMove ? (
                    <StatusBadge tone="caution">
                      Could stop the move
                    </StatusBadge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            These requirements guide research. They do not receive favorable or
            unfavorable score points until destination evidence is verified
            under a separately reviewed rule.
          </p>
        </section>

        <section
          aria-labelledby="current-baseline-heading"
          className="border-b border-slate-300 py-12 sm:py-16"
        >
          <p className="eyebrow">Known now</p>
          <h2
            id="current-baseline-heading"
            className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
          >
            Your current monthly baseline
          </h2>
          <dl className="mt-8 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-3">
            {plan.currentBaseline.map((item) => (
              <div key={item.id} className="bg-white p-5">
                <dt className="text-sm font-medium text-slate-600">
                  {item.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
                  {item.value}
                </dd>
                <dd className="mt-3">
                  <StatusBadge tone="neutral">{item.provenance}</StatusBadge>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="available-evidence-heading"
          className="border-b border-slate-300 py-12 sm:py-16"
        >
          <p className="eyebrow">Available evidence</p>
          <h2
            id="available-evidence-heading"
            className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
          >
            Useful context, kept inside its boundary
          </h2>
          <div className="mt-8 space-y-4">
            {plan.availableEvidence.map((item) => (
              <article
                key={item.id}
                className="border-y border-slate-300 py-6 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)] sm:gap-8"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="neutral">{item.provenance}</StatusBadge>
                    <StatusBadge tone="unavailable">
                      {item.boundary}
                    </StatusBadge>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">
                    {item.label}
                  </h3>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950">
                    {item.reading}
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <p className="text-sm leading-6 text-slate-600">
                    {item.detail}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-800">
                    MoveWise did not substitute this metro median into your
                    budget or score.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="missing-estimates-heading"
          className="border-b border-slate-300 py-12 sm:py-16"
        >
          <p className="eyebrow">Destination budget</p>
          <h2
            id="missing-estimates-heading"
            className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
          >
            What still needs confirmation
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {plan.missingEstimates.map((item) => (
              <article key={item.id} className="border-t border-slate-300 py-5">
                <StatusBadge tone="caution">{item.provenance}</StatusBadge>
                <h3 className="mt-3 text-base font-semibold text-slate-950">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="research-next-heading"
          className="py-12 sm:py-16"
        >
          <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div>
              <SearchCheck
                aria-hidden="true"
                className="h-7 w-7 text-teal-700"
              />
              <p className="eyebrow mt-4">Research next</p>
              <h2
                id="research-next-heading"
                className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
              >
                How this becomes decision-ready
              </h2>
            </div>
            <ol className="border-t border-slate-300">
              {plan.researchSteps.map((step, index) => (
                <li
                  key={step.id}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-slate-200 py-5"
                >
                  <span className="text-sm font-bold tabular-nums text-teal-800">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {step.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
          Research preview · no destination financial value has been inferred,
          copied from the origin, or substituted from metro context.
        </footer>
      </main>
    </div>
  );
}
