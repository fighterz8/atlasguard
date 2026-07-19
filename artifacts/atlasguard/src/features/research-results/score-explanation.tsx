import React from "react";

import type { ResearchResultsViewModel } from "./model";

type ScoreExplanationProps = Pick<ResearchResultsViewModel, "score">;

const contributionLabel = (value: number) =>
  `${value > 0 ? "+" : ""}${value} score ${Math.abs(value) === 1 ? "point" : "points"}`;

export function ScoreExplanation({ score }: ScoreExplanationProps) {
  return (
    <section
      aria-labelledby="score-explanation-heading"
      className="border-t border-slate-300 py-12 sm:py-16"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="eyebrow">How to read it</p>
          <h2
            id="score-explanation-heading"
            className="mt-3 max-w-2xl font-serif text-4xl tracking-[-0.035em] text-slate-950 sm:text-5xl"
          >
            What sits behind the score
          </h2>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          The Decision Profile remains the source of truth. The score is a
          compact reading of the same finances, preferences, blockers, and
          evidence—not a replacement for them.
        </p>
      </div>

      <dl className="mt-10 grid border-y border-slate-300 sm:grid-cols-3">
        <div className="border-b border-slate-200 py-5 sm:border-b-0 sm:border-r sm:pr-6">
          <dt className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
            Estimate sensitivity
          </dt>
          <dd className="mt-2">
            <span className="block text-2xl font-semibold tabular-nums text-slate-950">
              {score.range?.label ?? "No score range"}
            </span>
            <span className="mt-2 block text-sm font-normal leading-6 text-slate-600">
              {score.range?.explanation ??
                "No accepted low/high financial estimate changes this point score."}
            </span>
          </dd>
        </div>
        <div className="border-b border-slate-200 py-5 sm:border-b-0 sm:border-r sm:px-6">
          <dt className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
            {score.exactFinance.label}
          </dt>
          <dd className="mt-2">
            <span className="block text-2xl font-semibold tabular-nums text-slate-950">
              {score.exactFinance.value}
            </span>
            <span className="mt-2 block text-sm font-normal leading-6 text-slate-600">
              Exact monthly arithmetic from the assumptions shown below.
            </span>
          </dd>
        </div>
        <div className="py-5 sm:pl-6">
          <dt className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
            Evidence confidence
          </dt>
          <dd className="mt-2">
            <span className="block text-2xl font-semibold text-slate-950">
              {score.evidenceConfidence.label}
            </span>
            <span className="mt-2 block text-sm font-normal leading-6 text-slate-600">
              {score.evidenceConfidence.explanation}
            </span>
          </dd>
        </div>
      </dl>

      {score.activeBlocker ? (
        <div
          role="note"
          className="mt-8 border-l-4 border-amber-600 bg-amber-50/60 px-5 py-4"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-900">
            Score capped at {score.activeBlocker.scoreCap}
          </p>
          <p className="mt-2 font-semibold text-slate-950">
            {score.activeBlocker.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {score.activeBlocker.explanation}
          </p>
        </div>
      ) : null}

      <div aria-labelledby="score-factors-heading" className="mt-10 max-w-2xl">
        <h3
          id="score-factors-heading"
          className="text-lg font-semibold text-slate-950"
        >
          Strongest supported signals
        </h3>
        <div className="mt-4 border-y border-slate-300">
          {score.strongestImprovement ? (
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Biggest lift
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {score.strongestImprovement.label}
                </p>
              </div>
              <p className="self-center text-sm font-semibold tabular-nums text-teal-900">
                {contributionLabel(score.strongestImprovement.contribution)}
              </p>
            </div>
          ) : (
            <div className="border-b border-slate-200 py-4 text-sm text-slate-600">
              No supported lift at the point estimates.
            </div>
          )}
          {score.strongestTradeoff ? (
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Biggest tradeoff
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {score.strongestTradeoff.label}
                </p>
              </div>
              <p className="self-center text-sm font-semibold tabular-nums text-slate-800">
                {contributionLabel(score.strongestTradeoff.contribution)}
              </p>
            </div>
          ) : (
            <div className="border-b border-slate-200 py-4 text-sm text-slate-600">
              No supported tradeoff at the point estimates.
            </div>
          )}
          <div className="py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Not scored yet
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {score.missingComponents.join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <details className="mt-8 border-y border-slate-200 py-1">
        <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-slate-800">
          Calculation references · Score rule {score.scoreVersion}
        </summary>
        <div className="border-t border-slate-200 py-4">
          {score.calculationEvidenceRefs.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-600">
              {score.calculationEvidenceRefs.map((reference) => (
                <li key={reference}>
                  <code className="break-all">{reference}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">
              No score-moving evidence reference is active at the point
              estimates.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
