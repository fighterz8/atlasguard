import {
  MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
  MOVEWISE_HOUSEHOLD_EVIDENCE_PLAN_QUESTION_VERSION,
  MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE,
  createMoveWiseHouseholdAnswers,
} from "@workspace/contracts";
import type {
  MoveWiseHouseholdAnswerPayload,
  VerifiedMoveWiseHouseholdAnswers,
} from "@workspace/contracts";

import {
  validateWizardStep,
  type ConditionalHouseholdNeed,
  type HouseholdFitAssessment,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

export type WizardHouseholdAnswerAdapterResult =
  | { success: true; answers: VerifiedMoveWiseHouseholdAnswers }
  | { success: false; errors: WizardErrors };

type HouseholdFactorAnswer = MoveWiseHouseholdAnswerPayload["factors"][number];

const excludedAnswer = (
  factorId: HouseholdFactorAnswer["factorId"],
): HouseholdFactorAnswer => ({
  factorId,
  importance: "not_applicable",
  impact: "excluded",
  essentialStatus: null,
});

const essentialStatusFromAssessment = (
  assessment: HouseholdFitAssessment,
): NonNullable<HouseholdFactorAnswer["essentialStatus"]> => {
  switch (assessment) {
    case "strong_positive":
    case "positive":
      return "confirmed_met";
    case "strong_negative":
    case "negative":
      return "confirmed_unmet";
    case "neutral":
    case "unavailable":
      return "unconfirmed";
  }
};

const answerFromConditionalNeed = (
  factorId: HouseholdFactorAnswer["factorId"],
  need: ConditionalHouseholdNeed,
): HouseholdFactorAnswer => {
  if (need.needed !== "yes") return excludedAnswer(factorId);

  const isEssential = need.stopsMove === "yes";
  return {
    factorId,
    importance: isEssential ? "essential" : "important",
    impact: need.assessment,
    essentialStatus: isEssential
      ? essentialStatusFromAssessment(need.assessment)
      : null,
  };
};

const parseWholeDollars = (value: string): number | null => {
  const normalized = value.trim().replace(/,/g, "");
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
};

export function adaptWizardDraftToHouseholdAnswers(
  draft: WizardPrototypeDraft,
): WizardHouseholdAnswerAdapterResult {
  const errors = validateWizardStep("household", draft);
  if (Object.keys(errors).length > 0 || draft.householdMode === "") {
    return { success: false, errors };
  }

  const { householdPlan } = draft;
  const destinationRent = parseWholeDollars(draft.finances.targetHousing);
  const maximumRent = parseWholeDollars(householdPlan.housing.maxMonthlyCost);
  if (destinationRent === null || maximumRent === null) {
    return {
      success: false,
      errors: {
        scenario:
          "MoveWise needs a destination rent estimate and rent ceiling to evaluate the rental plan.",
      },
    };
  }
  const rentIsEssential = householdPlan.housing.stopsMove === "yes";
  const answersByFactor: Record<
    HouseholdFactorAnswer["factorId"],
    HouseholdFactorAnswer
  > = {
    space_fit: {
      factorId: "space_fit",
      importance: rentIsEssential ? "essential" : "important",
      impact: "unavailable",
      essentialStatus: rentIsEssential
        ? destinationRent <= maximumRent
          ? "confirmed_met"
          : "confirmed_unmet"
        : null,
    },
    support_network: excludedAnswer("support_network"),
    childcare_continuity: excludedAnswer("childcare_continuity"),
    school_continuity: excludedAnswer("school_continuity"),
    required_services_continuity: excludedAnswer(
      "required_services_continuity",
    ),
    car_free_access: excludedAnswer("car_free_access"),
  };
  answersByFactor.support_network = answerFromConditionalNeed(
    "support_network",
    householdPlan.supportNetwork,
  );
  answersByFactor.childcare_continuity = answerFromConditionalNeed(
    "childcare_continuity",
    householdPlan.childcare,
  );
  answersByFactor.school_continuity = answerFromConditionalNeed(
    "school_continuity",
    householdPlan.school,
  );
  answersByFactor.required_services_continuity = answerFromConditionalNeed(
    "required_services_continuity",
    householdPlan.requiredServices,
  );
  answersByFactor.car_free_access = answerFromConditionalNeed(
    "car_free_access",
    householdPlan.carFreeAccess,
  );
  const factors = MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE[
    draft.householdMode
  ].map((factorId) => answersByFactor[factorId]);

  return {
    success: true,
    answers: createMoveWiseHouseholdAnswers({
      schemaVersion: MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
      questionVersion: MOVEWISE_HOUSEHOLD_EVIDENCE_PLAN_QUESTION_VERSION,
      mode: draft.householdMode,
      factors,
    }),
  };
}
