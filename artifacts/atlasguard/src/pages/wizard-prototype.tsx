import { useState } from "react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import { createResearchResultsViewModel } from "@/features/research-results/model";
import { evaluateWizardDraft } from "@/features/wizard-prototype/evaluate-wizard-draft";
import type {
  WizardErrors,
  WizardPrototypeDraft,
} from "@/features/wizard-prototype/model";
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
      const result = evaluateWizardDraft(draft);
      if (!result.success) return result.errors;

      setEvaluatedDraft(clonePlainData(draft));
      setEvaluation(result.evaluation);
      setResultModel(
        createResearchResultsViewModel(result.evaluation, {
          analysis: result.deterministicAnalysis,
          householdAnswers: result.householdAnswers,
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
