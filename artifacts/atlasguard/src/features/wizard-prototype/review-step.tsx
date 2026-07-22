import {
  ClipboardCheck,
  Database,
  Pencil,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import React from "react";

import { moveWiseEvidenceLabel, moveWiseOriginLabel } from "./decision-ledger";
import { DecisionGatePanel } from "./decision-gate-panel";
import type { MoveWiseDecisionGateModule } from "./decision-gate-model";
import type { MoveWiseReviewModel, ReviewGroup } from "./review-model";

type ReviewStepProps = {
  model: MoveWiseReviewModel;
  onEditAssumptions: () => void;
  onEditModule?: (moduleId: MoveWiseDecisionGateModule) => void;
};

const sections: Array<{
  group: ReviewGroup;
  label: string;
  icon: typeof TrendingUp;
  accent: string;
}> = [
  {
    group: "best_signs",
    label: "Best signs",
    icon: TrendingUp,
    accent: "text-favorable",
  },
  {
    group: "pressure_points",
    label: "Pressure points",
    icon: TriangleAlert,
    accent: "text-risk",
  },
  {
    group: "family_checks",
    label: "Family checks",
    icon: ClipboardCheck,
    accent: "text-caution",
  },
];

const findingPriority: Record<string, number> = {
  "monthly-cushion": 0,
  "rent-ceiling-fit": 1,
  "bedroom-rent-fit": 2,
  "household-essentials": 3,
  "destination-income": 4,
  "recurring-expenses": 5,
  "climate-risk-context": 6,
  "rental-supply": 7,
  "daily-life-friction": 8,
  "biggest-caveat": 9,
};

export function ReviewStep({
  model,
  onEditAssumptions,
  onEditModule,
}: ReviewStepProps) {
  return (
    <div>
      <div>
        <p className="eyebrow">Your relocation brief</p>
        <h1
          id="wizard-step-heading"
          tabIndex={-1}
          className="section-heading max-w-2xl"
        >
          Check the facts that could change your brief
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Review the strongest signs, the pressure points, and the family checks
          for {model.routeLabel}.
        </p>
      </div>

      <div className="mt-10">
        <DecisionGatePanel
          gate={model.decisionGate}
          showItems
          onEditModule={onEditModule}
        />
      </div>

      <section
        aria-labelledby="move-picture-heading"
        className="mt-7 grid gap-5 border-y border-slate-300 py-5 sm:grid-cols-2"
      >
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
            First housing stage
          </p>
          <p className="mt-2 text-base font-semibold text-slate-950">
            {model.housingStage}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {model.housingLaterPlan}
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-10">
        {sections.map(({ group, label, icon: Icon, accent }) => {
          const findings = model.findings
            .filter((finding) => finding.group === group)
            .sort(
              (left, right) =>
                (findingPriority[left.id] ?? 99) -
                (findingPriority[right.id] ?? 99),
            )
            .slice(0, group === "pressure_points" ? undefined : 3);
          return (
            <section key={group} aria-labelledby={`review-${group}-heading`}>
              <div className="flex items-center gap-2 border-b border-slate-300 pb-3">
                <Icon aria-hidden="true" className={`h-4 w-4 ${accent}`} />
                <h2
                  id={`review-${group}-heading`}
                  className="text-base font-semibold text-slate-950"
                >
                  {label}
                </h2>
              </div>
              {findings.length > 0 ? (
                <ul className="divide-y divide-slate-200">
                  {findings.map((finding) => (
                    <li key={finding.id} className="py-4">
                      <p className="text-sm font-semibold text-slate-950">
                        {finding.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {finding.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm leading-6 text-slate-500">
                  Nothing material surfaced in this group.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <section
        aria-labelledby="scored-assumptions-heading"
        className="mt-10 border-t border-slate-300 pt-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="scored-assumptions-heading"
            className="text-lg font-semibold text-slate-950"
          >
            Numbers MoveWise used
          </h2>
          <button
            type="button"
            onClick={onEditAssumptions}
            className="inline-flex min-h-10 items-center gap-2 border-b-2 border-teal-800 py-1 text-sm font-semibold text-teal-900 hover:border-teal-500"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edit Budget
          </button>
        </div>
        <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-300">
          {model.assumptions.map((assumption) => (
            <div
              key={assumption.id}
              className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center"
            >
              <dt>
                <span className="block text-sm font-semibold text-slate-950">
                  {assumption.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {moveWiseOriginLabel[assumption.origin]}
                  {assumption.evidenceStatus
                    ? ` · ${moveWiseEvidenceLabel[assumption.evidenceStatus]}`
                    : ""}
                </span>
                {assumption.id === "rent-ceiling" ? (
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {assumption.source}
                  </span>
                ) : null}
              </dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-950 sm:text-right">
                {assumption.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <details className="mt-8 border-y border-slate-200">
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 py-3 text-sm font-semibold text-slate-800">
          <Database aria-hidden="true" className="h-4 w-4 text-slate-500" />
          Sources and limits
        </summary>
        <ul className="divide-y divide-slate-200 border-t border-slate-200">
          {model.coverage.map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-sm font-semibold text-slate-950">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
