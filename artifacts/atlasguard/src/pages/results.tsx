import { ArrowLeft, ChevronDown, RotateCcw } from "lucide-react";
import React from "react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import { ComparisonOverview } from "../features/research-results/comparison-overview";
import { EvidencePanel } from "../features/research-results/evidence-panel";
import { HouseholdFit } from "../features/research-results/household-fit";
import {
  createResearchResultsViewModel,
  type ResearchResultsViewModel,
} from "../features/research-results/model";
import { SummaryPanel } from "../features/research-results/summary-panel";
import { NumbersUsed } from "../features/research-results/numbers-used";
import { ScoreExplanation } from "../features/research-results/score-explanation";
import { WhatIfPanel } from "../features/research-results/what-if-panel";
import { DestructiveActionDialog } from "../components/destructive-action-dialog";
import { BudgetEditSummaryPanel } from "../features/wizard-prototype/budget-edit-feedback";
import type { BudgetEditSummary } from "../features/wizard-prototype/budget-edit-session";
import { BriefExportPanel } from "../features/wizard-prototype/brief-export-panel";
import type { MoveWiseDecisionGateModule } from "../features/wizard-prototype/decision-gate-model";
import { ScenarioLab } from "../features/wizard-prototype/scenario-lab";
import type { WizardPrototypeDraft } from "../features/wizard-prototype/model";
import { VerificationPlan } from "../features/wizard-prototype/verification-plan";
import type {
  MoveWiseVerificationResolutionInput,
  MoveWiseVerificationTask,
} from "../features/wizard-prototype/verification-task-model";

type ResearchResultsExperienceProps = {
  model: ResearchResultsViewModel;
  reviewedAssumptions?: boolean;
  onEditAssumptions?: () => void;
  onEditModule?: (moduleId: MoveWiseDecisionGateModule) => void;
  onReset?: () => void;
  showWhatIf?: boolean;
  whatIfEvaluation?: VerifiedResearchEvaluationResult;
  localDraftStatus?:
    | Readonly<{ status: "idle" }>
    | Readonly<{ status: "saved" | "restored"; savedAt: string }>
    | Readonly<{ status: "error" }>;
  budgetChangeSummary?: BudgetEditSummary | null;
  scenarioBaselineDraft?: WizardPrototypeDraft;
  onMakeScenarioActive?: (
    draft: WizardPrototypeDraft,
    scenarioName: string,
  ) => void;
  scenarioActivationNotice?: string | null;
  verificationTasks?: readonly MoveWiseVerificationTask[];
  onUpdateVerificationTask?: (
    taskId: string,
    patch: Partial<
      Pick<
        MoveWiseVerificationTask,
        "status" | "owner" | "dueDate" | "note" | "evidenceUrl"
      >
    >,
  ) => Readonly<{ success: boolean; error?: string }>;
  onResolveVerificationTask?: (
    taskId: string,
    resolution: MoveWiseVerificationResolutionInput,
  ) => Readonly<{ success: boolean; error?: string }>;
};

export function ResearchResultsExperience({
  model,
  reviewedAssumptions = false,
  onEditAssumptions,
  onEditModule,
  onReset,
  showWhatIf = false,
  whatIfEvaluation,
  localDraftStatus,
  budgetChangeSummary,
  scenarioBaselineDraft,
  onMakeScenarioActive,
  scenarioActivationNotice,
  verificationTasks,
  onUpdateVerificationTask,
  onResolveVerificationTask,
}: ResearchResultsExperienceProps) {
  const hasWhatIf = showWhatIf || whatIfEvaluation !== undefined;
  const hasScenarioLab =
    scenarioBaselineDraft !== undefined && onMakeScenarioActive !== undefined;

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById("decision-heading")
        ?.focus({ preventScroll: true });
      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo({ top: 0, behavior: "auto" });
      root.style.scrollBehavior = previousScrollBehavior;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
                Edit Budget
              </button>
            ) : null}
            {onReset ? (
              <DestructiveActionDialog
                title="Start over with a blank relocation brief?"
                description="This clears the saved brief from this device and removes every answer from the current comparison."
                actionLabel="Start over"
                onConfirm={onReset}
                trigger={
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 px-2 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
                  >
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    Start over
                  </button>
                }
              />
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        {localDraftStatus ? (
          <div
            role="status"
            className="mt-5 flex flex-col gap-1 border-l-2 border-teal-700 pl-3 text-xs leading-5 text-slate-600 sm:flex-row sm:items-baseline sm:gap-2"
          >
            <span className="font-semibold text-slate-900">
              {localDraftStatus.status === "restored"
                ? "Restored from this device."
                : localDraftStatus.status === "saved"
                  ? "Saved on this device."
                  : localDraftStatus.status === "error"
                    ? "This brief could not be saved on this device."
                    : "This brief has not been saved yet."}
            </span>
            <span>
              Stored only in this browser; MoveWise does not upload it.
            </span>
          </div>
        ) : null}
        {budgetChangeSummary ? (
          <div className="mt-5">
            <BudgetEditSummaryPanel summary={budgetChangeSummary} />
          </div>
        ) : null}
        {scenarioActivationNotice ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 border-l-2 border-teal-700 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950"
          >
            <strong>{scenarioActivationNotice}</strong> is now the active brief.
            The previous baseline was replaced only after confirmation.
          </div>
        ) : null}
        <SummaryPanel {...model} onEditModule={onEditModule} />

        <NumbersUsed
          route={model.route}
          comparison={model.comparison}
          onEdit={onEditAssumptions}
        />

        {verificationTasks &&
        onUpdateVerificationTask &&
        onResolveVerificationTask ? (
          <VerificationPlan
            tasks={verificationTasks}
            onUpdateTask={onUpdateVerificationTask}
            onResolveTask={onResolveVerificationTask}
            onEditModule={onEditModule}
          />
        ) : null}

        {verificationTasks ? (
          <BriefExportPanel model={model} tasks={verificationTasks} />
        ) : null}

        <details className="group border-t border-slate-300 py-1">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-base font-semibold text-slate-900">
            <span>Explore the full comparison</span>
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-slate-200">
            <ComparisonOverview
              route={model.route}
              comparison={model.comparison}
              priority={model.priority}
              climate={model.climate}
              climateRiskContext={model.climateRiskContext}
              incomeLaborContext={model.incomeLaborContext}
              ownershipContext={model.ownershipContext}
              familyCostContext={model.familyCostContext}
              housingContext={model.housingContext}
              reviewedAssumptions={reviewedAssumptions}
            />
            {model.household ? (
              <HouseholdFit household={model.household} />
            ) : null}
          </div>
        </details>

        <details className="group border-t border-slate-300 py-1">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-base font-semibold text-slate-900">
            <span>
              {hasScenarioLab ? "Scenario lab" : "Test another scenario"}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-slate-200">
            {hasScenarioLab ? (
              <ScenarioLab
                key={whatIfEvaluation?.decisionProfile.inputFingerprintSha256}
                baselineDraft={scenarioBaselineDraft}
                onMakeActive={onMakeScenarioActive}
              />
            ) : hasWhatIf ? (
              <WhatIfPanel evaluation={whatIfEvaluation} />
            ) : (
              <section
                aria-labelledby="what-if-unavailable-heading"
                className="py-10"
              >
                <h2
                  id="what-if-unavailable-heading"
                  className="text-lg font-semibold text-slate-950"
                >
                  Change an assumption and rerun
                </h2>
                {onEditAssumptions ? (
                  <button
                    type="button"
                    onClick={onEditAssumptions}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 border-b-2 border-teal-800 py-2 text-sm font-semibold text-teal-900 hover:border-teal-500"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Edit Budget
                  </button>
                ) : null}
              </section>
            )}
          </div>
        </details>

        <details className="group border-y border-slate-300 py-1">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-base font-semibold text-slate-900">
            <span>How this was estimated</span>
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-slate-200">
            <ScoreExplanation score={model.score} />
            <EvidencePanel
              evidence={model.evidence}
              climateEvidence={model.climateEvidence}
            />
          </div>
        </details>

        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500">
          <p>
            This brief uses the information entered and the comparison data
            currently available.
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
