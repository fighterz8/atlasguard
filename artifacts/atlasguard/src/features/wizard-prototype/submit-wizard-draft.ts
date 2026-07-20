import { createDestinationPlanningDraft } from "./destination-planning-assumptions";
import type { DestinationPlanningAssumptions } from "./destination-planning-assumptions";
import { evaluateWizardDraft } from "./evaluate-wizard-draft";
import {
  validateWizardDraft,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

type SuccessfulEvaluation = Extract<
  ReturnType<typeof evaluateWizardDraft>,
  { success: true }
>;

type DeterministicSubmission = SuccessfulEvaluation &
  Readonly<{
    kind: "deterministic";
    evaluatedDraft: WizardPrototypeDraft;
    destinationAssumptions: DestinationPlanningAssumptions;
  }>;

export type WizardSubmissionResult =
  | DeterministicSubmission
  | Readonly<{ success: false; errors: WizardErrors }>;

export function submitWizardDraft(
  draft: WizardPrototypeDraft,
): WizardSubmissionResult {
  const errors = validateWizardDraft(draft);
  if (Object.keys(errors).length > 0) return { success: false, errors };

  const { evaluatedDraft, assumptions } = createDestinationPlanningDraft(draft);
  const evaluated = evaluateWizardDraft(evaluatedDraft);
  return evaluated.success
    ? {
        ...evaluated,
        kind: "deterministic",
        evaluatedDraft,
        destinationAssumptions: assumptions,
      }
    : evaluated;
}
