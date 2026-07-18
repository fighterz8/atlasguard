import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Info,
  MoveRight,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import { EvidencePanel } from "@/features/research-results/evidence-panel";
import { HousingContextPanel } from "@/features/research-results/housing-context-panel";
import { MoneyPanel } from "@/features/research-results/money-panel";
import {
  createResearchResultsViewModel,
  type ResearchResultsViewModel,
} from "@/features/research-results/model";
import { PriorityPanel } from "@/features/research-results/priority-panel";
import { ResearchBanner } from "@/features/research-results/research-banner";
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
      <ResearchBanner reviewedAssumptions={reviewedAssumptions} />
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

        <section
          aria-label="Interpretation limits"
          className="mt-8 grid gap-3 sm:grid-cols-2"
        >
          <div className="status-note">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            />
            <div>
              <strong>Confidence: {model.confidence.level}.</strong>{" "}
              {model.confidence.explanation}
            </div>
          </div>
          <div className="status-note">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            />
            <div>
              <strong>
                Stability: {model.stability.level.replaceAll("_", " ")}.
              </strong>{" "}
              {model.stability.explanation}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <MoneyPanel
            route={model.route}
            finances={model.finances}
            reviewedAssumptions={reviewedAssumptions}
          />
          <PriorityPanel route={model.route} priority={model.priority} />
          <HousingContextPanel
            route={model.route}
            housingContext={model.housingContext}
          />
          {hasWhatIf ? (
            <WhatIfPanel evaluation={whatIfEvaluation} />
          ) : (
            <section
              aria-labelledby="what-if-unavailable-heading"
              className="panel lg:col-span-2"
            >
              <div className="flex items-start gap-3">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
                />
                <div>
                  <p className="eyebrow">Assumption sensitivity</p>
                  <h2
                    id="what-if-unavailable-heading"
                    className="section-heading"
                  >
                    What-if ranges are not available yet
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    This review collected point estimates, not plausible ranges.
                    MoveWise will not invent uncertainty or show misleading
                    sliders. Edit an assumption and rerun the same deterministic
                    evaluation instead.
                  </p>
                  {onEditAssumptions ? (
                    <button
                      type="button"
                      onClick={onEditAssumptions}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-700 hover:text-teal-900"
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      Edit reviewed assumptions
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="reading-heading" className="panel">
            <p className="eyebrow">Why this result</p>
            <h2 id="reading-heading" className="section-heading">
              Decision reading
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
                  {model.finances.reading} The commute change is also not
                  material. More evidence is required—not more confident
                  wording.
                </p>
              </div>
            )}
          </section>

          <section
            aria-labelledby="next-heading"
            className="panel bg-slate-950 text-white"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">
              Next investigation
            </p>
            <h2
              id="next-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
            >
              What would make this useful?
            </h2>
            <ol className="mt-5 space-y-4">
              {model.nextSteps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 text-sm leading-6 text-slate-200"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-200">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
              <li className="flex gap-3 text-sm leading-6 text-slate-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-200">
                  {model.nextSteps.length + 1}
                </span>
                Add verified cost-of-living and climate evidence before
                comparing a real move.
              </li>
            </ol>
            <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <MoveRight aria-hidden="true" className="h-4 w-4" />
              {hasWhatIf
                ? "What-if changes use exact deterministic boundaries—not a probability forecast."
                : "Rerunning reviewed assumptions uses the same deterministic engine—not a probability forecast."}
            </p>
          </section>

          <EvidencePanel evidence={model.evidence} />
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Research-only result · no account, browser storage, model provider,
            or live API call.
          </p>
          <a
            className="inline-flex items-center gap-1 font-medium text-teal-800 hover:text-teal-950"
            href="#evidence-heading"
          >
            Inspect the evidence{" "}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
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
