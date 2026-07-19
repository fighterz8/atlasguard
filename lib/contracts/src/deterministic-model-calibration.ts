import { z } from "zod/v4";

import {
  MetroSlugSchema,
  SafeIntegerSchema,
  StableIdSchema,
} from "./primitives";

export const DETERMINISTIC_MODEL_CALIBRATION_SCHEMA_VERSION = "1.0.0" as const;
export const DETERMINISTIC_MODEL_RULE_CANDIDATE_VERSION = "0.2.0" as const;
export const DETERMINISTIC_MODEL_RULE_VERSION =
  DETERMINISTIC_MODEL_RULE_CANDIDATE_VERSION;

export const DETERMINISTIC_MODEL_CALIBRATION_FIXTURE_IDS = Object.freeze([
  "F01",
  "F02",
  "F03",
  "F04",
  "F05",
  "F06",
  "F07",
  "F08",
  "F09",
  "F10",
  "F11",
  "F12",
  "I01",
  "I02",
  "I03",
  "I04",
  "I05",
  "I06",
  "B01",
  "B02",
  "B03",
  "B04",
  "B05",
  "B06",
] as const);

const CalibrationFixtureIdSchema = z.enum(
  DETERMINISTIC_MODEL_CALIBRATION_FIXTURE_IDS,
);

export const DeterministicModelImpactSchema = z.enum([
  "strong_negative",
  "negative",
  "neutral",
  "positive",
  "strong_positive",
  "excluded",
  "unavailable",
]);

export const DeterministicModelConditionSchema = z.enum([
  "likely_better_move",
  "worth_closer_look",
  "promising_if",
  "no_clear_advantage",
  "high_financial_risk",
]);

export const DeterministicModelBandSchema = z.enum([
  "worse_fit",
  "mixed_or_similar",
  "better_fit",
  "substantially_better_fit",
]);

export const DeterministicModelFinancialBlockerCodeSchema = z.enum([
  "negative_destination_cushion",
  "destination_housing_burden_at_or_above_50_percent",
]);

export const DeterministicModelFinancialCautionCodeSchema = z.enum([
  "low_destination_cushion",
  "destination_housing_burden_at_or_above_45_percent",
]);

const RangeSchema = z
  .object({
    min: SafeIntegerSchema,
    max: SafeIntegerSchema,
  })
  .strict()
  .refine(({ min, max }) => min < max, "Range minimum must be below maximum.");

const HouseholdSignalSchema = z
  .object({
    signalId: StableIdSchema,
    impact: DeterministicModelImpactSchema.exclude(["excluded", "unavailable"]),
  })
  .strict();

const EssentialRequirementSchema = z
  .object({
    requirementId: StableIdSchema,
    status: z.enum(["confirmed_met", "confirmed_unmet", "unconfirmed"]),
  })
  .strict();

export const DeterministicModelCalibrationInputSchema = z
  .object({
    originMetroSlug: MetroSlugSchema,
    destinationMetroSlug: MetroSlugSchema,
    monthlyCushionDeltaCents: SafeIntegerSchema.nullable(),
    destinationMonthlyCushionCents: SafeIntegerSchema.nullable(),
    destinationMonthlyCushionRangeCents: RangeSchema.nullable(),
    financialMaterialityThresholdCents: SafeIntegerSchema.positive(),
    lowCushionCautionThresholdCents: SafeIntegerSchema.positive(),
    destinationHousingBurdenBps: SafeIntegerSchema.min(0)
      .max(10_000)
      .nullable(),
    commuteImpact: DeterministicModelImpactSchema,
    climateImpact: DeterministicModelImpactSchema,
    householdSignals: z.array(HouseholdSignalSchema),
    essentialRequirements: z.array(EssentialRequirementSchema),
  })
  .strict()
  .superRefine((input, context) => {
    for (const [path, values] of [
      [
        "householdSignals",
        input.householdSignals.map(({ signalId }) => signalId),
      ],
      [
        "essentialRequirements",
        input.essentialRequirements.map(({ requirementId }) => requirementId),
      ],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `${path} identifiers must be unique.`,
          path: [path],
        });
      }
    }
  });

export const DeterministicModelInputSchema =
  DeterministicModelCalibrationInputSchema;

const ScenarioExpectedSchema = z
  .object({
    condition: DeterministicModelConditionSchema,
    band: DeterministicModelBandSchema,
    stability: z.enum(["stable", "assumption_sensitive"]),
    requiredBlockerCodes: z.array(DeterministicModelFinancialBlockerCodeSchema),
    requiredRangeBlockerCodes: z.array(
      DeterministicModelFinancialBlockerCodeSchema,
    ),
    requiredCautionCodes: z.array(DeterministicModelFinancialCautionCodeSchema),
    requiredConditionalRequirementIds: z.array(StableIdSchema),
    requiredUnmetRequirementIds: z.array(StableIdSchema),
  })
  .strict();

const ScenarioFixtureSchema = z
  .object({
    kind: z.literal("scenario"),
    id: CalibrationFixtureIdSchema,
    audience: z.enum(["family", "individual"]),
    title: z.string().trim().min(1),
    input: DeterministicModelCalibrationInputSchema,
    expected: ScenarioExpectedSchema,
  })
  .strict()
  .superRefine((fixture, context) => {
    const expectedPrefix = fixture.audience === "family" ? "F" : "I";
    if (!fixture.id.startsWith(expectedPrefix)) {
      context.addIssue({
        code: "custom",
        message: "Scenario fixture ID does not match its audience.",
        path: ["id"],
      });
    }
  });

export const DeterministicModelInvariantCodeSchema = z.enum([
  "neutral_baseline",
  "negative_cushion_edge",
  "housing_burden_edge",
  "missingness_and_exclusion",
  "sensitivity_crosses_blocker",
  "determinism_direction_and_same_metro",
]);

const InvariantFixtureSchema = z
  .object({
    kind: z.literal("invariant"),
    id: CalibrationFixtureIdSchema,
    title: z.string().trim().min(1),
    invariantCode: DeterministicModelInvariantCodeSchema,
  })
  .strict()
  .superRefine((fixture, context) => {
    if (!fixture.id.startsWith("B")) {
      context.addIssue({
        code: "custom",
        message: "Invariant fixture ID must use the B prefix.",
        path: ["id"],
      });
    }
  });

export const DeterministicModelCalibrationFixtureSchema = z.discriminatedUnion(
  "kind",
  [ScenarioFixtureSchema, InvariantFixtureSchema],
);

export const DeterministicModelCalibrationCorpusSchema = z
  .object({
    schemaVersion: z.literal(DETERMINISTIC_MODEL_CALIBRATION_SCHEMA_VERSION),
    ruleCandidateVersion: z.literal(DETERMINISTIC_MODEL_RULE_CANDIDATE_VERSION),
    fixtures: z.array(DeterministicModelCalibrationFixtureSchema).length(24),
  })
  .strict()
  .superRefine((corpus, context) => {
    const actualIds = corpus.fixtures.map(({ id }) => id);
    if (
      actualIds.length !== DETERMINISTIC_MODEL_CALIBRATION_FIXTURE_IDS.length ||
      actualIds.some(
        (id, index) =>
          id !== DETERMINISTIC_MODEL_CALIBRATION_FIXTURE_IDS[index],
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Calibration fixtures must contain every accepted ID exactly once in canonical order.",
        path: ["fixtures"],
      });
    }
  });

export type DeterministicModelCalibrationCorpus = z.infer<
  typeof DeterministicModelCalibrationCorpusSchema
>;
export type DeterministicModelCalibrationInput = z.infer<
  typeof DeterministicModelCalibrationInputSchema
>;
export type DeterministicModelInput = DeterministicModelCalibrationInput;
export type DeterministicModelCalibrationScenarioFixture = z.infer<
  typeof ScenarioFixtureSchema
>;

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

export type VerifiedDeterministicModelCalibrationCorpus =
  DeepReadonly<DeterministicModelCalibrationCorpus>;

export const verifyDeterministicModelCalibrationCorpus = (
  input: unknown,
): VerifiedDeterministicModelCalibrationCorpus =>
  deepFreeze(DeterministicModelCalibrationCorpusSchema.parse(input));
