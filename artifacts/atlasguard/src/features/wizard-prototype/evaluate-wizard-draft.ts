import { getResearchMetroBenchmark } from "@workspace/benchmark-data";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";
import { evaluateResearchMoveDecision } from "@workspace/decision-core";

import type { WizardErrors, WizardPrototypeDraft } from "./model";
import { adaptWizardDraftToScenarioInput } from "./scenario-adapter";

export type WizardEvaluationResult =
  | { success: true; evaluation: VerifiedResearchEvaluationResult }
  | { success: false; errors: WizardErrors };

export function evaluateWizardDraft(
  draft: WizardPrototypeDraft,
): WizardEvaluationResult {
  const adapted = adaptWizardDraftToScenarioInput(draft);
  if (!adapted.success) return adapted;
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

  return {
    success: true,
    evaluation: evaluateResearchMoveDecision(adapted.scenario, benchmark),
  };
}
