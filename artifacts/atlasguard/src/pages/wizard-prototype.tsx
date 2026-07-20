import { useState } from "react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import { createResearchResultsViewModel } from "@/features/research-results/model";
import type {
  WizardErrors,
  WizardPrototypeDraft,
} from "@/features/wizard-prototype/model";
import { submitWizardDraft } from "@/features/wizard-prototype/submit-wizard-draft";
import { WizardPrototype } from "@/features/wizard-prototype/wizard-prototype";
import { clonePlainData } from "../lib/clone-plain-data";
import { ResearchResultsExperience } from "@/pages/results";

export default function WizardPrototypePage() {
  const [evaluatedDraft, setEvaluatedDraft] =
    useState<WizardPrototypeDraft | null>(null);
  const [resultModel, setResultModel] = useState<ReturnType<
    typeof createResearchResultsViewModel
  > | null>(null);
  const [evaluation, setEvaluation] =
    useState<VerifiedResearchEvaluationResult | null>(null);

  const evaluate = (draft: WizardPrototypeDraft): WizardErrors => {
    try {
      const result = submitWizardDraft(draft);
      if (!result.success) return result.errors;

      // Preserve blank targets as editable MoveWise defaults when the user
      // returns from Results; materialized values belong only to evaluation.
      setEvaluatedDraft(clonePlainData(draft));
      setEvaluation(result.evaluation);
      setResultModel(
        createResearchResultsViewModel(result.evaluation, {
          analysis: result.deterministicAnalysis,
          householdAnswers: result.householdAnswers,
          destinationAssumptions: result.destinationAssumptions,
        }),
      );
      window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
      return {};
    } catch {
      return {
        scenario:
          "MoveWise could not verify this result. Your assumptions remain in this browser so you can review and try again.",
      };
    }
  };

  if (resultModel && evaluatedDraft && evaluation) {
    return (
      <ResearchResultsExperience
        model={resultModel}
        reviewedAssumptions
        onEditAssumptions={() => {
          setResultModel(null);
          window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
        }}
        onReset={() => {
          setEvaluatedDraft(null);
          setEvaluation(null);
          setResultModel(null);
          window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
        }}
      />
    );
  }

  return (
    <WizardPrototype
      initialDraft={evaluatedDraft ?? undefined}
      onEvaluate={evaluate}
    />
  );
}
