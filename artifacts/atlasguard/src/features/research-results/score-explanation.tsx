import React from "react";

import { StatusBadge } from "../ux-system/status-badge";

import type { ResearchResultsViewModel } from "./model";

type ScoreExplanationProps = Pick<ResearchResultsViewModel, "score">;

const contributionLabel = (value: number) =>
  `${value > 0 ? "+" : ""}${value} score ${Math.abs(value) === 1 ? "point" : "points"}`;

const financeDirectionCopy = {
  improves: { label: "Better", tone: "favorable" as const },
  similar: { label: "Similar", tone: "neutral" as const },
  worsens: { label: "Worse", tone: "risk" as const },
};

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
          The score condenses the budget, daily-life tradeoffs, and must-have
          needs into one read. The cards below show what moved it.
        </p>
      </div>

      <dl className="mt-10 grid border-y border-slate-300 sm:grid-cols-3">
        <div className="border-b border-slate-200 bg-white/60 px-4 py-5 sm:border-b-0 sm:border-r sm:px-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
            {score.exactFinance.label}
          </dt>
          <dd className="mt-2">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums text-slate-950">
                {score.exactFinance.value}
              </span>
              <StatusBadge
                tone={financeDirectionCopy[score.exactFinance.direction].tone}
              >
                {financeDirectionCopy[score.exactFinance.direction].label}
              </StatusBadge>
            </span>
            <span className="mt-2 block text-sm font-normal leading-6 text-slate-600">
              Monthly breathing room after rent and recurring bills.
            </span>
            <span className="mt-2 block">
              <StatusBadge tone="benchmark">MoveWise calculated</StatusBadge>
            </span>
          </dd>
        </div>
        <div className="border-b border-slate-200 bg-favorable-surface/55 px-4 py-5 sm:border-b-0 sm:border-r sm:px-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
            Strongest supported effect
          </dt>
          {score.strongestEffect ? (
            <dd className="mt-2">
              <span className="block text-lg font-semibold text-slate-950">
                {score.strongestEffect.label}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={
                    score.strongestEffect.kind === "lift" ? "favorable" : "risk"
                  }
                >
                  {score.strongestEffect.kind === "lift" ? "Lift" : "Tradeoff"}
                </StatusBadge>
                <span className="text-sm font-semibold tabular-nums text-slate-800">
                  {contributionLabel(score.strongestEffect.contribution)}
                </span>
              </span>
            </dd>
          ) : (
            <dd className="mt-2 text-sm leading-6 text-slate-600">
              No evidence-backed factor moves the score at these inputs.
            </dd>
          )}
        </div>
        <div className="bg-caution-surface/70 px-4 py-5 sm:px-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
            Closest decision change
          </dt>
          {score.decisionChangingAssumption ? (
            <dd className="mt-2">
              <span className="block text-lg font-semibold text-slate-950">
                {score.decisionChangingAssumption.label}
              </span>
              <span className="mt-1 block text-sm font-semibold tabular-nums text-caution">
                {score.decisionChangingAssumption.operator[0].toUpperCase()}
                {score.decisionChangingAssumption.operator.slice(1)}{" "}
                {score.decisionChangingAssumption.threshold}/month
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-700">
                Currently {score.decisionChangingAssumption.currentValue}/month
                {" · "}
                {score.decisionChangingAssumption.distance}/month away. Changes
                the profile to{" "}
                <strong>
                  {score.decisionChangingAssumption.changesConditionTo}
                </strong>
                .
              </span>
            </dd>
          ) : (
            <dd className="mt-2 text-sm leading-6 text-slate-600">
              No exact financial threshold changes this Decision Profile.
            </dd>
          )}
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 border-l-4 border-caution bg-caution-surface px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-caution">
            How estimates were calculated
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {score.readiness.explanation}
          </p>
        </div>
        <StatusBadge tone={score.readiness.tone}>
          {score.readiness.label}
        </StatusBadge>
      </div>

      {score.mode === "deterministic" && score.essentialSummary?.active ? (
        <div className="mt-6 border-l-4 border-caution bg-caution-surface px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-caution">
            Non-negotiable rental requirement
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge tone={score.essentialSummary.tone}>
              {score.essentialSummary.label}
            </StatusBadge>
            <p className="text-sm leading-6 text-slate-700">
              A non-negotiable rent ceiling can override the numeric score when
              the destination rent estimate exceeds it. The rental section below
              shows the exact comparison.
            </p>
          </div>
        </div>
      ) : null}

      {score.activeBlocker ? (
        <div
          role="note"
          className="mt-8 border-l-4 border-caution bg-caution-surface px-5 py-4"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-caution">
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
          {score.mode === "deterministic"
            ? "Not included in this score"
            : "What the score does not cover yet"}
        </h3>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-y border-slate-300 py-4">
          <StatusBadge tone="unavailable">Not scored yet</StatusBadge>
          <p className="text-sm leading-6 text-slate-700">
            {score.missingComponents.join(" · ")}
          </p>
        </div>
      </div>

      <details className="mt-8 border-y border-slate-200 py-1">
        <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-slate-800">
          Verification references · Score rule {score.scoreVersion}
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
