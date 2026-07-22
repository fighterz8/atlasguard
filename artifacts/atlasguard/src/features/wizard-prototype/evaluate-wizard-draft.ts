import { getResearchMetroBenchmark } from "@workspace/benchmark-data";
import type {
  VerifiedMoveWiseHouseholdAnswers,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";
import {
  evaluateMoveWiseDeterministicModel,
  evaluateResearchMoveDecision,
} from "@workspace/decision-core";
import type { MoveWiseDeterministicAnalysis } from "@workspace/decision-core";

import { adaptWizardDraftToHouseholdAnswers } from "./household-answer-adapter";
import {
  getDestinationFinanceOverrideStatus,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";
import { adaptWizardDraftToScenarioInput } from "./scenario-adapter";

export type WizardEvaluationResult =
  | {
      success: true;
      evaluation: VerifiedResearchEvaluationResult;
      householdAnswers: VerifiedMoveWiseHouseholdAnswers;
      deterministicAnalysis: MoveWiseDeterministicAnalysis;
    }
  | { success: false; errors: WizardErrors };

export function evaluateWizardDraft(
  draft: WizardPrototypeDraft,
): WizardEvaluationResult {
  if (getDestinationFinanceOverrideStatus(draft.finances) !== "complete") {
    return {
      success: false,
      errors: {
        scenario:
          "Complete destination financial estimates are required for a deterministic result.",
      },
    };
  }
  const adapted = adaptWizardDraftToScenarioInput(draft);
  if (!adapted.success) return adapted;
  const household = adaptWizardDraftToHouseholdAnswers(draft);
  if (!household.success) return household;
  const climatePriority = adapted.scenario.priorities.find(
    ({ priorityId }) => priorityId === "climate_heat",
  );
  if (
    climatePriority === undefined ||
    (climatePriority.preferredDirection !== "lower" &&
      climatePriority.preferredDirection !== "higher")
  ) {
    return {
      success: false,
      errors: { scenario: "Choose a supported hot-day preference." },
    };
  }
  const benchmark = getResearchMetroBenchmark(
    adapted.scenario.originMetroSlug,
    adapted.scenario.destinationMetroSlug,
    climatePriority.preferredDirection,
  );
  if (benchmark === null) {
    return {
      success: false,
      errors: {
        scenario: "Choose two different locations from the supported cohort.",
      },
    };
  }

  const evaluation = evaluateResearchMoveDecision(adapted.scenario, benchmark);
  return {
    success: true,
    evaluation,
    householdAnswers: household.answers,
    deterministicAnalysis: evaluateMoveWiseDeterministicModel(
      evaluation,
      household.answers,
    ),
  };
}
