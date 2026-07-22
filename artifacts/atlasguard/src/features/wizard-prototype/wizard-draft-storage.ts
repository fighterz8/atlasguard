import { z } from "zod";

import {
  HOUSEHOLD_PLAN_VERSION,
  supportedPlaces,
  type WizardPrototypeDraft,
  type WizardStepId,
} from "./model";
import { createInitialExpenseWorksheet } from "./expense-worksheet";
import {
  moveWiseVerificationTaskSchema,
  type MoveWiseVerificationTask,
} from "./verification-task-model";

export const MOVEWISE_DRAFT_SCHEMA_VERSION = "1.4.0" as const;
export const MOVEWISE_DRAFT_STORAGE_KEY =
  "movewise.relocation-brief.local.v1" as const;

export type MoveWiseSavedView = WizardStepId | "results";

export type MoveWiseDraftEnvelope = Readonly<{
  schemaVersion: typeof MOVEWISE_DRAFT_SCHEMA_VERSION;
  savedAt: string;
  view: MoveWiseSavedView;
  draft: WizardPrototypeDraft;
  verificationTasks: readonly MoveWiseVerificationTask[];
}>;

export type MoveWiseDraftStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const emptyableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values)]);

const assumptionBasisSchema = z.enum(["confirmed", "user_estimate"]);
const assessmentSchema = z.enum([
  "strong_negative",
  "negative",
  "neutral",
  "positive",
  "strong_positive",
  "unavailable",
]);
const yesNoSchema = emptyableEnum(["yes", "no"]);
const conditionalNeedSchema = z
  .object({
    relevance: yesNoSchema,
    importance: emptyableEnum(["important", "blocker"]),
    status: emptyableEnum(["works", "does_not_work", "not_checked"]),
  })
  .strict();

const financesSchema = z
  .object({
    currentHousingTenure: emptyableEnum(["rent", "own"]),
    currentTakeHome: z.string(),
    targetTakeHome: z.string(),
    currentHousing: z.string(),
    targetHousing: z.string(),
    targetGrossIncomeKnown: z.boolean(),
    targetGrossIncome: z.string(),
    currentExpenses: z.string(),
    expenseWorksheet: z
      .object({
        enabled: z.boolean(),
        values: z
          .object({
            utilities: z.string(),
            transport: z.string(),
            food: z.string(),
            childcare: z.string(),
            debt: z.string(),
            insurance: z.string(),
            subscriptions: z.string(),
            other: z.string(),
          })
          .strict(),
      })
      .strict(),
    targetExpenses: z.string(),
    retainedPropertyNet: z.string(),
    targetTakeHomeRangeMin: z.string(),
    targetTakeHomeRangeMax: z.string(),
    targetHousingRangeMin: z.string(),
    targetHousingRangeMax: z.string(),
    targetGrossIncomeRangeMin: z.string(),
    targetGrossIncomeRangeMax: z.string(),
    targetExpensesRangeMin: z.string(),
    targetExpensesRangeMax: z.string(),
    retainedPropertyNetRangeMin: z.string(),
    retainedPropertyNetRangeMax: z.string(),
    targetTakeHomeBasis: assumptionBasisSchema,
    targetHousingBasis: assumptionBasisSchema,
    targetGrossIncomeBasis: assumptionBasisSchema,
    targetExpensesBasis: assumptionBasisSchema,
    retainedPropertyNetBasis: assumptionBasisSchema,
  })
  .strict();

const householdPlanSchema = z
  .object({
    version: z.literal(HOUSEHOLD_PLAN_VERSION),
    housing: z
      .object({
        tenure: emptyableEnum(["rent", "buy", "rent_then_buy", "either"]),
        type: emptyableEnum([
          "apartment_or_condo",
          "townhome",
          "detached",
          "flexible",
        ]),
        bedrooms: emptyableEnum(["studio", "1", "2", "3", "4_plus"]),
        bathrooms: emptyableEnum(["1", "1_5", "2", "3_plus"]),
        maxMonthlyCost: z.string(),
        ceilingType: emptyableEnum(["hard", "target", "flexible", "not_sure"]),
        stopsMove: yesNoSchema,
        assessment: assessmentSchema,
      })
      .strict(),
    childcare: conditionalNeedSchema
      .extend({
        arrangement: emptyableEnum([
          "center",
          "home_based",
          "in_home_caregiver",
          "family_or_friend",
          "before_after_school",
          "flexible",
        ]),
      })
      .strict(),
    school: conditionalNeedSchema
      .extend({
        gradeBand: emptyableEnum([
          "preschool",
          "elementary",
          "middle",
          "high",
          "multiple",
        ]),
        preference: emptyableEnum(["public", "private", "either"]),
        requirements: z.string(),
      })
      .strict(),
    supportNetwork: conditionalNeedSchema,
    requiredServices: conditionalNeedSchema,
    carFreeAccess: conditionalNeedSchema,
  })
  .strict();

const supportedPlaceValues: readonly string[] = supportedPlaces.map(
  ({ slug }) => slug,
);
const placeSchema = z
  .string()
  .refine(
    (value) => value === "" || supportedPlaceValues.includes(value),
    "Unsupported research location.",
  );

const wizardDraftSchema = z
  .object({
    originSlug: placeSchema,
    destinationSlug: placeSchema,
    householdMode: emptyableEnum(["individual", "family"]),
    finances: financesSchema,
    commuteImportance: emptyableEnum([
      "must_have",
      "important",
      "nice_to_have",
      "does_not_matter",
    ]),
    climateHeatPreference: emptyableEnum([
      "fewer_hot_days",
      "more_hot_days",
      "does_not_matter",
    ]),
    climateHeatImportance: emptyableEnum([
      "must_have",
      "important",
      "nice_to_have",
    ]),
    householdPlan: householdPlanSchema,
  })
  .strict();

const viewValues = [
  "move",
  "money",
  "firstHome",
  "priorities",
  "household",
  "review",
  "results",
] as const satisfies readonly MoveWiseSavedView[];

const envelopeSchema = z
  .object({
    schemaVersion: z.literal(MOVEWISE_DRAFT_SCHEMA_VERSION),
    savedAt: z.iso.datetime(),
    view: z.enum(viewValues),
    draft: wizardDraftSchema,
    verificationTasks: z.array(moveWiseVerificationTaskSchema),
  })
  .strict();

export type LoadMoveWiseDraftResult =
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "restored"; envelope: MoveWiseDraftEnvelope }>
  | Readonly<{
      status: "invalid";
      reason:
        | "read_failed"
        | "corrupt"
        | "incompatible_version"
        | "invalid_shape";
    }>;

export function loadMoveWiseDraft(
  storage: MoveWiseDraftStorage,
): LoadMoveWiseDraftResult {
  let raw: string | null;
  try {
    raw = storage.getItem(MOVEWISE_DRAFT_STORAGE_KEY);
  } catch {
    return { status: "invalid", reason: "read_failed" };
  }
  if (raw === null) return { status: "empty" };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "invalid", reason: "corrupt" };
  }
  let storedVersion =
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    typeof value.schemaVersion === "string"
      ? value.schemaVersion
      : null;
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    storedVersion === "1.0.0" &&
    "draft" in value &&
    typeof value.draft === "object" &&
    value.draft !== null &&
    "finances" in value.draft &&
    typeof value.draft.finances === "object" &&
    value.draft.finances !== null &&
    !("expenseWorksheet" in value.draft.finances)
  ) {
    value = {
      ...value,
      schemaVersion: "1.1.0",
      draft: {
        ...value.draft,
        finances: {
          ...value.draft.finances,
          expenseWorksheet: createInitialExpenseWorksheet(),
        },
      },
    };
    storedVersion = "1.1.0";
  }
  if (
    storedVersion === "1.1.0" &&
    typeof value === "object" &&
    value !== null &&
    "draft" in value &&
    typeof value.draft === "object" &&
    value.draft !== null &&
    "householdPlan" in value.draft &&
    typeof value.draft.householdPlan === "object" &&
    value.draft.householdPlan !== null &&
    "housing" in value.draft.householdPlan &&
    typeof value.draft.householdPlan.housing === "object" &&
    value.draft.householdPlan.housing !== null
  ) {
    const housing = value.draft.householdPlan.housing as Record<
      string,
      unknown
    >;
    value = {
      ...value,
      schemaVersion: "1.2.0",
      draft: {
        ...value.draft,
        householdPlan: {
          ...value.draft.householdPlan,
          housing: {
            ...housing,
            ceilingType:
              housing.stopsMove === "yes"
                ? "hard"
                : housing.stopsMove === "no"
                  ? "target"
                  : "",
          },
        },
      },
    };
    storedVersion = "1.2.0";
  }
  if (
    storedVersion === "1.2.0" &&
    typeof value === "object" &&
    value !== null &&
    "draft" in value &&
    typeof value.draft === "object" &&
    value.draft !== null &&
    "householdPlan" in value.draft &&
    typeof value.draft.householdPlan === "object" &&
    value.draft.householdPlan !== null
  ) {
    const legacyPlan = value.draft.householdPlan as Record<string, unknown>;
    const migrateConstraint = (key: string) => {
      const legacy = legacyPlan[key];
      if (typeof legacy !== "object" || legacy === null) return legacy;
      const answer = legacy as Record<string, unknown>;
      const relevance =
        answer.needed === "yes" ? "yes" : answer.needed === "no" ? "no" : "";
      const importance =
        relevance === "yes"
          ? answer.stopsMove === "yes"
            ? "blocker"
            : answer.stopsMove === "no"
              ? "important"
              : ""
          : "";
      const status =
        relevance !== "yes"
          ? ""
          : answer.assessment === "strong_positive" ||
              answer.assessment === "positive"
            ? "works"
            : answer.assessment === "strong_negative" ||
                answer.assessment === "negative"
              ? "does_not_work"
              : "not_checked";
      const {
        needed: _needed,
        stopsMove: _stopsMove,
        assessment: _assessment,
        ...detail
      } = answer;
      return { ...detail, relevance, importance, status };
    };
    value = {
      ...value,
      schemaVersion: "1.3.0",
      draft: {
        ...value.draft,
        householdPlan: {
          ...legacyPlan,
          version: HOUSEHOLD_PLAN_VERSION,
          supportNetwork: migrateConstraint("supportNetwork"),
          childcare: migrateConstraint("childcare"),
          school: migrateConstraint("school"),
          requiredServices: migrateConstraint("requiredServices"),
          carFreeAccess: migrateConstraint("carFreeAccess"),
        },
      },
    };
    storedVersion = "1.3.0";
  }
  if (
    storedVersion === "1.3.0" &&
    typeof value === "object" &&
    value !== null
  ) {
    value = {
      ...value,
      schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
      verificationTasks: [],
    };
    storedVersion = MOVEWISE_DRAFT_SCHEMA_VERSION;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion !== MOVEWISE_DRAFT_SCHEMA_VERSION
  ) {
    return { status: "invalid", reason: "incompatible_version" };
  }
  const parsed = envelopeSchema.safeParse(value);
  return parsed.success
    ? { status: "restored", envelope: parsed.data as MoveWiseDraftEnvelope }
    : { status: "invalid", reason: "invalid_shape" };
}

export function saveMoveWiseDraft(
  storage: MoveWiseDraftStorage,
  value: Omit<MoveWiseDraftEnvelope, "schemaVersion">,
):
  | Readonly<{ success: true; savedAt: string }>
  | Readonly<{ success: false; reason: "write_failed" }> {
  try {
    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        ...value,
      }),
    );
    return { success: true, savedAt: value.savedAt };
  } catch {
    return { success: false, reason: "write_failed" };
  }
}

export function clearMoveWiseDraft(
  storage: MoveWiseDraftStorage,
):
  | Readonly<{ success: true }>
  | Readonly<{ success: false; reason: "clear_failed" }> {
  try {
    storage.removeItem(MOVEWISE_DRAFT_STORAGE_KEY);
    return { success: true };
  } catch {
    return { success: false, reason: "clear_failed" };
  }
}
