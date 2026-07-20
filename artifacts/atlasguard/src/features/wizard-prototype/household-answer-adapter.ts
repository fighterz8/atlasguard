import {
  MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
  MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE,
  MOVEWISE_HOUSEHOLD_PLAN_QUESTION_VERSION,
  createMoveWiseHouseholdAnswers,
} from "@workspace/contracts";
import type {
  MoveWiseHouseholdAnswerPayload,
  VerifiedMoveWiseHouseholdAnswers,
} from "@workspace/contracts";

import {
  validateWizardStep,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

export type WizardHouseholdAnswerAdapterResult =
  | { success: true; answers: VerifiedMoveWiseHouseholdAnswers }
  | { success: false; errors: WizardErrors };

type HouseholdFactorAnswer = MoveWiseHouseholdAnswerPayload["factors"][number];

const unresolvedAnswer = (
  factorId: HouseholdFactorAnswer["factorId"],
  stopsMove: "yes" | "no",
): HouseholdFactorAnswer => ({
  factorId,
  importance: stopsMove === "yes" ? "essential" : "important",
  impact: "unavailable",
  essentialStatus: stopsMove === "yes" ? "unconfirmed" : null,
});

const conditionalAnswer = (
  factorId: HouseholdFactorAnswer["factorId"],
  needed: "yes" | "no",
  stopsMove: "yes" | "no" | "",
): HouseholdFactorAnswer =>
  needed === "no"
    ? {
        factorId,
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      }
    : unresolvedAnswer(factorId, stopsMove as "yes" | "no");

export function adaptWizardDraftToHouseholdAnswers(
  draft: WizardPrototypeDraft,
): WizardHouseholdAnswerAdapterResult {
  const errors = validateWizardStep("household", draft);
  if (Object.keys(errors).length > 0 || draft.householdMode === "") {
    return { success: false, errors };
  }

  const { householdPlan } = draft;
  const answersByFactor: Record<
    HouseholdFactorAnswer["factorId"],
    HouseholdFactorAnswer
  > = {
    space_fit: unresolvedAnswer(
      "space_fit",
      householdPlan.housing.stopsMove as "yes" | "no",
    ),
    support_network: conditionalAnswer(
      "support_network",
      householdPlan.supportNetwork.needed as "yes" | "no",
      householdPlan.supportNetwork.stopsMove,
    ),
    childcare_continuity: conditionalAnswer(
      "childcare_continuity",
      householdPlan.childcare.needed as "yes" | "no",
      householdPlan.childcare.stopsMove,
    ),
    school_continuity: conditionalAnswer(
      "school_continuity",
      householdPlan.school.needed as "yes" | "no",
      householdPlan.school.stopsMove,
    ),
    required_services_continuity: conditionalAnswer(
      "required_services_continuity",
      householdPlan.requiredServices.needed as "yes" | "no",
      householdPlan.requiredServices.stopsMove,
    ),
    car_free_access: conditionalAnswer(
      "car_free_access",
      householdPlan.carFreeAccess.needed as "yes" | "no",
      householdPlan.carFreeAccess.stopsMove,
    ),
  };
  const factors = MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE[
    draft.householdMode
  ].map((factorId) => answersByFactor[factorId]);

  return {
    success: true,
    answers: createMoveWiseHouseholdAnswers({
      schemaVersion: MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
      questionVersion: MOVEWISE_HOUSEHOLD_PLAN_QUESTION_VERSION,
      mode: draft.householdMode,
      factors,
    }),
  };
}
