import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import { EvidencePanel } from "@/features/research-results/evidence-panel";
import { ClimatePanel } from "@/features/research-results/climate-panel";
import { HousingContextPanel } from "@/features/research-results/housing-context-panel";
import { MoneyPanel } from "@/features/research-results/money-panel";
import {
  createResearchResultsViewModel,
  type ResearchResultsViewModel,
} from "@/features/research-results/model";
import { PriorityPanel } from "@/features/research-results/priority-panel";
import { SummaryPanel } from "@/features/research-results/summary-panel";
import { WhatIfPanel } from "@/features/research-results/what-if-panel";

type ResearchResultsExperienceProps = {
  model: ResearchResultsViewModel;
  reviewedAssumptions?: boolean;
  onEditAssumptions?: () => void;
  onReset?: () => void;
  showWhatIf?: boolean;
  whatIfEvaluation?: VerifiedResearchEvaluationResult;
};

export function ResearchResultsExperience({
  model,
  reviewedAssumptions = false,
  onEditAssumptions,
  onReset,
  showWhatIf = false,
  whatIfEvaluation,
}: ResearchResultsExperienceProps) {
  const hasWhatIf = showWhatIf || whatIfEvaluation !== undefined;
  const hasMaterialFindings =
    model.findings.drivers.length +
      model.findings.tradeoffs.length +
      model.findings.blockers.length >
    0;

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
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-50"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Edit assumptions
              </button>
            ) : null}
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Start over
              </button>
            ) : null}
            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
              Deterministic preview
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <SummaryPanel {...model} />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <MoneyPanel
            route={model.route}
            finances={model.finances}
            reviewedAssumptions={reviewedAssumptions}
          />
          {hasWhatIf ? (
            <WhatIfPanel evaluation={whatIfEvaluation} />
          ) : (
            <section
              aria-labelledby="what-if-unavailable-heading"
              className="panel lg:col-span-2"
            >
              <p className="eyebrow">Try another scenario</p>
              <h2 id="what-if-unavailable-heading" className="section-heading">
                Change an assumption and rerun
              </h2>
              {onEditAssumptions ? (
                <button
                  type="button"
                  onClick={onEditAssumptions}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-700 hover:text-teal-900"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Edit my numbers
                </button>
              ) : null}
            </section>
          )}

          <section
            aria-labelledby="reading-heading"
            className={
              model.priority || model.climate ? "panel" : "panel lg:col-span-2"
            }
          >
            <p className="eyebrow">Key takeaways</p>
            <h2 id="reading-heading" className="section-heading">
              Why MoveWise landed here
            </h2>
            {hasMaterialFindings ? (
              <ul className="mt-5 space-y-3">
                {[
                  ...model.findings.blockers,
                  ...model.findings.tradeoffs,
                  ...model.findings.drivers,
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-6 text-slate-700"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 text-teal-700"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="font-medium text-slate-900">
                  No material driver or blocker was detected.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {model.finances.reading}
                  {model.priority || model.climate
                    ? " No included supporting factor is large enough to change this reading."
                    : " Commute and hot days were excluded because you said they do not matter."}
                </p>
              </div>
            )}
          </section>

          {model.priority ? (
            <section aria-labelledby="supporting-heading" className="panel">
              <p className="eyebrow">Supporting context</p>
              <h2 id="supporting-heading" className="section-heading">
                Commute comparison
              </h2>
              <div className="mt-5">
                <PriorityPanel route={model.route} priority={model.priority} />
              </div>
            </section>
          ) : null}

          {model.climate ? (
            <section
              aria-labelledby="climate-supporting-heading"
              className="panel"
            >
              <p className="eyebrow">Supporting context</p>
              <h2 id="climate-supporting-heading" className="section-heading">
                Hot-day comparison
              </h2>
              <div className="mt-5">
                <ClimatePanel route={model.route} climate={model.climate} />
              </div>
            </section>
          ) : null}

          <HousingContextPanel
            route={model.route}
            housingContext={model.housingContext}
          />

          <EvidencePanel
            evidence={model.evidence}
            climateEvidence={model.climateEvidence}
          />
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
          <p>
            Research preview · this reading is based on the information entered
            and the comparison data currently available.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <ResearchResultsExperience
      model={createResearchResultsViewModel()}
      showWhatIf
    />
  );
}
