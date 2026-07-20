import {
  MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
  MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE,
  MOVEWISE_HOUSEHOLD_QUESTION_VERSION,
  createMoveWiseHouseholdAnswers,
} from "@workspace/contracts";
import type {
  MoveWiseHouseholdAnswerPayload,
  VerifiedMoveWiseHouseholdAnswers,
} from "@workspace/contracts";

import {
  validateWizardStep,
  type HouseholdImpact,
  type HouseholdRole,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

export type WizardHouseholdAnswerAdapterResult =
  | { success: true; answers: VerifiedMoveWiseHouseholdAnswers }
  | { success: false; errors: WizardErrors };

const roleMapping: Record<
  Exclude<HouseholdRole, "not_applicable">,
  Pick<
    MoveWiseHouseholdAnswerPayload["factors"][number],
    "importance" | "essentialStatus"
  >
> = {
  important: { importance: "important", essentialStatus: null },
  essential_met: {
    importance: "essential",
    essentialStatus: "confirmed_met",
  },
  essential_unconfirmed: {
    importance: "essential",
    essentialStatus: "unconfirmed",
  },
  essential_unmet: {
    importance: "essential",
    essentialStatus: "confirmed_unmet",
  },
};

export function adaptWizardDraftToHouseholdAnswers(
  draft: WizardPrototypeDraft,
): WizardHouseholdAnswerAdapterResult {
  const errors = validateWizardStep("household", draft);
  if (Object.keys(errors).length > 0 || draft.householdMode === "") {
    return { success: false, errors };
  }

  const factors = MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE[
    draft.householdMode
  ].map((factorId) => {
    const answer = draft.householdFactors[factorId];
    if (answer.role === "not_applicable") {
      return {
        factorId,
        importance: "not_applicable" as const,
        impact: "excluded" as const,
        essentialStatus: null,
      };
    }

    const role =
      roleMapping[answer.role as Exclude<HouseholdRole, "not_applicable">];
    return {
      factorId,
      ...role,
      impact: answer.impact as HouseholdImpact,
    };
  });

  return {
    success: true,
    answers: createMoveWiseHouseholdAnswers({
      schemaVersion: MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
      questionVersion: MOVEWISE_HOUSEHOLD_QUESTION_VERSION,
      mode: draft.householdMode,
      factors,
    }),
  };
}
