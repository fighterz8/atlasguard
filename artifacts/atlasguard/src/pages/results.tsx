import { ArrowLeft, RotateCcw } from "lucide-react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import { ComparisonOverview } from "@/features/research-results/comparison-overview";
import { DecisionNotes } from "@/features/research-results/decision-notes";
import { EvidencePanel } from "@/features/research-results/evidence-panel";
import { HouseholdFit } from "@/features/research-results/household-fit";
import {
  createResearchResultsViewModel,
  type ResearchResultsViewModel,
} from "@/features/research-results/model";
import { SummaryPanel } from "@/features/research-results/summary-panel";
import { ScoreExplanation } from "@/features/research-results/score-explanation";
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

      <main className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <SummaryPanel {...model} />

        <ScoreExplanation score={model.score} />

        <ComparisonOverview
          route={model.route}
          comparison={model.comparison}
          priority={model.priority}
          climate={model.climate}
          housingContext={model.housingContext}
          reviewedAssumptions={reviewedAssumptions}
        />

        {model.household ? <HouseholdFit household={model.household} /> : null}

        <DecisionNotes {...model} />

        {hasWhatIf ? (
          <WhatIfPanel evaluation={whatIfEvaluation} />
        ) : (
          <section
            aria-labelledby="what-if-unavailable-heading"
            className="border-t border-slate-300 py-12 sm:py-16"
          >
            <p className="eyebrow">Test the result</p>
            <h2
              id="what-if-unavailable-heading"
              className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
            >
              Change an assumption and rerun
            </h2>
            {onEditAssumptions ? (
              <button
                type="button"
                onClick={onEditAssumptions}
                className="mt-6 inline-flex min-h-11 items-center gap-2 border-b-2 border-teal-800 py-2 text-sm font-semibold text-teal-900 hover:border-teal-500"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Edit my numbers
              </button>
            ) : null}
          </section>
        )}

        <EvidencePanel
          evidence={model.evidence}
          climateEvidence={model.climateEvidence}
        />

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
