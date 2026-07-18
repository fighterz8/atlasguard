import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

import { StatusBadge } from "../ux-system/status-badge";

import {
  createInitialWizardDraft,
  getNextStep,
  getPreviousStep,
  type AssumptionBasis,
  type PriorityImportance,
  type SupportedPlaceSlug,
  type WizardErrors,
  type WizardPrototypeDraft,
  type WizardStepId,
} from "./model";
import { MoneyStep, type BasisKey, type ValueKey } from "./money-step";
import { MoveStep } from "./move-step";
import { PrioritiesStep } from "./priorities-step";
import { PrototypeShell } from "./prototype-shell";
import { ReviewStep } from "./review-step";
import { StepProgress } from "./step-progress";

const exampleDraft: WizardPrototypeDraft = {
  originSlug: "los-angeles-ca",
  destinationSlug: "seattle-wa",
  finances: {
    currentTakeHome: "5000",
    targetTakeHome: "5000",
    currentHousing: "2000",
    targetHousing: "2000",
    currentExpenses: "1500",
    targetExpenses: "1500",
    retainedPropertyNet: "0",
    targetTakeHomeBasis: "user_estimate",
    targetHousingBasis: "user_estimate",
    targetExpensesBasis: "user_estimate",
    retainedPropertyNetBasis: "user_estimate",
  },
  commuteImportance: "important",
};

const errorFieldId = (path: string) =>
  path.startsWith("finances.") ? path.replace("finances.", "") : path;

export function WizardPrototype() {
  const [step, setStep] = useState<WizardStepId>("move");
  const [draft, setDraft] = useState<WizardPrototypeDraft>(() =>
    createInitialWizardDraft(),
  );
  const [errors, setErrors] = useState<WizardErrors>({});
  const [reviewComplete, setReviewComplete] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const focusStepHeading = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("wizard-step-heading")?.focus();
    });
  };

  const focusErrors = (nextErrors: WizardErrors) => {
    window.requestAnimationFrame(() => {
      const firstKey = Object.keys(nextErrors)[0];
      const firstField = firstKey
        ? document.getElementById(errorFieldId(firstKey))
        : null;
      (firstField ?? errorSummaryRef.current)?.focus();
    });
  };

  const continueForward = () => {
    const result = getNextStep(step, draft);
    setErrors(result.errors);

    if (Object.keys(result.errors).length > 0) {
      focusErrors(result.errors);
      return;
    }

    if (step === "review") {
      setReviewComplete(true);
      return;
    }

    setStep(result.step);
    setReviewComplete(false);
    focusStepHeading();
  };

  const goBack = () => {
    setStep(getPreviousStep(step));
    setErrors({});
    setReviewComplete(false);
    focusStepHeading();
  };

  const reset = () => {
    setDraft(createInitialWizardDraft());
    setStep("move");
    setErrors({});
    setReviewComplete(false);
    focusStepHeading();
  };

  const loadExample = () => {
    setDraft(structuredClone(exampleDraft));
    setErrors({});
    setReviewComplete(false);
  };

  const updateMove = (
    key: "originSlug" | "destinationSlug",
    value: SupportedPlaceSlug | "",
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  const updateFinanceValue = (key: ValueKey, value: string) => {
    setDraft((current) => ({
      ...current,
      finances: { ...current.finances, [key]: value },
    }));
    clearError(`finances.${key}`);
  };

  const updateBasis = (key: BasisKey, value: AssumptionBasis) => {
    setDraft((current) => ({
      ...current,
      finances: { ...current.finances, [key]: value },
    }));
  };

  const updatePriority = (value: PriorityImportance) => {
    setDraft((current) => ({ ...current, commuteImportance: value }));
  };

  const errorEntries = Object.entries(errors);

  return (
    <PrototypeShell>
      <main
        id="wizard-content"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Pre-commitment move validator
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Compare one move using explicit household assumptions and visible
              evidence boundaries.
            </p>
          </div>
          <button
            type="button"
            onClick={loadExample}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-teal-600 hover:text-teal-900"
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Fill research example
          </button>
        </div>

        <div className="mt-7">
          <StepProgress currentStep={step} />
        </div>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="panel min-w-0" aria-label="Wizard step">
            {errorEntries.length > 0 ? (
              <div
                ref={errorSummaryRef}
                tabIndex={-1}
                role="alert"
                className="mb-6 rounded-xl border border-risk/25 bg-risk-surface p-4 text-risk"
              >
                <p className="font-semibold">
                  Correct these fields to continue:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {errorEntries.map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {step === "move" ? (
              <MoveStep draft={draft} errors={errors} onChange={updateMove} />
            ) : null}
            {step === "money" ? (
              <MoneyStep
                finances={draft.finances}
                errors={errors}
                onValueChange={updateFinanceValue}
                onBasisChange={updateBasis}
              />
            ) : null}
            {step === "priorities" ? (
              <PrioritiesStep
                value={draft.commuteImportance}
                onChange={updatePriority}
              />
            ) : null}
            {step === "review" ? <ReviewStep draft={draft} /> : null}

            {reviewComplete ? (
              <div
                role="status"
                className="mt-7 rounded-xl border border-favorable/25 bg-favorable-surface p-4 text-favorable"
              >
                <p className="font-semibold">Assumption review complete.</p>
                <p className="mt-1 text-sm leading-6">
                  The prototype stops here by design. You can inspect the fixed
                  research result without submitting these values.
                </p>
                <a
                  href={`${import.meta.env.BASE_URL}research/la-to-seattle`}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-favorable px-4 py-2 text-sm font-semibold text-white"
                >
                  View fixed sample result
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </div>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step !== "move" ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-teal-600 hover:text-teal-900"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                  Reset
                </button>
              </div>
              <button
                type="button"
                onClick={continueForward}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-800 bg-teal-800 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-900"
              >
                {step === "review" ? "Finish review" : "Continue"}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </section>

          <aside
            aria-label="Prototype boundaries"
            className="space-y-4 lg:sticky lg:top-6"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-950">
                Trust boundaries
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <li>• No account or persistence.</li>
                <li>• No live API or data-source request.</li>
                <li>• No AI-selected facts or recommendation.</li>
                <li>• Manual entry remains fully supported.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-estimate/25 bg-estimate-surface p-5 text-estimate">
              <StatusBadge tone="estimate">Source-aware by design</StatusBadge>
              <p className="mt-3 text-sm leading-6">
                Future imported aggregates remain visibly separate from
                confirmed values and can always be corrected before evaluation.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </PrototypeShell>
  );
}
