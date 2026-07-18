import { loadLosAngelesToSeattleCommuteBenchmark } from "@workspace/benchmark-data";
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

  return {
    success: true,
    evaluation: evaluateResearchMoveDecision(
      adapted.scenario,
      loadLosAngelesToSeattleCommuteBenchmark(),
    ),
  };
}
