import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDotDashed,
  Home,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMachine } from "@xstate/react";
import { LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON } from "@workspace/benchmark-data";
import type { MoveWiseHouseholdMode } from "@workspace/contracts";
import { clonePlainData } from "../../lib/clone-plain-data";
import { DestructiveActionDialog } from "../../components/destructive-action-dialog";

import { createBudgetEquationModel } from "./budget-equation-model";
import {
  BudgetEditBanner,
  BudgetEditSummaryPanel,
} from "./budget-edit-feedback";
import {
  createBudgetEditSession,
  createBudgetEditSummary,
  type BudgetEditOrigin,
  type BudgetEditSummary,
} from "./budget-edit-session";
import { createFirstHomeModel } from "./first-home-model";
import { FirstHomeStep } from "./first-home-step";
import { HouseholdStep } from "./household-step";
import {
  enableExpenseWorksheet,
  getExpenseWorksheetTotal,
  type ExpenseCategoryId,
} from "./expense-worksheet";
import {
  createInitialWizardDraft,
  getPlace,
  getNextStep,
  isHardRentCeiling,
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
import { isLikelySoftKeyboardOpen } from "./mobile-viewport-state";
import { MoveStep } from "./move-step";
import { PrioritiesStep } from "./priorities-step";
import { PrototypeShell } from "./prototype-shell";
import { createMoveWiseReviewModel } from "./review-model";
import type { MoveWiseReviewModel } from "./review-model";
import { ReviewStep } from "./review-step";
import type { MoveWiseDecisionGateModule } from "./decision-gate-model";
import { StepProgress } from "./step-progress";
import {
  createWizardFlowMachine,
  getWizardFlowStep,
  isWizardFlowBusy,
  isWizardFlowComplete,
  type WizardFlowStateValue,
} from "./wizard-flow-machine";

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
    expenseWorksheet: {
      enabled: false,
      values: {
        utilities: "",
        transport: "",
        food: "",
        childcare: "",
        debt: "",
        insurance: "",
        subscriptions: "",
        other: "",
      },
    },
    targetExpenses: "",
    retainedPropertyNet: "",
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
    retainedPropertyNetBasis: "user_estimate",
  },
  commuteImportance: "important",
  climateHeatPreference: "fewer_hot_days",
  climateHeatImportance: "important",
  householdPlan: {
    version: "2.0.0",
    housing: {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "2",
      bathrooms: "1",
      maxMonthlyCost: "2000",
      ceilingType: "target",
      stopsMove: "no",
      assessment: "positive",
    },
    childcare: {
      relevance: "no",
      importance: "",
      status: "",
      arrangement: "",
    },
    school: {
      relevance: "no",
      importance: "",
      status: "",
      gradeBand: "",
      preference: "",
      requirements: "",
    },
    supportNetwork: {
      relevance: "yes",
      importance: "important",
      status: "works",
    },
    requiredServices: {
      relevance: "no",
      importance: "",
      status: "",
    },
    carFreeAccess: {
      relevance: "no",
      importance: "",
      status: "",
    },
  },
};

const errorFieldId = (path: string) =>
  path.startsWith("finances.")
    ? path.replace("finances.", "")
    : path.startsWith("householdPlan.")
      ? path.split(".").join("-")
      : path;

const wholeDollar = (value: string) => {
  const amount = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(amount) && Number.isInteger(amount) ? amount : null;
};

const formatMonthly = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export const createMovePictureModel = (
  draft: WizardPrototypeDraft,
  flowValue: WizardFlowStateValue,
  reviewModel: MoveWiseReviewModel | null,
) => {
  const origin = getPlace(draft.originSlug);
  const destination = getPlace(draft.destinationSlug);
  const currentTakeHome = wholeDollar(draft.finances.currentTakeHome);
  const currentHousing = wholeDollar(draft.finances.currentHousing);
  const currentExpenses = wholeDollar(draft.finances.currentExpenses);
  const currentCushion =
    currentTakeHome !== null &&
    currentHousing !== null &&
    currentExpenses !== null
      ? currentTakeHome - currentHousing - currentExpenses
      : null;
  const plannedDestinationValues = [
    draft.finances.targetTakeHome,
    draft.finances.targetHousing,
    draft.finances.targetExpenses,
  ].filter((value) => value.trim() !== "").length;
  const mustCheckCount =
    [
      draft.householdPlan.supportNetwork,
      draft.householdPlan.childcare,
      draft.householdPlan.school,
      draft.householdPlan.requiredServices,
      draft.householdPlan.carFreeAccess,
    ].filter(
      ({ relevance, importance }) =>
        relevance === "yes" && importance === "blocker",
    ).length + (isHardRentCeiling(draft.householdPlan.housing) ? 1 : 0);
  const rentCeiling = wholeDollar(draft.householdPlan.housing.maxMonthlyCost);
  const flowLabel =
    flowValue === "evaluating"
      ? "Building brief"
      : flowValue === "comparisonReady"
        ? "Brief ready"
        : flowValue === "review"
          ? "Ready to check"
          : "Collecting facts";

  return {
    route:
      origin && destination
        ? `${origin.city} to ${destination.city}`
        : "Choose both cities",
    flowLabel,
    currentCushion:
      currentCushion === null
        ? "Waiting on money inputs"
        : formatMonthly(currentCushion),
    rentCeiling:
      draft.householdPlan.housing.maxMonthlyCost.trim() === ""
        ? "Not set yet"
        : rentCeiling === null
          ? "Needs a whole dollar"
          : `${formatMonthly(rentCeiling)}/mo`,
    destinationAssumptions: reviewModel
      ? "Ready for review"
      : `${plannedDestinationValues}/3 money assumptions`,
    familyChecks:
      mustCheckCount === 0
        ? "No hard stops marked"
        : `${mustCheckCount} hard-stop check${mustCheckCount === 1 ? "" : "s"}`,
  };
};

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
  initialStep?: WizardStepId;
  initialReviewModel?: MoveWiseReviewModel | null;
  onEvaluate?: (draft: WizardPrototypeDraft) => WizardErrors;
  onDraftStateChange?: (
    draft: WizardPrototypeDraft,
    step: WizardStepId,
  ) => void;
  localDraftStatus?:
    | Readonly<{ status: "idle" }>
    | Readonly<{ status: "saved" | "restored"; savedAt: string }>
    | Readonly<{ status: "error" }>;
  restoreNotice?: string;
  onClearSavedDraft?: () => boolean;
  initialBudgetEditOrigin?: BudgetEditOrigin;
  onCancelBudgetEdit?: () => void;
  onSaveBudgetEdit?: (
    draft: WizardPrototypeDraft,
    summary: BudgetEditSummary,
  ) => WizardErrors;
  initialDirectEditModule?: Exclude<MoveWiseDecisionGateModule, "budget">;
  onCancelDirectEdit?: () => void;
  onSaveDirectEdit?: (draft: WizardPrototypeDraft) => WizardErrors;
};

export function WizardPrototype({
  initialDraft,
  initialStep,
  initialReviewModel = null,
  onEvaluate,
  onDraftStateChange,
  localDraftStatus = { status: "idle" },
  restoreNotice,
  onClearSavedDraft,
  initialBudgetEditOrigin,
  onCancelBudgetEdit,
  onSaveBudgetEdit,
  initialDirectEditModule,
  onCancelDirectEdit,
  onSaveDirectEdit,
}: WizardPrototypeProps) {
  const startingStep =
    initialDirectEditModule === "first_home"
      ? "firstHome"
      : initialDirectEditModule === "household"
        ? "household"
        : (initialStep ?? (initialDraft ? "money" : "move"));
  const flowMachine = useMemo(
    () => createWizardFlowMachine(startingStep, initialReviewModel),
    [initialReviewModel, startingStep],
  );
  const [flowSnapshot, sendFlow] = useMachine(flowMachine);
  const flowValue = flowSnapshot.value as WizardFlowStateValue;
  const step = getWizardFlowStep(flowValue);
  const errors = flowSnapshot.context.errors;
  const reviewModel = flowSnapshot.context.reviewModel;
  const reviewComplete = isWizardFlowComplete(flowValue);
  const isEvaluating = isWizardFlowBusy(flowValue);
  const [draft, setDraft] = useState<WizardPrototypeDraft>(() =>
    initialDraft ? clonePlainData(initialDraft) : createInitialWizardDraft(),
  );
  const [budgetEdit, setBudgetEdit] = useState(() =>
    initialBudgetEditOrigin && initialDraft
      ? createBudgetEditSession(initialBudgetEditOrigin, initialDraft)
      : null,
  );
  const [budgetChangeSummary, setBudgetChangeSummary] =
    useState<BudgetEditSummary | null>(null);
  const [directEdit, setDirectEdit] = useState<{
    moduleId: Exclude<MoveWiseDecisionGateModule, "budget">;
    origin: "review" | "results";
    baselineDraft: WizardPrototypeDraft;
  } | null>(() =>
    initialDirectEditModule && initialDraft
      ? {
          moduleId: initialDirectEditModule,
          origin: "results",
          baselineDraft: clonePlainData(initialDraft),
        }
      : null,
  );
  const [softKeyboardOpen, setSoftKeyboardOpen] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const evaluationTimerRef = useRef<number | null>(null);
  const lastReportedStateRef = useRef(
    `${startingStep}:${JSON.stringify(initialDraft ?? createInitialWizardDraft())}`,
  );
  const skipNextDraftReportRef = useRef(false);

  useEffect(
    () => () => {
      if (evaluationTimerRef.current !== null) {
        window.clearTimeout(evaluationTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (step !== "money" || !visualViewport) {
      setSoftKeyboardOpen(false);
      return;
    }

    const updateKeyboardState = () => {
      setSoftKeyboardOpen(
        isLikelySoftKeyboardOpen(window.innerHeight, visualViewport.height),
      );
    };
    updateKeyboardState();
    visualViewport.addEventListener("resize", updateKeyboardState);
    visualViewport.addEventListener("scroll", updateKeyboardState);
    return () => {
      visualViewport.removeEventListener("resize", updateKeyboardState);
      visualViewport.removeEventListener("scroll", updateKeyboardState);
    };
  }, [step]);

  useEffect(() => {
    if (budgetEdit !== null || directEdit !== null) return;
    const signature = `${step}:${JSON.stringify(draft)}`;
    if (signature === lastReportedStateRef.current) return;
    lastReportedStateRef.current = signature;
    if (skipNextDraftReportRef.current) {
      skipNextDraftReportRef.current = false;
      return;
    }
    onDraftStateChange?.(clonePlainData(draft), step);
  }, [budgetEdit, directEdit, draft, onDraftStateChange, step]);

  const clearError = (key: string) => {
    sendFlow({ type: "CLEAR_ERROR", key });
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

    if (Object.keys(result.errors).length > 0) {
      sendFlow({ type: "VALIDATION_FAILED", errors: result.errors });
      focusErrors(result.errors);
      return;
    }

    if (step === "household") {
      const review = createMoveWiseReviewModel(clonePlainData(draft));
      if (!review.success) {
        sendFlow({ type: "VALIDATION_FAILED", errors: review.errors });
        focusErrors(review.errors);
        return;
      }
      sendFlow({ type: "CONTINUE_TO_REVIEW", reviewModel: review.model });
      focusStepHeading();
      return;
    }

    if (step === "review") {
      if (onEvaluate) {
        sendFlow({ type: "START_EVALUATION" });
        evaluationTimerRef.current = window.setTimeout(() => {
          const evaluationErrors = onEvaluate(clonePlainData(draft));
          evaluationTimerRef.current = null;
          if (Object.keys(evaluationErrors).length > 0) {
            sendFlow({
              type: "EVALUATION_FAILED",
              errors: evaluationErrors,
            });
            focusErrors(evaluationErrors);
          } else {
            sendFlow({ type: "EVALUATION_COMPLETE" });
          }
        }, 650);
        return;
      }
      sendFlow({ type: "EVALUATION_COMPLETE" });
      return;
    }

    if (result.step === "money") sendFlow({ type: "CONTINUE_TO_MONEY" });
    if (result.step === "firstHome")
      sendFlow({ type: "CONTINUE_TO_FIRST_HOME" });
    if (result.step === "priorities")
      sendFlow({ type: "CONTINUE_TO_PRIORITIES" });
    if (result.step === "household")
      sendFlow({ type: "CONTINUE_TO_HOUSEHOLD" });
    focusStepHeading();
  };

  const goBack = () => {
    sendFlow({ type: "BACK" });
    focusStepHeading();
  };

  const beginReviewBudgetEdit = () => {
    const session = createBudgetEditSession("review", draft);
    setBudgetChangeSummary(null);
    setBudgetEdit(session);
    setDraft(session.workingDraft);
    sendFlow({ type: "EDIT_ASSUMPTIONS" });
    focusStepHeading();
  };

  const beginReviewModuleEdit = (moduleId: MoveWiseDecisionGateModule) => {
    if (moduleId === "budget") {
      beginReviewBudgetEdit();
      return;
    }
    setBudgetChangeSummary(null);
    setDirectEdit({
      moduleId,
      origin: "review",
      baselineDraft: clonePlainData(draft),
    });
    sendFlow({
      type: moduleId === "first_home" ? "EDIT_FIRST_HOME" : "EDIT_HOUSEHOLD",
    });
    focusStepHeading();
  };

  const cancelDirectEdit = () => {
    if (!directEdit) return;
    if (directEdit.origin === "results") {
      onCancelDirectEdit?.();
      return;
    }
    if (!reviewModel) return;
    setDraft(clonePlainData(directEdit.baselineDraft));
    setDirectEdit(null);
    sendFlow({ type: "RETURN_TO_REVIEW", reviewModel });
    focusStepHeading();
  };

  const saveDirectEdit = () => {
    if (!directEdit) return;
    const validation = getNextStep(step, draft);
    if (Object.keys(validation.errors).length > 0) {
      sendFlow({ type: "VALIDATION_FAILED", errors: validation.errors });
      focusErrors(validation.errors);
      return;
    }
    if (directEdit.origin === "results") {
      const saveErrors = onSaveDirectEdit?.(clonePlainData(draft)) ?? {
        scenario: "MoveWise could not return to Results from this edit.",
      };
      if (Object.keys(saveErrors).length > 0) {
        sendFlow({ type: "VALIDATION_FAILED", errors: saveErrors });
        focusErrors(saveErrors);
      }
      return;
    }
    const rebuiltReview = createMoveWiseReviewModel(clonePlainData(draft));
    if (!rebuiltReview.success) {
      sendFlow({ type: "VALIDATION_FAILED", errors: rebuiltReview.errors });
      focusErrors(rebuiltReview.errors);
      return;
    }
    setDirectEdit(null);
    sendFlow({ type: "RETURN_TO_REVIEW", reviewModel: rebuiltReview.model });
    focusStepHeading();
  };

  const cancelBudgetEdit = () => {
    if (!budgetEdit) return;
    if (budgetEdit.origin === "results") {
      onCancelBudgetEdit?.();
      return;
    }
    if (!reviewModel) return;
    setDraft(clonePlainData(budgetEdit.baselineDraft));
    setBudgetEdit(null);
    setBudgetChangeSummary(null);
    sendFlow({ type: "RETURN_TO_REVIEW", reviewModel });
    focusStepHeading();
  };

  const saveBudgetEdit = () => {
    if (!budgetEdit) return;
    const next = getNextStep("money", draft);
    if (Object.keys(next.errors).length > 0) {
      sendFlow({ type: "VALIDATION_FAILED", errors: next.errors });
      focusErrors(next.errors);
      return;
    }
    const summary = createBudgetEditSummary(budgetEdit.baselineDraft, draft);
    if (!summary.hasChanges) return;

    if (budgetEdit.origin === "results") {
      const saveErrors = onSaveBudgetEdit?.(clonePlainData(draft), summary) ?? {
        scenario: "MoveWise could not return to Results from this edit.",
      };
      if (Object.keys(saveErrors).length > 0) {
        sendFlow({ type: "VALIDATION_FAILED", errors: saveErrors });
        focusErrors(saveErrors);
      }
      return;
    }

    const rebuiltReview = createMoveWiseReviewModel(clonePlainData(draft));
    if (!rebuiltReview.success) {
      sendFlow({ type: "VALIDATION_FAILED", errors: rebuiltReview.errors });
      focusErrors(rebuiltReview.errors);
      return;
    }
    setBudgetChangeSummary(summary);
    setBudgetEdit(null);
    sendFlow({
      type: "RETURN_TO_REVIEW",
      reviewModel: rebuiltReview.model,
    });
    focusStepHeading();
  };

  const reset = () => {
    setDraft(createInitialWizardDraft());
    sendFlow({ type: "RESET" });
    focusStepHeading();
  };

  const clearSavedDraft = () => {
    if (!onClearSavedDraft?.()) return;
    skipNextDraftReportRef.current = true;
    reset();
  };

  const loadExample = () => {
    setDraft(clonePlainData(exampleDraft));
    sendFlow({ type: "RESET" });
    focusStepHeading();
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

  const setExpenseWorksheetEnabled = (enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      finances: {
        ...current.finances,
        expenseWorksheet: enabled
          ? enableExpenseWorksheet(current.finances.currentExpenses)
          : { ...current.finances.expenseWorksheet, enabled: false },
      },
    }));
  };

  const updateExpenseCategory = (key: ExpenseCategoryId, value: string) => {
    setDraft((current) => {
      const expenseWorksheet = {
        ...current.finances.expenseWorksheet,
        values: { ...current.finances.expenseWorksheet.values, [key]: value },
      };
      const total = getExpenseWorksheetTotal(expenseWorksheet);
      return {
        ...current,
        finances: {
          ...current.finances,
          expenseWorksheet,
          currentExpenses:
            total === null ? current.finances.currentExpenses : String(total),
        },
      };
    });
    clearError(`finances.expenseWorksheet.${key}`);
    clearError("finances.currentExpenses");
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
      finances: {
        ...current.finances,
        currentHousingTenure: value,
        ...(value === "rent"
          ? {
              retainedPropertyNet: "",
              retainedPropertyNetRangeMin: "",
              retainedPropertyNetRangeMax: "",
              retainedPropertyNetBasis: "user_estimate" as const,
            }
          : {}),
      },
    }));
    clearError("finances.currentHousingTenure");
    if (value === "rent") clearError("finances.retainedPropertyNet");
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
      clearError(`finances.${rangeKeys.value}`);
      clearError(`finances.${rangeKeys.min}`);
      clearError(`finances.${rangeKeys.max}`);
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
    sendFlow({ type: "DRAFT_CHANGED" });
  };

  const errorEntries = Object.entries(errors);
  const movePicture = createMovePictureModel(draft, flowValue, reviewModel);
  const firstHomeRentEstimate =
    createFirstHomeModel(draft).estimate?.monthlyDollars ?? null;
  const budgetEquation = createBudgetEquationModel(
    draft.finances,
    draft.originSlug,
    draft.destinationSlug,
    firstHomeRentEstimate,
  );
  const workingBudgetSummary = budgetEdit
    ? createBudgetEditSummary(budgetEdit.baselineDraft, draft)
    : null;

  return (
    <PrototypeShell>
      <main
        id="wizard-content"
        className={`mx-auto max-w-6xl px-4 sm:px-6 sm:py-8 lg:px-8 ${step === "move" ? "py-8" : "py-4"}`}
      >
        <div
          className={`${step === "move" ? "flex" : "hidden sm:flex"} flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Relocation brief
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add your move, budget, and family needs. MoveWise will show what
              improves, what gets harder, and what still needs checking.
            </p>
          </div>
          {budgetEdit ? (
            <p className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900">
              Working copy · not saved
            </p>
          ) : (
            <DestructiveActionDialog
              title="Replace this draft with the example move?"
              description="This replaces every answer in the current relocation brief with the Los Angeles to Seattle example. You can cancel and keep your draft unchanged."
              actionLabel="Replace draft"
              onConfirm={loadExample}
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-teal-600 hover:text-teal-900"
                >
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Use example move
                </button>
              }
            />
          )}
        </div>

        <div className={step === "move" ? "mt-7" : "mt-4 sm:mt-7"}>
          <StepProgress currentStep={step} />
        </div>

        <div className="mt-4 grid items-start gap-6 sm:mt-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section
            className="panel relative min-w-0"
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
                  Building your relocation brief
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
                    <>
                      {budgetEdit ? (
                        <BudgetEditBanner origin={budgetEdit.origin} />
                      ) : null}
                      <MoneyStep
                        finances={draft.finances}
                        originSlug={draft.originSlug}
                        destinationSlug={draft.destinationSlug}
                        firstHomeRentEstimate={firstHomeRentEstimate}
                        errors={errors}
                        onValueChange={updateFinanceValue}
                        onBasisChange={updateBasis}
                        onGrossKnownChange={updateGrossKnown}
                        onCurrentHousingTenureChange={
                          updateCurrentHousingTenure
                        }
                        onExpenseWorksheetEnabledChange={
                          setExpenseWorksheetEnabled
                        }
                        onExpenseCategoryChange={updateExpenseCategory}
                      />
                    </>
                  ) : null}
                  {step === "firstHome" ? (
                    <FirstHomeStep
                      originSlug={draft.originSlug}
                      destinationSlug={draft.destinationSlug}
                      housing={draft.householdPlan.housing}
                      errors={errors}
                      onHousingChange={(housing) =>
                        updateHouseholdPlan({
                          ...draft.householdPlan,
                          housing,
                        })
                      }
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
                      plan={draft.householdPlan}
                      errors={errors}
                      onPlanChange={updateHouseholdPlan}
                    />
                  ) : null}
                  {step === "review" && reviewModel ? (
                    <>
                      {budgetChangeSummary ? (
                        <BudgetEditSummaryPanel summary={budgetChangeSummary} />
                      ) : null}
                      <ReviewStep
                        model={reviewModel}
                        onEditAssumptions={beginReviewBudgetEdit}
                        onEditModule={beginReviewModuleEdit}
                      />
                    </>
                  ) : null}
                </div>

                {reviewComplete ? (
                  <div
                    role="status"
                    className="mt-7 rounded-xl border border-favorable/25 bg-favorable-surface p-4 text-favorable"
                  >
                    <p className="font-semibold">
                      Your relocation brief is ready.
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      Review the judgment, the tradeoffs, and the checks that
                      could change your decision.
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

                <div
                  data-mobile-budget-actions={step === "money" || undefined}
                  data-keyboard-open={
                    step === "money" ? softKeyboardOpen : undefined
                  }
                  className={`mt-8 border-t border-slate-200 pt-5 ${
                    step === "money"
                      ? `wizard-mobile-action-dock z-20 -mx-5 bg-white/95 px-5 shadow-[0_-10px_30px_-22px_rgba(15,23,42,0.8)] backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:shadow-none sm:backdrop-blur-none ${softKeyboardOpen ? "max-sm:static" : "max-sm:sticky max-sm:bottom-0"}`
                      : ""
                  }`}
                >
                  {step === "money" ? (
                    <div
                      data-budget-compact-summary
                      className="mb-3 flex items-center justify-between gap-3 sm:hidden"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.11em] text-slate-500">
                          Monthly room
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-950 tabular-nums">
                          {budgetEquation.consequence.compact}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
                        {budgetEquation.consequence.openCount > 0
                          ? `${budgetEquation.consequence.openCount} open`
                          : "Complete"}
                      </span>
                    </div>
                  ) : null}
                  {budgetEdit ? (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={cancelBudgetEdit}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600 hover:text-teal-950"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveBudgetEdit}
                        disabled={!workingBudgetSummary?.hasChanges}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-800 bg-teal-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:px-5"
                      >
                        Save Budget
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  ) : directEdit ? (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={cancelDirectEdit}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-teal-600 hover:text-teal-950"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveDirectEdit}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-800 bg-teal-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-900 sm:px-5"
                      >
                        Save{" "}
                        {directEdit.moduleId === "first_home"
                          ? "First home"
                          : "Household"}
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 gap-2">
                        {step !== "move" ? (
                          <button
                            type="button"
                            onClick={goBack}
                            aria-label="Back"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-teal-600 hover:text-teal-900 min-[360px]:px-3 sm:px-4"
                          >
                            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                            <span className="sr-only min-[360px]:not-sr-only">
                              Back
                            </span>
                          </button>
                        ) : null}
                        <DestructiveActionDialog
                          title="Reset this relocation brief?"
                          description="This removes every answer from the current brief and replaces the locally saved draft with a blank one."
                          actionLabel="Reset brief"
                          onConfirm={reset}
                          trigger={
                            <button
                              type="button"
                              aria-label="Reset relocation brief"
                              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 sm:px-3"
                            >
                              <RotateCcw
                                aria-hidden="true"
                                className="h-4 w-4"
                              />
                              <span className="sr-only sm:not-sr-only">
                                Reset
                              </span>
                            </button>
                          }
                        />
                      </div>
                      <button
                        type="button"
                        onClick={continueForward}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-800 bg-teal-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-900 sm:px-5"
                      >
                        {step === "review"
                          ? "Build my relocation brief"
                          : "Continue"}
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <aside
            aria-label="Brief in progress"
            className="space-y-3 lg:sticky lg:top-6"
          >
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CircleDotDashed
                  aria-hidden="true"
                  className="h-4 w-4 text-teal-700"
                />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Brief in progress
                </p>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                {movePicture.route}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {movePicture.flowLabel}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <WalletCards aria-hidden="true" className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">
                    Monthly cushion
                  </p>
                </div>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {movePicture.currentCushion}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Home aria-hidden="true" className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">
                    Rent ceiling
                  </p>
                </div>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {movePicture.rentCeiling}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <UsersRound aria-hidden="true" className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">
                    Family checks
                  </p>
                </div>
                <p className="mt-2 text-base font-semibold text-slate-950">
                  {movePicture.familyChecks}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  Saved privately
                </p>
              </div>
              <p
                role="status"
                className="mt-2 text-sm font-semibold text-slate-950"
              >
                {localDraftStatus.status === "restored"
                  ? "Restored from this device"
                  : localDraftStatus.status === "saved"
                    ? "Saved on this device"
                    : localDraftStatus.status === "error"
                      ? "Could not save on this device"
                      : "Saves after your first change"}
              </p>
              {localDraftStatus.status === "saved" ||
              localDraftStatus.status === "restored" ? (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Last saved{" "}
                  {new Date(localDraftStatus.savedAt).toLocaleString()}
                </p>
              ) : null}
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Your brief stays in this browser. MoveWise does not upload it or
                connect it to an account.
              </p>
              {restoreNotice ? (
                <p className="mt-2 text-xs font-semibold leading-5 text-risk">
                  {restoreNotice}
                </p>
              ) : null}
              {onClearSavedDraft ? (
                <DestructiveActionDialog
                  title="Clear this brief from this device?"
                  description="This removes the locally saved brief and resets the open form. Other browser data is not affected."
                  actionLabel="Clear from device"
                  onConfirm={clearSavedDraft}
                  trigger={
                    <button
                      type="button"
                      className="mt-3 min-h-11 text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-risk"
                    >
                      Clear from this device
                    </button>
                  }
                />
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </PrototypeShell>
  );
}
