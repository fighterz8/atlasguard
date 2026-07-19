import { z } from "zod/v4";

import { FinancialInputPathSchema } from "./benchmark";
import { sortJsonKeys } from "./canonical-json";
import type { DecisionProfile, PriorityChange } from "./decision-profile";
import { FinancialBlockerCodeSchema } from "./decision-profile";
import {
  FINANCIAL_BLOCKER_FINDING_REGISTRY,
  FINANCIAL_DERIVED_EVIDENCE_REGISTRY,
  FINANCIAL_INPUT_EVIDENCE_IDS,
  PRIORITY_MATERIALITY_REFERENCE_WEIGHT,
  roundHalfAwayFromZero,
} from "./decision-rules";
import type { FinancialBlockerCode } from "./decision-rules";
import {
  SafeIntegerSchema,
  Sha256Schema,
  StableIdSchema,
  VersionSchema,
} from "./primitives";

export const MOVEWISE_SCORE_SCHEMA_VERSION = "1.0.0" as const;
export const MOVEWISE_SCORE_RULE_VERSION = "0.1.0" as const;
export const MOVEWISE_SCORE_BASELINE = 50 as const;

export const MOVEWISE_SCORE_COMPONENT_REGISTRY = Object.freeze({
  financial_security: { maximumAbsoluteContribution: 30 },
  daily_life_fit: { maximumAbsoluteContribution: 20 },
  opportunity_context: { maximumAbsoluteContribution: 0 },
  household_fit: { maximumAbsoluteContribution: 0 },
} as const);

export const MOVEWISE_SCORE_METRIC_REGISTRY = Object.freeze({
  financial_cushion_delta: {
    componentId: "financial_security",
    maximumAbsoluteContribution: 30,
  },
  commute_time: {
    componentId: "daily_life_fit",
    maximumAbsoluteContribution: 10,
  },
  climate_heat: {
    componentId: "daily_life_fit",
    maximumAbsoluteContribution: 10,
  },
} as const);

export const MOVEWISE_SCORE_BLOCKER_CAPS = Object.freeze({
  negative_target_cushion: 59,
  target_housing_burden_at_or_above_50_percent: 59,
} as const satisfies Record<FinancialBlockerCode, number>);

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const deriveMoveWiseScoreBand = (value: number) => {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new RangeError(
      "MoveWise Score value must be an integer from 1 to 100.",
    );
  }
  if (value <= 39) return "worse_fit" as const;
  if (value <= 59) return "mixed_or_similar" as const;
  if (value <= 79) return "better_fit" as const;
  return "substantially_better_fit" as const;
};

export const calculateFinancialSecurityScoreContribution = (
  monthlyCushionDeltaCents: number,
  materialityThresholdCents: number,
): number => {
  if (
    !Number.isInteger(monthlyCushionDeltaCents) ||
    !Number.isInteger(materialityThresholdCents) ||
    materialityThresholdCents <= 0
  ) {
    throw new RangeError(
      "Financial score inputs must use valid integer cents.",
    );
  }
  return clamp(
    roundHalfAwayFromZero(
      (monthlyCushionDeltaCents * 10) / materialityThresholdCents,
    ),
    -MOVEWISE_SCORE_METRIC_REGISTRY.financial_cushion_delta
      .maximumAbsoluteContribution,
    MOVEWISE_SCORE_METRIC_REGISTRY.financial_cushion_delta
      .maximumAbsoluteContribution,
  );
};

export const calculatePriorityScoreContribution = (
  weightedContribution: number | null,
  materialityThresholdBps: number | null,
): number => {
  if (weightedContribution === null && materialityThresholdBps === null) {
    return 0;
  }
  if (
    weightedContribution === null ||
    materialityThresholdBps === null ||
    !Number.isInteger(weightedContribution) ||
    !Number.isInteger(materialityThresholdBps) ||
    materialityThresholdBps <= 0
  ) {
    throw new RangeError(
      "Priority score inputs must be both available or both null.",
    );
  }
  return clamp(
    roundHalfAwayFromZero(
      (weightedContribution * 5) /
        (materialityThresholdBps * PRIORITY_MATERIALITY_REFERENCE_WEIGHT),
    ),
    -10,
    10,
  );
};

export const applyMoveWiseScoreBlockerCaps = (
  value: number,
  blockerCodes: readonly FinancialBlockerCode[],
): number =>
  blockerCodes.reduce(
    (capped, blockerCode) =>
      Math.min(capped, MOVEWISE_SCORE_BLOCKER_CAPS[blockerCode]),
    value,
  );

const MoveWiseScoreComponentIdSchema = z.enum([
  "financial_security",
  "daily_life_fit",
  "opportunity_context",
  "household_fit",
]);

const MoveWiseScoreMetricIdSchema = z.enum([
  "financial_cushion_delta",
  "commute_time",
  "climate_heat",
]);

const MoveWiseScoreMetricContributionSchema = z
  .object({
    metricId: MoveWiseScoreMetricIdSchema,
    componentId: MoveWiseScoreComponentIdSchema,
    status: z.enum(["available", "omitted", "unavailable"]),
    contribution: SafeIntegerSchema.min(-30).max(30),
    maximumAbsoluteContribution: SafeIntegerSchema.min(0).max(30),
    ruleId: StableIdSchema,
    evidenceRefs: z.array(StableIdSchema),
    transformationVersion: VersionSchema.nullable(),
    reasonCode: StableIdSchema.nullable(),
  })
  .strict();

const MoveWiseScoreComponentContributionSchema = z
  .object({
    componentId: MoveWiseScoreComponentIdSchema,
    status: z.enum(["available", "partial", "unavailable"]),
    contribution: SafeIntegerSchema.min(-50).max(50),
    maximumAbsoluteContribution: SafeIntegerSchema.min(0).max(50),
    metricContributions: z.array(MoveWiseScoreMetricContributionSchema),
    reasonCodes: z.array(StableIdSchema),
  })
  .strict();

const MoveWiseScoreRangeSchema = z
  .object({
    min: z.number().int().min(1).max(100),
    max: z.number().int().min(1).max(100),
    method: z.literal("plausible_financial_endpoints"),
    variedInputPaths: z.array(FinancialInputPathSchema).min(1),
    minInputFingerprintSha256: Sha256Schema,
    maxInputFingerprintSha256: Sha256Schema,
  })
  .strict();

export const MoveWiseScoreSchema = z
  .object({
    schemaVersion: z.literal(MOVEWISE_SCORE_SCHEMA_VERSION),
    scoreVersion: z.literal(MOVEWISE_SCORE_RULE_VERSION),
    baseline: z.literal(MOVEWISE_SCORE_BASELINE),
    value: z.number().int().min(1).max(100),
    band: z.enum([
      "worse_fit",
      "mixed_or_similar",
      "better_fit",
      "substantially_better_fit",
    ]),
    range: MoveWiseScoreRangeSchema.nullable(),
    rawContribution: SafeIntegerSchema.min(-50).max(50),
    appliedCap: z.number().int().min(1).max(100).nullable(),
    componentContributions: z
      .array(MoveWiseScoreComponentContributionSchema)
      .length(4),
    activeBlockers: z.array(
      z
        .object({
          code: FinancialBlockerCodeSchema,
          componentId: z.literal("financial_security"),
          scoreCap: z.number().int().min(1).max(100),
          evidenceRefs: z.array(StableIdSchema).min(1),
          inputPaths: z.array(FinancialInputPathSchema).min(1),
        })
        .strict(),
    ),
    inputFingerprintSha256: Sha256Schema,
    benchmarkVersion: VersionSchema,
    benchmarkSha256: Sha256Schema,
    decisionRuleVersion: VersionSchema,
  })
  .strict()
  .superRefine((score, context) => {
    if (score.band !== deriveMoveWiseScoreBand(score.value)) {
      context.addIssue({
        code: "custom",
        message: "MoveWise Score band does not match its value.",
        path: ["band"],
      });
    }
    const uncapped = clamp(score.baseline + score.rawContribution, 1, 100);
    const expectedCap =
      score.activeBlockers.length === 0
        ? null
        : Math.min(...score.activeBlockers.map(({ scoreCap }) => scoreCap));
    const expectedValue =
      expectedCap === null ? uncapped : Math.min(uncapped, expectedCap);
    if (score.appliedCap !== expectedCap || score.value !== expectedValue) {
      context.addIssue({
        code: "custom",
        message: "MoveWise Score value does not apply its registered cap.",
        path: ["value"],
      });
    }
    const componentTotal = score.componentContributions.reduce(
      (total, component) => total + component.contribution,
      0,
    );
    if (componentTotal !== score.rawContribution) {
      context.addIssue({
        code: "custom",
        message: "Component contributions must sum to the raw contribution.",
        path: ["rawContribution"],
      });
    }
    if (
      score.range !== null &&
      (score.range.min >= score.range.max ||
        score.value < score.range.min ||
        score.value > score.range.max)
    ) {
      context.addIssue({
        code: "custom",
        message: "Score range must vary and contain the point score.",
        path: ["range"],
      });
    }
  });

export type MoveWiseScore = z.infer<typeof MoveWiseScoreSchema>;

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

declare const verifiedMoveWiseScoreBrand: unique symbol;
export type VerifiedMoveWiseScore = DeepReadonly<MoveWiseScore> & {
  readonly [verifiedMoveWiseScoreBrand]: true;
};

const compareIds = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

type ScoredPriorityId = "commute_time" | "climate_heat";

const omittedPriorityMetricContribution = (
  metricId: ScoredPriorityId,
): z.infer<typeof MoveWiseScoreMetricContributionSchema> => ({
  metricId,
  componentId: "daily_life_fit",
  status: "omitted",
  contribution: 0,
  maximumAbsoluteContribution:
    MOVEWISE_SCORE_METRIC_REGISTRY[metricId].maximumAbsoluteContribution,
  ruleId: "score.daily_life.materiality_scaled",
  evidenceRefs: [],
  transformationVersion: null,
  reasonCode: "score.priority_not_collected",
});

const priorityMetricContribution = (
  change: PriorityChange,
  metricId: ScoredPriorityId,
): z.infer<typeof MoveWiseScoreMetricContributionSchema> => {
  const registration = MOVEWISE_SCORE_METRIC_REGISTRY[metricId];
  if (change.weight === 0) {
    return {
      metricId,
      componentId: registration.componentId,
      status: "omitted",
      contribution: 0,
      maximumAbsoluteContribution: registration.maximumAbsoluteContribution,
      ruleId: "score.daily_life.materiality_scaled",
      evidenceRefs: [],
      transformationVersion: null,
      reasonCode: "score.priority_excluded",
    };
  }
  if (change.availability === "unavailable") {
    return {
      metricId,
      componentId: registration.componentId,
      status: "unavailable",
      contribution: 0,
      maximumAbsoluteContribution: registration.maximumAbsoluteContribution,
      ruleId: "score.daily_life.materiality_scaled",
      evidenceRefs: [...change.evidenceRefs].sort(compareIds),
      transformationVersion: change.transformationVersion,
      reasonCode: "score.active_evidence_unavailable",
    };
  }
  return {
    metricId,
    componentId: registration.componentId,
    status: "available",
    contribution: calculatePriorityScoreContribution(
      change.weightedContribution,
      change.materialityThresholdBps,
    ),
    maximumAbsoluteContribution: registration.maximumAbsoluteContribution,
    ruleId: "score.daily_life.materiality_scaled",
    evidenceRefs: [...change.evidenceRefs].sort(compareIds),
    transformationVersion: change.transformationVersion,
    reasonCode: null,
  };
};

const buildMoveWiseScorePoint = (profile: DecisionProfile): MoveWiseScore => {
  const financialContribution = calculateFinancialSecurityScoreContribution(
    profile.financialPosition.change.monthlyCushionDeltaCents,
    profile.financialPosition.change.materialityThresholdCents,
  );
  const financialMetric = {
    metricId: "financial_cushion_delta" as const,
    componentId: "financial_security" as const,
    status: "available" as const,
    contribution: financialContribution,
    maximumAbsoluteContribution: 30,
    ruleId: "score.financial.cushion_delta.materiality_scaled",
    evidenceRefs: [
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.evidenceId,
      ...FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.inputPaths.map(
        (path) => FINANCIAL_INPUT_EVIDENCE_IDS[path],
      ),
    ].sort(compareIds),
    transformationVersion: profile.scenario.decisionRuleVersion,
    reasonCode: null,
  };
  const dailyMetrics = (["commute_time", "climate_heat"] as const).map(
    (priorityId) => {
      const change = profile.priorityChanges.find(
        (candidate) => candidate.priorityId === priorityId,
      );
      if (change === undefined) {
        return omittedPriorityMetricContribution(priorityId);
      }
      return priorityMetricContribution(change, priorityId);
    },
  );
  const dailyContribution = dailyMetrics.reduce(
    (total, metric) => total + metric.contribution,
    0,
  );
  const availableDaily = dailyMetrics.filter(
    ({ status }) => status === "available",
  ).length;
  const unavailableDaily = dailyMetrics.filter(
    ({ status }) => status === "unavailable",
  ).length;
  const dailyStatus =
    unavailableDaily > 0 && availableDaily > 0
      ? ("partial" as const)
      : availableDaily > 0
        ? ("available" as const)
        : ("unavailable" as const);
  const componentContributions = [
    {
      componentId: "financial_security" as const,
      status: "available" as const,
      contribution: financialContribution,
      maximumAbsoluteContribution: 30,
      metricContributions: [financialMetric],
      reasonCodes: [],
    },
    {
      componentId: "daily_life_fit" as const,
      status: dailyStatus,
      contribution: dailyContribution,
      maximumAbsoluteContribution: 20,
      metricContributions: dailyMetrics,
      reasonCodes:
        dailyStatus === "unavailable"
          ? ["score.no_active_daily_life_evidence"]
          : unavailableDaily > 0
            ? ["score.some_daily_life_evidence_unavailable"]
            : [],
    },
    {
      componentId: "opportunity_context" as const,
      status: "unavailable" as const,
      contribution: 0,
      maximumAbsoluteContribution: 0,
      metricContributions: [],
      reasonCodes: ["score.component_not_supported_in_version"],
    },
    {
      componentId: "household_fit" as const,
      status: "unavailable" as const,
      contribution: 0,
      maximumAbsoluteContribution: 0,
      metricContributions: [],
      reasonCodes: ["score.component_not_supported_in_version"],
    },
  ];
  const rawContribution = componentContributions.reduce(
    (total, component) => total + component.contribution,
    0,
  );
  const activeBlockers = profile.financialPosition.blockerCodes.map((code) => {
    const registration = FINANCIAL_BLOCKER_FINDING_REGISTRY[code];
    return {
      code,
      componentId: "financial_security" as const,
      scoreCap: MOVEWISE_SCORE_BLOCKER_CAPS[code],
      evidenceRefs: [
        registration.evidenceId,
        ...registration.inputPaths.map(
          (path) => FINANCIAL_INPUT_EVIDENCE_IDS[path],
        ),
      ].sort(compareIds),
      inputPaths: [...registration.inputPaths],
    };
  });
  const uncappedValue = clamp(
    MOVEWISE_SCORE_BASELINE + rawContribution,
    1,
    100,
  );
  const value = applyMoveWiseScoreBlockerCaps(
    uncappedValue,
    profile.financialPosition.blockerCodes,
  );
  const appliedCap =
    activeBlockers.length === 0
      ? null
      : Math.min(...activeBlockers.map(({ scoreCap }) => scoreCap));

  return {
    schemaVersion: MOVEWISE_SCORE_SCHEMA_VERSION,
    scoreVersion: MOVEWISE_SCORE_RULE_VERSION,
    baseline: MOVEWISE_SCORE_BASELINE,
    value,
    band: deriveMoveWiseScoreBand(value),
    range: null,
    rawContribution,
    appliedCap,
    componentContributions,
    activeBlockers,
    inputFingerprintSha256: profile.inputFingerprintSha256,
    benchmarkVersion: profile.scenario.benchmarkSnapshot.version,
    benchmarkSha256: profile.scenario.benchmarkSnapshot.sha256,
    decisionRuleVersion: profile.scenario.decisionRuleVersion,
  };
};

const canonicalEquals = (left: unknown, right: unknown): boolean =>
  JSON.stringify(sortJsonKeys(left)) === JSON.stringify(sortJsonKeys(right));

export class MoveWiseScoreVerificationError extends Error {
  constructor() {
    super("MoveWise Score does not match the verified Decision Profile.");
    this.name = "MoveWiseScoreVerificationError";
  }
}

export const calculateMoveWiseScorePoint = (
  profile: DecisionProfile,
): VerifiedMoveWiseScore => {
  const score = MoveWiseScoreSchema.parse(buildMoveWiseScorePoint(profile));
  return deepFreeze(score) as VerifiedMoveWiseScore;
};

export const verifyMoveWiseScore = (
  input: unknown,
  profile: DecisionProfile,
): VerifiedMoveWiseScore => {
  const score = MoveWiseScoreSchema.parse(input);
  const expected = buildMoveWiseScorePoint(profile);
  if (!canonicalEquals({ ...score, range: null }, expected)) {
    throw new MoveWiseScoreVerificationError();
  }
  return deepFreeze(score) as VerifiedMoveWiseScore;
};
