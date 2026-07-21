import { CheckCircle2, Database, FileSearch, Pencil } from "lucide-react";
import React from "react";

import { StatusBadge } from "../ux-system/status-badge";

import type { MoveWiseReviewModel } from "./review-model";

type ReviewStepProps = {
  model: MoveWiseReviewModel;
  onEditAssumptions: () => void;
};

export function ReviewStep({ model, onEditAssumptions }: ReviewStepProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 5 of 5</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Review MoveWise&apos;s picture
          </h1>
        </div>
        <FileSearch aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Before the final score, review the public estimates and
        decision-relevant findings MoveWise is about to use for{" "}
        {model.routeLabel}.
      </p>

      <section
        aria-labelledby="move-picture-heading"
        className="mt-7 border-y border-slate-300 py-5"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Move
            </p>
            <p
              id="move-picture-heading"
              className="mt-2 text-base font-semibold text-slate-950"
            >
              {model.originCity} to {model.destinationCity}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Housing stage
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {model.housingStage}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {model.housingLaterPlan}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Scoring scope
            </p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {model.scoringScope}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="movewise-found-heading" className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="movewise-found-heading"
            className="text-lg font-semibold text-slate-950"
          >
            MoveWise found
          </h2>
          <StatusBadge tone="benchmark">Public evidence</StatusBadge>
        </div>
        <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-300">
          {model.findings.map((finding) => (
            <li key={finding.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">
                    {finding.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {finding.detail}
                  </p>
                </div>
                <span className="flex shrink-0 flex-wrap gap-2">
                  <StatusBadge tone={finding.tone}>{finding.role}</StatusBadge>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="scored-assumptions-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="scored-assumptions-heading"
            className="text-lg font-semibold text-slate-950"
          >
            Assumptions about to be scored
          </h2>
          <button
            type="button"
            onClick={onEditAssumptions}
            className="inline-flex min-h-10 items-center gap-2 border-b-2 border-teal-800 py-1 text-sm font-semibold text-teal-900 hover:border-teal-500"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edit assumptions
          </button>
        </div>
        <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-300">
          {model.assumptions.map((assumption) => (
            <div
              key={assumption.id}
              className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,12rem)] sm:items-center"
            >
              <dt>
                <span className="block text-sm font-semibold text-slate-950">
                  {assumption.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {assumption.source}
                </span>
              </dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-950 sm:text-right">
                {assumption.value}
              </dd>
              <dd className="sm:text-right">
                <StatusBadge tone={assumption.tone}>
                  {assumption.role}
                </StatusBadge>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="data-coverage-heading" className="mt-8">
        <div className="flex items-center gap-2">
          <Database aria-hidden="true" className="h-4 w-4 text-slate-500" />
          <h2
            id="data-coverage-heading"
            className="text-lg font-semibold text-slate-950"
          >
            Data coverage
          </h2>
        </div>
        <ul className="mt-4 space-y-3">
          {model.coverage.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 border-l-4 border-slate-300 bg-white/60 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {item.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {item.detail}
                </p>
              </div>
              <StatusBadge tone={item.tone}>{item.tone}</StatusBadge>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex items-start gap-3 border-l-4 border-favorable bg-favorable-surface px-5 py-4">
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 text-favorable"
        />
        <p className="text-sm leading-6 text-slate-700">
          If this move picture looks right, run the final comparison. If one of
          these assumptions feels off, edit it before the score locks in.
        </p>
      </div>
    </div>
  );
}
