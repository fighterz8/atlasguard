import { useState } from "react";

import { createResearchResultsViewModel } from "@/features/research-results/model";
import { evaluateWizardDraft } from "@/features/wizard-prototype/evaluate-wizard-draft";
import type {
  WizardErrors,
  WizardPrototypeDraft,
} from "@/features/wizard-prototype/model";
import { WizardPrototype } from "@/features/wizard-prototype/wizard-prototype";
import { ResearchResultsExperience } from "@/pages/results";

export default function WizardPrototypePage() {
  const [evaluatedDraft, setEvaluatedDraft] =
    useState<WizardPrototypeDraft | null>(null);
  const [resultModel, setResultModel] = useState<ReturnType<
    typeof createResearchResultsViewModel
  > | null>(null);

  const evaluate = (draft: WizardPrototypeDraft): WizardErrors => {
    try {
      const result = evaluateWizardDraft(draft);
      if (!result.success) return result.errors;

      setEvaluatedDraft(structuredClone(draft));
      setResultModel(createResearchResultsViewModel(result.evaluation));
      window.requestAnimationFrame(() => window.scrollTo({ top: 0 }));
      return {};
    } catch {
      return {
        scenario:
          "MoveWise could not verify this result. Your assumptions remain in this browser so you can review and try again.",
      };
    }
  };

  if (resultModel && evaluatedDraft) {
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
