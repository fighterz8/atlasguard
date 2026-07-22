import { useCallback, useState } from "react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import { createResearchResultsViewModel } from "@/features/research-results/model";
import type { BudgetEditSummary } from "@/features/wizard-prototype/budget-edit-session";
import type { MoveWiseDecisionGateModule } from "@/features/wizard-prototype/decision-gate-model";
import type {
  WizardErrors,
  WizardPrototypeDraft,
} from "@/features/wizard-prototype/model";
import { submitWizardDraft } from "@/features/wizard-prototype/submit-wizard-draft";
import { WizardPrototype } from "@/features/wizard-prototype/wizard-prototype";
import { restoreMoveWiseSession } from "@/features/wizard-prototype/wizard-session-state";
import {
  createMoveWiseVerificationPlan,
  resolveMoveWiseVerificationTask,
  updateMoveWiseVerificationTask,
  type MoveWiseVerificationResolutionInput,
  type MoveWiseVerificationTask,
} from "@/features/wizard-prototype/verification-task-model";
import {
  clearMoveWiseDraft,
  saveMoveWiseDraft,
  type MoveWiseDraftStorage,
} from "@/features/wizard-prototype/wizard-draft-storage";
import { clonePlainData } from "../lib/clone-plain-data";
import { ResearchResultsExperience } from "@/pages/results";

const getBrowserStorage = (): MoveWiseDraftStorage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readInitialSession = () => {
  const storage = getBrowserStorage();
  return storage
    ? restoreMoveWiseSession(storage)
    : ({ status: "empty" } as const);
};

export default function WizardPrototypePage() {
  const [initialSession] = useState(readInitialSession);
  const [evaluatedDraft, setEvaluatedDraft] =
    useState<WizardPrototypeDraft | null>(() =>
      initialSession.status === "results" ? initialSession.draft : null,
    );
  const [resultModel, setResultModel] = useState<ReturnType<
    typeof createResearchResultsViewModel
  > | null>(() =>
    initialSession.status === "results" ? initialSession.resultModel : null,
  );
  const [evaluation, setEvaluation] =
    useState<VerifiedResearchEvaluationResult | null>(() =>
      initialSession.status === "results" ? initialSession.evaluation : null,
    );
  const [verificationTasks, setVerificationTasks] = useState<
    readonly MoveWiseVerificationTask[]
  >(() => {
    if (initialSession.status === "results") {
      return createMoveWiseVerificationPlan(
        initialSession.resultModel.brief.openChecks,
        initialSession.verificationTasks,
        new Date().toISOString(),
      );
    }
    return initialSession.status === "wizard"
      ? initialSession.verificationTasks
      : [];
  });
  const [budgetEditing, setBudgetEditing] = useState(false);
  const [directEditing, setDirectEditing] = useState<Exclude<
    MoveWiseDecisionGateModule,
    "budget"
  > | null>(null);
  const [budgetChangeSummary, setBudgetChangeSummary] =
    useState<BudgetEditSummary | null>(null);
  const [scenarioActivationNotice, setScenarioActivationNotice] = useState<
    string | null
  >(null);
  const [localDraftStatus, setLocalDraftStatus] = useState<
    | Readonly<{ status: "idle" }>
    | Readonly<{ status: "saved" | "restored"; savedAt: string }>
    | Readonly<{ status: "error" }>
  >(() =>
    initialSession.status === "wizard" || initialSession.status === "results"
      ? { status: "restored", savedAt: initialSession.savedAt }
      : initialSession.status === "invalid"
        ? { status: "error" }
        : { status: "idle" },
  );
  const [restoreNotice, setRestoreNotice] = useState<string | undefined>(() =>
    initialSession.status === "invalid"
      ? "MoveWise could not safely restore the saved brief. No answers were guessed; the unreadable entry remains on this device until you clear it."
      : undefined,
  );
  const [persistenceBlocked, setPersistenceBlocked] = useState(
    initialSession.status === "invalid",
  );

  const saveDraftState = useCallback(
    (
      draft: WizardPrototypeDraft,
      view: Parameters<typeof saveMoveWiseDraft>[1]["view"],
      tasks: readonly MoveWiseVerificationTask[] = verificationTasks,
    ) => {
      if (persistenceBlocked) {
        setLocalDraftStatus({ status: "error" });
        return;
      }
      const storage = getBrowserStorage();
      if (!storage) {
        setLocalDraftStatus({ status: "error" });
        return;
      }
      const savedAt = new Date().toISOString();
      const result = saveMoveWiseDraft(storage, {
        draft,
        verificationTasks: tasks,
        view,
        savedAt,
      });
      setLocalDraftStatus(
        result.success ? { status: "saved", savedAt } : { status: "error" },
      );
    },
    [persistenceBlocked, verificationTasks],
  );

  const clearSavedDraft = useCallback(() => {
    const storage = getBrowserStorage();
    if (storage && !clearMoveWiseDraft(storage).success) {
      setLocalDraftStatus({ status: "error" });
      return false;
    }
    setPersistenceBlocked(false);
    setRestoreNotice(undefined);
    setLocalDraftStatus({ status: "idle" });
    return true;
  }, []);

  const evaluate = (
    draft: WizardPrototypeDraft,
    taskBasis: readonly MoveWiseVerificationTask[] = verificationTasks,
  ): WizardErrors => {
    try {
      const result = submitWizardDraft(draft);
      if (!result.success) return result.errors;

      // Preserve blank targets as editable MoveWise defaults when the user
      // returns from Results; materialized values belong only to evaluation.
      setEvaluatedDraft(clonePlainData(draft));
      setEvaluation(result.evaluation);
      const nextResultModel = createResearchResultsViewModel(
        result.evaluation,
        {
          analysis: result.deterministicAnalysis,
          householdAnswers: result.householdAnswers,
          destinationAssumptions: result.destinationAssumptions,
        },
      );
      const nextTasks = createMoveWiseVerificationPlan(
        nextResultModel.brief.openChecks,
        taskBasis,
        new Date().toISOString(),
      );
      setResultModel(nextResultModel);
      setVerificationTasks(nextTasks);
      saveDraftState(clonePlainData(draft), "results", nextTasks);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
      return {};
    } catch {
      return {
        scenario:
          "MoveWise could not verify this result. Your assumptions remain in this browser so you can review and try again.",
      };
    }
  };

  if (
    resultModel &&
    evaluatedDraft &&
    evaluation &&
    !budgetEditing &&
    !directEditing
  ) {
    return (
      <ResearchResultsExperience
        model={resultModel}
        reviewedAssumptions
        localDraftStatus={localDraftStatus}
        budgetChangeSummary={budgetChangeSummary}
        scenarioBaselineDraft={evaluatedDraft}
        scenarioActivationNotice={scenarioActivationNotice}
        verificationTasks={verificationTasks}
        whatIfEvaluation={evaluation}
        onMakeScenarioActive={(draft, scenarioName) => {
          const saveErrors = evaluate(draft);
          if (Object.keys(saveErrors).length === 0) {
            setBudgetChangeSummary(null);
            setScenarioActivationNotice(scenarioName);
          }
        }}
        onEditAssumptions={() => {
          setBudgetChangeSummary(null);
          setScenarioActivationNotice(null);
          setBudgetEditing(true);
          window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
        }}
        onEditModule={(moduleId) => {
          setBudgetChangeSummary(null);
          setScenarioActivationNotice(null);
          if (moduleId === "budget") {
            setBudgetEditing(true);
          } else {
            setDirectEditing(moduleId);
          }
          window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
        }}
        onUpdateVerificationTask={(taskId, patch) => {
          const task = verificationTasks.find((item) => item.id === taskId);
          if (!task || !evaluatedDraft) {
            return { success: false, error: "This task is no longer active." };
          }
          const updated = updateMoveWiseVerificationTask(
            task,
            patch,
            new Date().toISOString(),
          );
          if (!updated.success) return updated;
          const nextTasks = verificationTasks.map((item) =>
            item.id === taskId ? updated.task : item,
          );
          setVerificationTasks(nextTasks);
          saveDraftState(evaluatedDraft, "results", nextTasks);
          return { success: true };
        }}
        onResolveVerificationTask={(
          taskId,
          resolution: MoveWiseVerificationResolutionInput,
        ) => {
          const task = verificationTasks.find((item) => item.id === taskId);
          if (!task || !evaluatedDraft) {
            return { success: false, error: "This task is no longer active." };
          }
          const resolved = resolveMoveWiseVerificationTask(
            task,
            evaluatedDraft,
            resolution,
            new Date().toISOString(),
          );
          if (!resolved.success) return resolved;
          const taskBasis = verificationTasks.map((item) =>
            item.id === taskId ? resolved.task : item,
          );
          const errors = evaluate(resolved.draft, taskBasis);
          if (Object.keys(errors).length > 0) {
            return {
              success: false,
              error:
                errors.scenario ??
                "The checked answer could not be applied to the move picture.",
            };
          }
          return { success: true };
        }}
        onReset={() => {
          if (!clearSavedDraft()) return;
          setEvaluatedDraft(null);
          setEvaluation(null);
          setResultModel(null);
          setVerificationTasks([]);
          setScenarioActivationNotice(null);
          window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
        }}
      />
    );
  }

  return (
    <WizardPrototype
      initialDraft={
        evaluatedDraft ??
        (initialSession.status === "wizard" ? initialSession.draft : undefined)
      }
      initialStep={
        evaluatedDraft
          ? "money"
          : initialSession.status === "wizard"
            ? initialSession.step
            : undefined
      }
      initialReviewModel={
        evaluatedDraft
          ? null
          : initialSession.status === "wizard"
            ? initialSession.reviewModel
            : null
      }
      initialBudgetEditOrigin={budgetEditing ? "results" : undefined}
      initialDirectEditModule={directEditing ?? undefined}
      onCancelBudgetEdit={
        budgetEditing
          ? () => {
              setBudgetEditing(false);
              window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
            }
          : undefined
      }
      onSaveBudgetEdit={
        budgetEditing
          ? (draft, summary) => {
              const saveErrors = evaluate(draft);
              if (Object.keys(saveErrors).length === 0) {
                setBudgetChangeSummary(summary);
                setBudgetEditing(false);
              }
              return saveErrors;
            }
          : undefined
      }
      onCancelDirectEdit={
        directEditing
          ? () => {
              setDirectEditing(null);
              window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
            }
          : undefined
      }
      onSaveDirectEdit={
        directEditing
          ? (draft) => {
              const saveErrors = evaluate(draft);
              if (Object.keys(saveErrors).length === 0) {
                setDirectEditing(null);
              }
              return saveErrors;
            }
          : undefined
      }
      onEvaluate={evaluate}
      onDraftStateChange={
        budgetEditing || directEditing ? undefined : saveDraftState
      }
      localDraftStatus={localDraftStatus}
      restoreNotice={restoreNotice}
      onClearSavedDraft={clearSavedDraft}
    />
  );
}
