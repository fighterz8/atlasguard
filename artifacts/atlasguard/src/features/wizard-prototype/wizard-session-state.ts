import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import {
  createResearchResultsViewModel,
  type ResearchResultsViewModel,
} from "../research-results/model";
import { clonePlainData } from "../../lib/clone-plain-data";

import type { WizardPrototypeDraft, WizardStepId } from "./model";
import { createMoveWiseReviewModel } from "./review-model";
import type { MoveWiseReviewModel } from "./review-model";
import { submitWizardDraft } from "./submit-wizard-draft";
import {
  loadMoveWiseDraft,
  type LoadMoveWiseDraftResult,
  type MoveWiseDraftStorage,
} from "./wizard-draft-storage";
import type { MoveWiseVerificationTask } from "./verification-task-model";

type InvalidStorageReason = Extract<
  LoadMoveWiseDraftResult,
  { status: "invalid" }
>["reason"];

export type RestoredMoveWiseSession =
  | Readonly<{ status: "empty" }>
  | Readonly<{
      status: "invalid";
      reason: InvalidStorageReason | "invalid_progress";
    }>
  | Readonly<{
      status: "wizard";
      draft: WizardPrototypeDraft;
      step: WizardStepId;
      reviewModel: MoveWiseReviewModel | null;
      verificationTasks: readonly MoveWiseVerificationTask[];
      savedAt: string;
    }>
  | Readonly<{
      status: "results";
      draft: WizardPrototypeDraft;
      evaluation: VerifiedResearchEvaluationResult;
      resultModel: ResearchResultsViewModel;
      verificationTasks: readonly MoveWiseVerificationTask[];
      savedAt: string;
    }>;

export function restoreMoveWiseSession(
  storage: MoveWiseDraftStorage,
): RestoredMoveWiseSession {
  const loaded = loadMoveWiseDraft(storage);
  if (loaded.status !== "restored") return loaded;

  const { draft, savedAt, view, verificationTasks } = loaded.envelope;
  if (view === "results") {
    const result = submitWizardDraft(draft);
    if (!result.success) {
      return { status: "invalid", reason: "invalid_progress" };
    }
    return {
      status: "results",
      draft: clonePlainData(draft),
      savedAt,
      evaluation: result.evaluation,
      resultModel: createResearchResultsViewModel(result.evaluation, {
        analysis: result.deterministicAnalysis,
        householdAnswers: result.householdAnswers,
        destinationAssumptions: result.destinationAssumptions,
      }),
      verificationTasks,
    };
  }

  if (view === "review") {
    const review = createMoveWiseReviewModel(draft);
    if (!review.success) {
      return { status: "invalid", reason: "invalid_progress" };
    }
    return {
      status: "wizard",
      draft: clonePlainData(draft),
      step: view,
      reviewModel: review.model,
      verificationTasks,
      savedAt,
    };
  }

  return {
    status: "wizard",
    draft: clonePlainData(draft),
    step: view,
    reviewModel: null,
    verificationTasks,
    savedAt,
  };
}
