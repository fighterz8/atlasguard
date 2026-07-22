import React from "react";

import { StatusBadge } from "../ux-system/status-badge";
import type { StatusBadgeTone } from "../ux-system/status-badge";

import type {
  MoveWiseDecisionGateModel,
  MoveWiseDecisionGateModule,
  MoveWiseDecisionGateStatus,
} from "./decision-gate-model";

type DecisionGatePanelProps = {
  gate: MoveWiseDecisionGateModel;
  showItems?: boolean;
  showReadinessBadge?: boolean;
  onEditModule?: (moduleId: MoveWiseDecisionGateModule) => void;
};

const statusTone: Record<MoveWiseDecisionGateStatus, StatusBadgeTone> = {
  estimated: "estimate",
  unknown: "unavailable",
  conflict: "caution",
  blocked: "risk",
};

const moduleLabel: Record<MoveWiseDecisionGateModule, string> = {
  budget: "Budget",
  first_home: "First home",
  household: "Household",
};

export function DecisionGatePanel({
  gate,
  showItems = false,
  showReadinessBadge = true,
  onEditModule,
}: DecisionGatePanelProps) {
  const summary = [
    ["Known values", gate.counts.known],
    ["Estimated", gate.counts.estimated],
    ["Unknown", gate.counts.unknown],
    ["Conflict", gate.counts.conflict],
    ["Blocked", gate.counts.blocked],
  ] as const;

  return (
    <section
      aria-labelledby="decision-gate-heading"
      className="border-y border-slate-300 py-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Decision gate
          </p>
          <h2
            id="decision-gate-heading"
            className="mt-2 text-lg font-semibold text-slate-950"
          >
            What this brief knows—and what can still change it
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {gate.readiness.explanation}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-52 sm:justify-end">
          {showReadinessBadge ? (
            <StatusBadge tone={gate.readiness.tone}>
              {gate.readiness.label}
            </StatusBadge>
          ) : null}
          <StatusBadge tone={gate.evidenceConfidence.tone}>
            Evidence {gate.evidenceConfidence.label.toLowerCase()}
          </StatusBadge>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        {summary.map(([label, count]) => (
          <div key={label} className="border-l-2 border-slate-200 pl-3">
            <dt className="text-xs font-semibold text-slate-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
              {count}
            </dd>
          </div>
        ))}
      </dl>

      {showItems ? (
        gate.items.length > 0 ? (
          <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
            {gate.items.map((item) => (
              <li
                key={item.id}
                className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">
                      {item.label}
                    </p>
                    <StatusBadge tone={statusTone[item.status]}>
                      {item.statusLabel}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.action}
                  </p>
                </div>
                {onEditModule ? (
                  <button
                    type="button"
                    onClick={() => onEditModule(item.editRoute)}
                    className="inline-flex min-h-10 w-fit items-center border-b-2 border-teal-800 py-1 text-sm font-semibold text-teal-900 hover:border-teal-500"
                  >
                    Edit {moduleLabel[item.editRoute]}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">
                    {moduleLabel[item.editRoute]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
            No blocking incompleteness remains for this supported comparison.
          </p>
        )
      ) : null}
    </section>
  );
}
