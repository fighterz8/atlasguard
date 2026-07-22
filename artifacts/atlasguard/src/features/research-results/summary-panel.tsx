import { ArrowUpRight, CircleHelp, TriangleAlert } from "lucide-react";
import React from "react";

import { StatusBadge } from "../ux-system/status-badge";
import { DecisionGatePanel } from "../wizard-prototype/decision-gate-panel";

import type { ResearchResultsViewModel } from "./model";
import type { MoveWiseDecisionGateModule } from "../wizard-prototype/decision-gate-model";

type SummaryPanelProps = Pick<
  ResearchResultsViewModel,
  "brief" | "decisionMeta"
> & {
  onEditModule?: (moduleId: MoveWiseDecisionGateModule) => void;
};

const sections = [
  {
    key: "improvements",
    label: "Improves",
    icon: ArrowUpRight,
    accent: "text-favorable",
  },
  {
    key: "pressures",
    label: "Gets harder",
    icon: TriangleAlert,
    accent: "text-risk",
  },
  {
    key: "checks",
    label: "Check before deciding",
    icon: CircleHelp,
    accent: "text-caution",
  },
] as const;

export function SummaryPanel({
  brief,
  decisionMeta,
  onEditModule,
}: SummaryPanelProps) {
  const visibleSections = brief.decisionGate
    ? sections.filter(({ key }) => key !== "checks")
    : sections;
  return (
    <section
      aria-labelledby="decision-heading"
      className="pb-10 pt-10 sm:pb-12 sm:pt-14"
    >
      <div className="max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
          Relocation brief · {decisionMeta.routeLabel}
        </p>
        <h1
          id="decision-heading"
          tabIndex={-1}
          className="mt-4 max-w-4xl font-serif text-4xl leading-tight tracking-normal text-slate-950 sm:text-5xl"
        >
          {brief.judgment}
        </h1>
      </div>

      <dl className="mt-7 grid border-y border-slate-300 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-4 sm:border-b-0 sm:border-r sm:pr-6">
          <dt className="text-sm font-semibold text-slate-600">Move outlook</dt>
          <dd>
            <StatusBadge tone={brief.outlook.tone}>
              {brief.outlook.label}
            </StatusBadge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-4 sm:pl-6">
          <dt className="text-sm font-semibold text-slate-600">
            Decision readiness
          </dt>
          <dd>
            <StatusBadge tone={brief.readiness.tone}>
              {brief.readiness.label}
            </StatusBadge>
          </dd>
        </div>
      </dl>

      {brief.decisionGate ? (
        <div className="mt-7">
          <DecisionGatePanel
            gate={brief.decisionGate}
            showItems
            showReadinessBadge={false}
            onEditModule={onEditModule}
          />
        </div>
      ) : null}

      <div
        className={`mt-8 grid gap-8 lg:gap-10 ${visibleSections.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
      >
        {visibleSections.map(({ key, label, icon: Icon, accent }) => (
          <section key={key} aria-labelledby={`brief-${key}-heading`}>
            <div className="flex items-center gap-2 border-b border-slate-300 pb-3">
              <Icon aria-hidden="true" className={`h-4 w-4 ${accent}`} />
              <h2
                id={`brief-${key}-heading`}
                className="text-base font-semibold text-slate-950"
              >
                {label}
              </h2>
            </div>
            <ul className="divide-y divide-slate-200">
              {brief[key].map((item) => (
                <li key={`${item.label}:${item.detail}`} className="py-4">
                  <p className="text-sm font-semibold text-slate-950">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
