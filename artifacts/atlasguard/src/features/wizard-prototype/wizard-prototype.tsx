import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON } from "@workspace/benchmark-data";
import type { MoveWiseHouseholdMode } from "@workspace/contracts";
import { clonePlainData } from "../../lib/clone-plain-data";

import { HouseholdStep } from "./household-step";
import {
  createInitialWizardDraft,
  getPlace,
  getNextStep,
  getPreviousStep,
  wizardSteps,
  type AssumptionBasis,
  type ClimateHeatPreference,
  type HouseholdPlanDraft,
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
import { StepProgress } from "./step-progress";

const exampleDraft: WizardPrototypeDraft = {
  originSlug: LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON.origin.slug,
  destinationSlug: LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON.destination.slug,
  householdMode: "family",
  finances: {
    currentHousingTenure: "rent",
    currentTakeHome: "5000",
    targetTakeHome: "",
    currentHousing: "2000",
    targetHousing: "",
    targetGrossIncomeKnown: false,
    targetGrossIncome: "",
    currentExpenses: "1500",
    targetExpenses: "",
    retainedPropertyNet: "0",
    targetTakeHomeRangeMin: "",
    targetTakeHomeRangeMax: "",
    targetHousingRangeMin: "",
    targetHousingRangeMax: "",
    targetGrossIncomeRangeMin: "",
    targetGrossIncomeRangeMax: "",
    targetExpensesRangeMin: "",
    targetExpensesRangeMax: "",
    retainedPropertyNetRangeMin: "",
    retainedPropertyNetRangeMax: "",
    targetTakeHomeBasis: "user_estimate",
    targetHousingBasis: "user_estimate",
    targetGrossIncomeBasis: "user_estimate",
    targetExpensesBasis: "user_estimate",
    retainedPropertyNetBasis: "confirmed",
  },
  commuteImportance: "important",
  climateHeatPreference: "fewer_hot_days",
  climateHeatImportance: "important",
  householdPlan: {
    version: "1.0.0",
    housing: {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "2",
      bathrooms: "1",
      maxMonthlyCost: "2000",
      stopsMove: "no",
      assessment: "positive",
    },
    childcare: {
      needed: "no",
      arrangement: "",
      stopsMove: "",
      assessment: "unavailable",
    },
    school: {
      needed: "no",
      gradeBand: "",
      preference: "",
      requirements: "",
      stopsMove: "",
      assessment: "unavailable",
    },
    supportNetwork: {
      needed: "yes",
      stopsMove: "no",
      assessment: "positive",
    },
    requiredServices: {
      needed: "no",
      stopsMove: "",
      assessment: "unavailable",
    },
    carFreeAccess: {
      needed: "no",
      stopsMove: "",
      assessment: "unavailable",
    },
  },
};

const errorFieldId = (path: string) =>
  path.startsWith("finances.")
    ? path.replace("finances.", "")
    : path.startsWith("householdPlan.")
      ? path.split(".").join("-")
      : path;

type RangeKey =
  | "targetTakeHomeRangeMin"
  | "targetTakeHomeRangeMax"
  | "targetHousingRangeMin"
  | "targetHousingRangeMax"
  | "targetGrossIncomeRangeMin"
  | "targetGrossIncomeRangeMax"
  | "targetExpensesRangeMin"
  | "targetExpensesRangeMax"
  | "retainedPropertyNetRangeMin"
  | "retainedPropertyNetRangeMax";

const rangeKeysByBasis: Record<
  BasisKey,
  { value: ValueKey; min: RangeKey; max: RangeKey }
> = {
  targetTakeHomeBasis: {
    value: "targetTakeHome",
    min: "targetTakeHomeRangeMin",
    max: "targetTakeHomeRangeMax",
  },
  targetHousingBasis: {
    value: "targetHousing",
    min: "targetHousingRangeMin",
    max: "targetHousingRangeMax",
  },
  targetGrossIncomeBasis: {
    value: "targetGrossIncome",
    min: "targetGrossIncomeRangeMin",
    max: "targetGrossIncomeRangeMax",
  },
  targetExpensesBasis: {
    value: "targetExpenses",
    min: "targetExpensesRangeMin",
    max: "targetExpensesRangeMax",
  },
  retainedPropertyNetBasis: {
    value: "retainedPropertyNet",
    min: "retainedPropertyNetRangeMin",
    max: "retainedPropertyNetRangeMax",
  },
};

type WizardPrototypeProps = {
  initialDraft?: WizardPrototypeDraft;
  onEvaluate?: (draft: WizardPrototypeDraft) => WizardErrors;
};

export function WizardPrototype({
  initialDraft,
  onEvaluate,
}: WizardPrototypeProps) {
  const [step, setStep] = useState<WizardStepId>(
    initialDraft ? "money" : "move",
  );
  const [draft, setDraft] = useState<WizardPrototypeDraft>(() =>
    initialDraft ? clonePlainData(initialDraft) : createInitialWizardDraft(),
  );
  const [errors, setErrors] = useState<WizardErrors>({});
  const [reviewComplete, setReviewComplete] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const evaluationTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (evaluationTimerRef.current !== null) {
        window.clearTimeout(evaluationTimerRef.current);
      }
    },
    [],
  );

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

    if (step === "household") {
      if (onEvaluate) {
        setIsEvaluating(true);
        evaluationTimerRef.current = window.setTimeout(() => {
          const evaluationErrors = onEvaluate(clonePlainData(draft));
          evaluationTimerRef.current = null;
          setIsEvaluating(false);
          setErrors(evaluationErrors);
          if (Object.keys(evaluationErrors).length > 0) {
            focusErrors(evaluationErrors);
          }
        }, 650);
        return;
      }
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
    setDraft(clonePlainData(exampleDraft));
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

  const updateHouseholdMode = (value: MoveWiseHouseholdMode) => {
    setDraft((current) => ({ ...current, householdMode: value }));
    clearError("householdMode");
  };

  const updateFinanceValue = (key: ValueKey, value: string) => {
    setDraft((current) => ({
      ...current,
      finances: { ...current.finances, [key]: value },
    }));
    clearError(`finances.${key}`);
  };

  const updateGrossKnown = (value: boolean) => {
    setDraft((current) => ({
      ...current,
      finances: {
        ...current.finances,
        targetGrossIncomeKnown: value,
        ...(value
          ? {}
          : {
              targetGrossIncome: "",
              targetGrossIncomeRangeMin: "",
              targetGrossIncomeRangeMax: "",
            }),
      },
    }));
    if (!value) clearError("finances.targetGrossIncome");
  };

  const updateCurrentHousingTenure = (value: "rent" | "own") => {
    setDraft((current) => ({
      ...current,
      finances: { ...current.finances, currentHousingTenure: value },
    }));
    clearError("finances.currentHousingTenure");
  };

  const updateBasis = (key: BasisKey, value: AssumptionBasis) => {
    const rangeKeys = rangeKeysByBasis[key];
    setDraft((current) => ({
      ...current,
      finances: {
        ...current.finances,
        ...(current.finances[rangeKeys.value].trim() === "" &&
        rangeKeys.value !== "targetGrossIncome" &&
        rangeKeys.value !== "retainedPropertyNet"
          ? {
              [rangeKeys.value]:
                rangeKeys.value === "targetTakeHome"
                  ? current.finances.currentTakeHome
                  : rangeKeys.value === "targetHousing"
                    ? current.finances.currentHousing
                    : current.finances.currentExpenses,
            }
          : {}),
        [key]: value,
        ...(value === "confirmed"
          ? { [rangeKeys.min]: "", [rangeKeys.max]: "" }
          : {}),
      },
    }));
    if (value === "confirmed") {
      setErrors((current) => {
        const next = { ...current };
        delete next[`finances.${rangeKeys.value}`];
        delete next[`finances.${rangeKeys.min}`];
        delete next[`finances.${rangeKeys.max}`];
        return next;
      });
    }
  };

  const updatePriority = (value: PriorityImportance) => {
    setDraft((current) => ({ ...current, commuteImportance: value }));
  };

  const updateClimatePreference = (value: ClimateHeatPreference) => {
    setDraft((current) => ({ ...current, climateHeatPreference: value }));
  };

  const updateClimateImportance = (
    value: Exclude<PriorityImportance, "does_not_matter">,
  ) => {
    setDraft((current) => ({ ...current, climateHeatImportance: value }));
  };

  const updateHouseholdPlan = (householdPlan: HouseholdPlanDraft) => {
    setDraft((current) => ({ ...current, householdPlan }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => !key.startsWith("householdPlan."),
        ),
      ),
    );
  };

  const errorEntries = Object.entries(errors);
  const origin = getPlace(draft.originSlug);
  const destination = getPlace(draft.destinationSlug);

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
              Answer four focused questions, then see the financial tradeoff and
              what could change it.
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
          <section
            className="panel relative min-w-0 overflow-hidden"
            aria-label="Wizard step"
            aria-busy={isEvaluating || undefined}
          >
            {isEvaluating ? (
              <div
                role="status"
                className="flex min-h-[30rem] flex-col items-center justify-center px-4 py-12 text-center"
              >
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-800">
                  <span className="absolute inset-0 animate-ping rounded-full bg-teal-100 opacity-60 motion-reduce:animate-none" />
                  <LoaderCircle
                    aria-hidden="true"
                    className="relative h-7 w-7 animate-spin motion-reduce:animate-none"
                  />
                </span>
                <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Building your move picture
                </h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Comparing your monthly position and applying the priorities
                  you chose.
                </p>
                <div aria-hidden="true" className="mt-6 flex gap-2">
                  {[0, 1, 2].map((item) => (
                    <span
                      key={item}
                      className="h-2 w-12 animate-pulse rounded-full bg-teal-200 motion-reduce:animate-none"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
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

                <div
                  key={step}
                  className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
                >
                  {step === "move" ? (
                    <MoveStep
                      draft={draft}
                      errors={errors}
                      onChange={updateMove}
                      onModeChange={updateHouseholdMode}
                    />
                  ) : null}
                  {step === "money" ? (
                    <MoneyStep
                      finances={draft.finances}
                      originSlug={draft.originSlug}
                      destinationSlug={draft.destinationSlug}
                      errors={errors}
                      onValueChange={updateFinanceValue}
                      onBasisChange={updateBasis}
                      onGrossKnownChange={updateGrossKnown}
                      onCurrentHousingTenureChange={updateCurrentHousingTenure}
                    />
                  ) : null}
                  {step === "priorities" ? (
                    <PrioritiesStep
                      commuteImportance={draft.commuteImportance}
                      climateHeatPreference={draft.climateHeatPreference}
                      climateHeatImportance={draft.climateHeatImportance}
                      onCommuteChange={updatePriority}
                      onClimatePreferenceChange={updateClimatePreference}
                      onClimateImportanceChange={updateClimateImportance}
                    />
                  ) : null}
                  {step === "household" ? (
      <HouseholdStep
        mode={draft.householdMode}
        originSlug={draft.originSlug}
        destinationSlug={draft.destinationSlug}
        plan={draft.householdPlan}
                      errors={errors}
                      onPlanChange={updateHouseholdPlan}
                    />
                  ) : null}
                </div>

                {reviewComplete ? (
                  <div
                    role="status"
                    className="mt-7 rounded-xl border border-favorable/25 bg-favorable-surface p-4 text-favorable"
                  >
                    <p className="font-semibold">Your comparison is ready.</p>
                    <p className="mt-1 text-sm leading-6">
                      The prototype stops here by design. You can inspect the
                      fixed research result without submitting these values.
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
                    {step === "household" ? "See my result" : "Continue"}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </section>

          <aside
            aria-label="Your comparison"
            className="space-y-4 lg:sticky lg:top-6"
          >
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Your comparison
              </p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                {origin ? `${origin.city}, ${origin.state}` : "Choose a start"}
                <ArrowRight
                  aria-hidden="true"
                  className="mx-2 inline h-4 w-4 text-teal-700"
                />
                {destination
                  ? `${destination.city}, ${destination.state}`
                  : "choose a destination"}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your answers stay editable. Use Back anytime—there is no
                separate review chore at the end.
              </p>
            </div>
            <div className="rounded-xl bg-slate-950 p-5 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-300">
                Step {wizardSteps.findIndex((item) => item.id === step) + 1} of
                {wizardSteps.length}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {wizardSteps.find((item) => item.id === step)?.label}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                MoveWise uses only the information needed for the comparison
                shown next.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </PrototypeShell>
  );
}
