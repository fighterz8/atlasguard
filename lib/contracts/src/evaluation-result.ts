import { z } from "zod/v4";

import {
  BenchmarkComparisonSchema,
  calculateBenchmarkComparisonChecksum,
  verifyBenchmarkComparison,
} from "./benchmark";
import type {
  FinancialInputPath,
  ScenarioInputEvidence,
  VerifiedBenchmarkComparison,
} from "./benchmark";
import { sortJsonKeys } from "./canonical-json";
import { DecisionProfileSchema } from "./decision-profile";
import { DECISION_PROFILE_SCHEMA_VERSION } from "./primitives";
import {
  fingerprintScenarioInput,
  ScenarioInputSchema,
} from "./scenario-input";
import type { ScenarioInput } from "./scenario-input";

export const ResultModeSchema = z.enum([
  "deterministic",
  "explainer",
  "repaired_explainer",
  "deterministic_fallback",
]);

const canonicalEquals = (left: unknown, right: unknown): boolean =>
  JSON.stringify(sortJsonKeys(left)) === JSON.stringify(sortJsonKeys(right));

type InputEvidenceExpectation = {
  inputPath: FinancialInputPath;
  assumption: {
    monthlyCents: number;
    basis: ScenarioInputEvidence["assumptionBasis"];
    plausibleRangeCents: { min: number; max: number } | null;
  };
};

const getInputEvidenceExpectations = (
  scenario: ScenarioInput,
): InputEvidenceExpectation[] => {
  const expectations: Array<InputEvidenceExpectation | null> = [
    {
      inputPath: "finances.origin.takeHomeIncome.monthlyCents",
      assumption: scenario.finances.origin.takeHomeIncome,
    },
    scenario.finances.origin.grossIncome === null
      ? null
      : {
          inputPath: "finances.origin.grossIncome.monthlyCents",
          assumption: scenario.finances.origin.grossIncome,
        },
    {
      inputPath: "finances.origin.housingCost.monthlyCents",
      assumption: scenario.finances.origin.housingCost,
    },
    {
      inputPath:
        "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
      assumption: scenario.finances.origin.recurringExpensesExcludingHousing,
    },
    {
      inputPath: "finances.destination.takeHomeIncome.monthlyCents",
      assumption: scenario.finances.destination.takeHomeIncome,
    },
    scenario.finances.destination.grossIncome === null
      ? null
      : {
          inputPath: "finances.destination.grossIncome.monthlyCents",
          assumption: scenario.finances.destination.grossIncome,
        },
    {
      inputPath: "finances.destination.housingCost.monthlyCents",
      assumption: scenario.finances.destination.housingCost,
    },
    {
      inputPath:
        "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
      assumption:
        scenario.finances.destination.recurringExpensesExcludingHousing,
    },
    {
      inputPath: "finances.destination.retainedPropertyNet.monthlyCents",
      assumption: scenario.finances.destination.retainedPropertyNet,
    },
  ];

  return expectations.filter(
    (expectation): expectation is InputEvidenceExpectation =>
      expectation !== null,
  );
};

export const EvaluationResultSchema = z
  .object({
    schemaVersion: z.literal(DECISION_PROFILE_SCHEMA_VERSION),
    resultMode: z.literal("deterministic"),
    scenarioInput: ScenarioInputSchema,
    benchmarkComparison: BenchmarkComparisonSchema,
    decisionProfile: DecisionProfileSchema,
  })
  .strict()
  .superRefine((result, context) => {
    const { scenarioInput, benchmarkComparison, decisionProfile } = result;
    const expectedFingerprint = fingerprintScenarioInput(scenarioInput);
    if (decisionProfile.inputFingerprintSha256 !== expectedFingerprint) {
      context.addIssue({
        code: "custom",
        message: "Decision Profile fingerprint must match the canonical input.",
        path: ["decisionProfile", "inputFingerprintSha256"],
      });
    }

    // Zod may continue an outer refinement after a nested refinement emitted
    // issues. Never call the checksum loader on an already-invalid benchmark.
    if (!BenchmarkComparisonSchema.safeParse(benchmarkComparison).success) {
      return;
    }

    const expectedBenchmarkChecksum =
      calculateBenchmarkComparisonChecksum(benchmarkComparison);
    if (benchmarkComparison.snapshot.sha256 !== expectedBenchmarkChecksum) {
      context.addIssue({
        code: "custom",
        message: "Benchmark content must match its declared snapshot checksum.",
        path: ["benchmarkComparison", "snapshot", "sha256"],
      });
    }
    benchmarkComparison.priorities.forEach((priority, index) => {
      if (priority.evidence.quality.missingness === "partial") {
        context.addIssue({
          code: "custom",
          message:
            "Partial evidence cannot be promoted into a two-sided move comparison.",
          path: [
            "benchmarkComparison",
            "priorities",
            index,
            "evidence",
            "quality",
            "missingness",
          ],
        });
      }
    });

    if (
      scenarioInput.originMetroSlug !== benchmarkComparison.origin.slug ||
      scenarioInput.destinationMetroSlug !==
        benchmarkComparison.destination.slug ||
      !canonicalEquals(
        decisionProfile.scenario.origin,
        benchmarkComparison.origin,
      ) ||
      !canonicalEquals(
        decisionProfile.scenario.destination,
        benchmarkComparison.destination,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Scenario input, promoted benchmark, and Decision Profile metros must match.",
        path: ["decisionProfile", "scenario"],
      });
    }
    if (
      scenarioInput.originMetroSlug === scenarioInput.destinationMetroSlug &&
      !canonicalEquals(
        benchmarkComparison.origin,
        benchmarkComparison.destination,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A same-metro scenario must resolve origin and destination to the identical geography record.",
        path: ["benchmarkComparison", "destination"],
      });
    }

    if (
      !canonicalEquals(
        decisionProfile.scenario.benchmarkSnapshot,
        benchmarkComparison.snapshot,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Decision Profile must name the promoted benchmark snapshot.",
        path: ["decisionProfile", "scenario", "benchmarkSnapshot"],
      });
    }

    const inputPrioritiesById = new Map(
      scenarioInput.priorities.map((priority) => [
        priority.priorityId,
        priority,
      ]),
    );
    const profilePrioritiesById = new Map(
      decisionProfile.priorityChanges.map((change) => [
        change.priorityId,
        change,
      ]),
    );
    if (profilePrioritiesById.size !== inputPrioritiesById.size) {
      context.addIssue({
        code: "custom",
        message: "Decision Profile priorities must exactly match the input.",
        path: ["decisionProfile", "priorityChanges"],
      });
    }
    scenarioInput.priorities.forEach((priority, index) => {
      const change = profilePrioritiesById.get(priority.priorityId);
      if (
        change === undefined ||
        change.id !== `priority.${priority.priorityId}` ||
        change.weight !== priority.weight ||
        change.preferredDirection !== priority.preferredDirection
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Priority ID, weight, and direction must match the canonical input.",
          path: ["scenarioInput", "priorities", index],
        });
      }
    });

    const activeInputPriorityIds = scenarioInput.priorities
      .filter((priority) => priority.weight > 0)
      .map((priority) => priority.priorityId)
      .sort();
    const benchmarkPriorityIds = benchmarkComparison.priorities
      .map((priority) => priority.priorityId)
      .sort();
    if (!canonicalEquals(activeInputPriorityIds, benchmarkPriorityIds)) {
      context.addIssue({
        code: "custom",
        message:
          "Promoted benchmark priorities must exactly match active input priorities.",
        path: ["benchmarkComparison", "priorities"],
      });
    }

    const profileMetricEvidence = decisionProfile.evidence.filter(
      (evidence) => evidence.kind === "benchmark_metric",
    );
    const benchmarkEvidenceById = new Map(
      benchmarkComparison.priorities.map((priority) => [
        priority.evidence.id,
        priority.evidence,
      ]),
    );
    if (profileMetricEvidence.length !== benchmarkEvidenceById.size) {
      context.addIssue({
        code: "custom",
        message:
          "Decision Profile benchmark evidence must exactly match the promoted snapshot.",
        path: ["decisionProfile", "evidence"],
      });
    }
    profileMetricEvidence.forEach((evidence, index) => {
      const promotedEvidence = benchmarkEvidenceById.get(evidence.id);
      if (
        promotedEvidence === undefined ||
        !canonicalEquals(evidence, promotedEvidence)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Decision Profile metric evidence must be copied from the verified benchmark.",
          path: ["decisionProfile", "evidence", index],
        });
      }
    });

    const profileInputEvidence = decisionProfile.evidence.filter(
      (evidence): evidence is ScenarioInputEvidence =>
        evidence.kind === "scenario_input",
    );
    const expectedInputEvidence = getInputEvidenceExpectations(scenarioInput);
    if (profileInputEvidence.length !== expectedInputEvidence.length) {
      context.addIssue({
        code: "custom",
        message:
          "Decision Profile input evidence must exactly cover the canonical financial input.",
        path: ["decisionProfile", "evidence"],
      });
    }
    expectedInputEvidence.forEach((expectation) => {
      const evidenceIndex = decisionProfile.evidence.findIndex(
        (evidence) =>
          evidence.kind === "scenario_input" &&
          evidence.inputPath === expectation.inputPath,
      );
      const evidence = decisionProfile.evidence[evidenceIndex];
      if (
        evidence?.kind !== "scenario_input" ||
        evidence.value !== expectation.assumption.monthlyCents ||
        evidence.assumptionBasis !== expectation.assumption.basis ||
        !canonicalEquals(
          evidence.plausibleRangeCents,
          expectation.assumption.plausibleRangeCents,
        )
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Decision Profile financial values, provenance, and ranges must match the input.",
          path: ["decisionProfile", "evidence", Math.max(evidenceIndex, 0)],
        });
      }
    });

    if (
      decisionProfile.breakpoints.length > 0 ||
      decisionProfile.stability.level !== "not_evaluated" ||
      decisionProfile.stability.breakpointIds.length > 0
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Phase 0 trusted results must mark stability not evaluated until reevaluation proof exists.",
        path: ["decisionProfile", "breakpoints"],
      });
    }
  });

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

declare const verifiedEvaluationResultBrand: unique symbol;

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export type VerifiedEvaluationResult = DeepReadonly<
  Omit<EvaluationResult, "benchmarkComparison">
> & {
  readonly benchmarkComparison: VerifiedBenchmarkComparison;
  readonly [verifiedEvaluationResultBrand]: true;
};

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

export const verifyEvaluationResult = (
  input: unknown,
): VerifiedEvaluationResult => {
  const parsed = EvaluationResultSchema.parse(input);
  const benchmarkComparison = verifyBenchmarkComparison(
    parsed.benchmarkComparison,
  );

  return deepFreeze({
    ...parsed,
    benchmarkComparison,
  }) as VerifiedEvaluationResult;
};

export type ResultMode = z.infer<typeof ResultModeSchema>;
