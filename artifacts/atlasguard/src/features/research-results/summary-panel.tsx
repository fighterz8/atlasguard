import React from "react";

import { StatusBadge } from "../ux-system/status-badge";

import type { ResearchResultsViewModel } from "./model";

type SummaryPanelProps = Pick<
  ResearchResultsViewModel,
  "condition" | "decisionMeta" | "score" | "confidence" | "stability"
>;

export function SummaryPanel({
  condition,
  decisionMeta,
  score,
  confidence,
  stability,
}: SummaryPanelProps) {
  const financialTone = {
    improves: { label: "Better", tone: "favorable" as const },
    similar: { label: "Similar", tone: "neutral" as const },
    worsens: { label: "Worse", tone: "risk" as const },
  }[decisionMeta.financialDirection];
  const evidenceTone = {
    limited: "caution",
    moderate: "estimate",
    high: "favorable",
  } as const;
  const sensitivityTone = {
    assumption_sensitive: "caution",
    stable: "favorable",
    not_evaluated: "unavailable",
  } as const;
  const meta = [
    {
      label: "Monthly difference",
      value: decisionMeta.monthlyDifference,
      status: financialTone.label,
      tone: financialTone.tone,
    },
    {
      label: "Evidence",
      value: decisionMeta.confidenceLabel,
      status: null,
      tone: evidenceTone[confidence.level],
    },
    {
      label: "Sensitivity",
      value: decisionMeta.stabilityLabel,
      status: null,
      tone: sensitivityTone[stability.level],
    },
  ];
  const scoreTone =
    score.tone === "risk"
      ? {
          name: "risk",
          border: "border-risk",
          surface: "bg-risk-surface/35",
          text: "text-risk",
        }
      : score.tone === "caution"
        ? {
            name: "caution",
            border: "border-caution",
            surface: "bg-caution-surface/45",
            text: "text-caution",
          }
        : {
            name: "favorable",
            border: "border-favorable",
            surface: "bg-favorable-surface/45",
            text: "text-favorable",
          };

  return (
    <section
      aria-labelledby="decision-heading"
      className="grid gap-10 pb-12 pt-12 sm:pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-16"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
          {decisionMeta.routeLabel}
        </p>
        <h1
          id="decision-heading"
          className="mt-6 max-w-2xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl"
        >
          {condition.label}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
          {condition.summary}
        </p>
      </div>
      <div
        data-score-tone={scoreTone.name}
        className={`self-end border-l-4 px-5 py-4 ${scoreTone.border} ${scoreTone.surface}`}
      >
        <h2
          id="movewise-score-heading"
          className={`text-xs font-bold uppercase tracking-[0.16em] ${scoreTone.text}`}
        >
          MoveWise Score
        </h2>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="font-serif text-7xl leading-none tracking-[-0.05em] text-slate-950">
            {score.value}
          </span>
          <span className="text-sm font-semibold text-slate-500">
            out of {score.outOf}
          </span>
        </p>
        <p className="mt-2 font-semibold text-slate-950">{score.bandLabel}</p>
        {score.range ? (
          <p className="mt-1 text-sm text-slate-600">
            {score.range.label} across accepted estimates
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-slate-700">
          {score.baselineMeaning}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {score.boundary}
        </p>
      </div>
      <dl className="border-y border-slate-300 sm:grid sm:grid-cols-3 lg:col-span-2">
        {meta.map(({ label, value, status, tone }) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-5 border-b border-slate-200 py-4 last:border-0 sm:block sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {label}
            </dt>
            <dd className="flex flex-wrap items-center justify-end gap-2 text-right text-sm font-semibold text-slate-900 tabular-nums sm:mt-2 sm:justify-start sm:text-left">
              {label === "Monthly difference" ? (
                <>
                  <span>{value}</span>
                  <StatusBadge tone={tone}>{status}</StatusBadge>
                </>
              ) : (
                <StatusBadge tone={tone}>{value}</StatusBadge>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
