import {
  calculateFinancialMaterialityCents,
  calculateHousingBurdenBps,
  calculateMonthlyCushion,
  classifySignedChange,
  DECISION_PROFILE_SCHEMA_VERSION,
  DECISION_RULE_VERSION,
  deriveConfidenceSelection,
  deriveDecisionNextSteps,
  deriveFinancialBlockerCodes,
  deriveFinancialRiskCodes,
  FINANCIAL_BLOCKER_FINDING_REGISTRY,
  FINANCIAL_DERIVED_EVIDENCE_REGISTRY,
  FINANCIAL_INPUT_EVIDENCE_IDS,
  fingerprintScenarioInput,
  getFinancialRiskFindingRegistration,
  isPriorityChangeMaterial,
  roundHalfAwayFromZero,
  ScenarioInputSchema,
  selectDecisionCondition,
  verifyEvaluationResult,
} from "@workspace/contracts";
import type {
  DecisionEvidence,
  DecisionProfile,
  DerivedEvidence,
  Finding,
  FinancialInputPath,
  PriorityChange,
  ScenarioInput,
  ScenarioInputEvidence,
  VerifiedBenchmarkComparison,
  VerifiedEvaluationResult,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";

type FinancialSide = "origin" | "destination";
type BudgetField =
  | "takeHomeIncome"
  | "grossIncome"
  | "housingCost"
  | "recurringExpensesExcludingHousing";

type InputEvidenceDescriptor = Readonly<{
  inputPath: FinancialInputPath;
  side: FinancialSide;
  field: BudgetField | "retainedPropertyNet";
}>;

const INPUT_EVIDENCE_DESCRIPTORS: readonly InputEvidenceDescriptor[] = [
  {
    inputPath: "finances.origin.takeHomeIncome.monthlyCents",
    side: "origin",
    field: "takeHomeIncome",
  },
  {
    inputPath: "finances.origin.grossIncome.monthlyCents",
    side: "origin",
    field: "grossIncome",
  },
  {
    inputPath: "finances.origin.housingCost.monthlyCents",
    side: "origin",
    field: "housingCost",
  },
  {
    inputPath: "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
    side: "origin",
    field: "recurringExpensesExcludingHousing",
  },
  {
    inputPath: "finances.destination.takeHomeIncome.monthlyCents",
    side: "destination",
    field: "takeHomeIncome",
  },
  {
    inputPath: "finances.destination.grossIncome.monthlyCents",
    side: "destination",
    field: "grossIncome",
  },
  {
    inputPath: "finances.destination.housingCost.monthlyCents",
    side: "destination",
    field: "housingCost",
  },
  {
    inputPath:
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
    side: "destination",
    field: "recurringExpensesExcludingHousing",
  },
  {
    inputPath: "finances.destination.retainedPropertyNet.monthlyCents",
    side: "destination",
    field: "retainedPropertyNet",
  },
];

const compareStableIds = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export type MoveDecisionPreflightErrorCode =
  | "origin_metro_mismatch"
  | "destination_metro_mismatch"
  | "missing_active_benchmark_priorities"
  | "extra_active_benchmark_priorities"
  | "priority_direction_mismatch";

export class MoveDecisionPreflightError extends Error {
  readonly code: MoveDecisionPreflightErrorCode;
  readonly details: Readonly<Record<string, string | readonly string[]>>;

  constructor(
    code: MoveDecisionPreflightErrorCode,
    message: string,
    details: Readonly<Record<string, string | readonly string[]>>,
  ) {
    super(message);
    this.name = "MoveDecisionPreflightError";
    this.code = code;
    this.details = details;
  }
}

export class BenchmarkAdmissionError extends Error {
  readonly expectedStatus: "research_only" | "user_facing";
  readonly actualStatus: "research_only" | "user_facing";

  constructor(
    expectedStatus: "research_only" | "user_facing",
    actualStatus: "research_only" | "user_facing",
  ) {
    super(
      `Benchmark admission status ${actualStatus} cannot be used for a ${expectedStatus} evaluation.`,
    );
    this.name = "BenchmarkAdmissionError";
    this.expectedStatus = expectedStatus;
    this.actualStatus = actualStatus;
  }
}

const assertBenchmarkMatchesScenario = (
  scenario: ScenarioInput,
  benchmark: VerifiedBenchmarkComparison,
): void => {
  if (scenario.originMetroSlug !== benchmark.origin.slug) {
    throw new MoveDecisionPreflightError(
      "origin_metro_mismatch",
      "Scenario origin does not match the verified benchmark origin.",
      {
        scenarioMetroSlug: scenario.originMetroSlug,
        benchmarkMetroSlug: benchmark.origin.slug,
      },
    );
  }
  if (scenario.destinationMetroSlug !== benchmark.destination.slug) {
    throw new MoveDecisionPreflightError(
      "destination_metro_mismatch",
      "Scenario destination does not match the verified benchmark destination.",
      {
        scenarioMetroSlug: scenario.destinationMetroSlug,
        benchmarkMetroSlug: benchmark.destination.slug,
      },
    );
  }

  const activePriorities = scenario.priorities.filter(
    (priority) => priority.weight > 0,
  );
  const activePriorityIds = new Set(
    activePriorities.map((priority) => priority.priorityId),
  );
  const benchmarkPriorityIds = new Set(
    benchmark.priorities.map((priority) => priority.priorityId),
  );
  const missingPriorityIds = [...activePriorityIds]
    .filter((priorityId) => !benchmarkPriorityIds.has(priorityId))
    .sort(compareStableIds);
  if (missingPriorityIds.length > 0) {
    throw new MoveDecisionPreflightError(
      "missing_active_benchmark_priorities",
      "Verified benchmark is missing active scenario priorities.",
      { priorityIds: missingPriorityIds },
    );
  }
  const extraPriorityIds = [...benchmarkPriorityIds]
    .filter((priorityId) => !activePriorityIds.has(priorityId))
    .sort(compareStableIds);
  if (extraPriorityIds.length > 0) {
    throw new MoveDecisionPreflightError(
      "extra_active_benchmark_priorities",
      "Verified benchmark contains priorities excluded from the scenario.",
      { priorityIds: extraPriorityIds },
    );
  }

  const benchmarkByPriority = new Map(
    benchmark.priorities.map((priority) => [priority.priorityId, priority]),
  );
  activePriorities.forEach((priority) => {
    const benchmarkPriority = benchmarkByPriority.get(priority.priorityId);
    const benchmarkDirection =
      benchmarkPriority?.evidence.transformation.preferredDirection;
    if (benchmarkDirection !== priority.preferredDirection) {
      throw new MoveDecisionPreflightError(
        "priority_direction_mismatch",
        `Scenario direction does not match promoted evidence for ${priority.priorityId}.`,
        {
          priorityId: priority.priorityId,
          scenarioDirection: priority.preferredDirection,
          benchmarkDirection: benchmarkDirection ?? "missing",
        },
      );
    }
  });
};

const readAssumption = (
  scenario: ScenarioInput,
  descriptor: InputEvidenceDescriptor,
) => {
  const budget = scenario.finances[descriptor.side];
  if (descriptor.field === "retainedPropertyNet") {
    return scenario.finances.destination.retainedPropertyNet;
  }
  return budget[descriptor.field];
};

const buildInputEvidence = (scenario: ScenarioInput): ScenarioInputEvidence[] =>
  INPUT_EVIDENCE_DESCRIPTORS.flatMap((descriptor) => {
    const assumption = readAssumption(scenario, descriptor);
    if (assumption === null) {
      return [];
    }
    return [
      {
        kind: "scenario_input" as const,
        id: FINANCIAL_INPUT_EVIDENCE_IDS[descriptor.inputPath],
        inputPath: descriptor.inputPath,
        unit: "usd_cents" as const,
        value: assumption.monthlyCents,
        assumptionBasis: assumption.basis,
        plausibleRangeCents: assumption.plausibleRangeCents,
      },
    ];
  });

const inputEvidenceId = (inputPath: FinancialInputPath): string =>
  FINANCIAL_INPUT_EVIDENCE_IDS[inputPath];

const buildFinancialPosition = (
  scenario: ScenarioInput,
): DecisionProfile["financialPosition"] => {
  const origin = scenario.finances.origin;
  const destination = scenario.finances.destination;
  const originCushion = calculateMonthlyCushion(
    origin.takeHomeIncome.monthlyCents,
    origin.housingCost.monthlyCents,
    origin.recurringExpensesExcludingHousing.monthlyCents,
    0,
  );
  const destinationCushion = calculateMonthlyCushion(
    destination.takeHomeIncome.monthlyCents,
    destination.housingCost.monthlyCents,
    destination.recurringExpensesExcludingHousing.monthlyCents,
    destination.retainedPropertyNet.monthlyCents,
  );
  const originHousingBurden = calculateHousingBurdenBps(
    origin.housingCost.monthlyCents,
    origin.grossIncome?.monthlyCents ?? null,
  );
  const destinationHousingBurden = calculateHousingBurdenBps(
    destination.housingCost.monthlyCents,
    destination.grossIncome?.monthlyCents ?? null,
  );
  const cushionDelta = destinationCushion - originCushion;
  const materialityThreshold = calculateFinancialMaterialityCents(
    origin.takeHomeIncome.monthlyCents,
  );

  const blockerCodes = deriveFinancialBlockerCodes({
    destinationMonthlyCushionCents: destinationCushion,
    destinationHousingBurdenBps: destinationHousingBurden,
  });
  const riskCodes = deriveFinancialRiskCodes({
    targetTakeHomeBasis: destination.takeHomeIncome.basis,
    targetGrossIncomeCents: destination.grossIncome?.monthlyCents ?? null,
    targetGrossIncomeBasis: destination.grossIncome?.basis ?? null,
    targetHousingBasis: destination.housingCost.basis,
    targetExpensesBasis: destination.recurringExpensesExcludingHousing.basis,
    retainedPropertyNetBasis: destination.retainedPropertyNet.basis,
  });

  return {
    origin: {
      monthlyTakeHomeIncomeCents: origin.takeHomeIncome.monthlyCents,
      monthlyGrossIncomeCents: origin.grossIncome?.monthlyCents ?? null,
      monthlyHousingCostCents: origin.housingCost.monthlyCents,
      monthlyRecurringExpensesCents:
        origin.recurringExpensesExcludingHousing.monthlyCents,
      monthlyRetainedPropertyNetCents: 0,
      monthlyCushionCents: originCushion,
      housingBurdenBps: originHousingBurden,
      assumptionBasis: {
        takeHomeIncome: origin.takeHomeIncome.basis,
        grossIncome: origin.grossIncome?.basis ?? null,
        housingCost: origin.housingCost.basis,
        recurringExpenses: origin.recurringExpensesExcludingHousing.basis,
        retainedPropertyNet: "confirmed",
      },
    },
    destination: {
      monthlyTakeHomeIncomeCents: destination.takeHomeIncome.monthlyCents,
      monthlyGrossIncomeCents: destination.grossIncome?.monthlyCents ?? null,
      monthlyHousingCostCents: destination.housingCost.monthlyCents,
      monthlyRecurringExpensesCents:
        destination.recurringExpensesExcludingHousing.monthlyCents,
      monthlyRetainedPropertyNetCents:
        destination.retainedPropertyNet.monthlyCents,
      monthlyCushionCents: destinationCushion,
      housingBurdenBps: destinationHousingBurden,
      assumptionBasis: {
        takeHomeIncome: destination.takeHomeIncome.basis,
        grossIncome: destination.grossIncome?.basis ?? null,
        housingCost: destination.housingCost.basis,
        recurringExpenses: destination.recurringExpensesExcludingHousing.basis,
        retainedPropertyNet: destination.retainedPropertyNet.basis,
      },
    },
    change: {
      monthlyCushionDeltaCents: cushionDelta,
      cushionDeltaBpsOfOriginTakeHome:
        origin.takeHomeIncome.monthlyCents === 0
          ? null
          : roundHalfAwayFromZero(
              (cushionDelta * 10_000) / origin.takeHomeIncome.monthlyCents,
            ),
      housingBurdenDeltaBps:
        originHousingBurden === null || destinationHousingBurden === null
          ? null
          : destinationHousingBurden - originHousingBurden,
      materialityThresholdCents: materialityThreshold,
      classification: classifySignedChange(cushionDelta, materialityThreshold),
    },
    blockerCodes,
    riskCodes,
  };
};

const buildPriorityChanges = (
  scenario: ScenarioInput,
  benchmark: VerifiedBenchmarkComparison,
): PriorityChange[] => {
  const benchmarksByPriority = new Map(
    benchmark.priorities.map((priority) => [priority.priorityId, priority]),
  );

  return [...scenario.priorities]
    .sort((left, right) => compareStableIds(left.priorityId, right.priorityId))
    .map((priority): PriorityChange => {
      if (priority.weight === 0) {
        return {
          id: `priority.${priority.priorityId}`,
          priorityId: priority.priorityId,
          weight: 0,
          preferredDirection: priority.preferredDirection,
          availability: "unavailable",
          originUtilityBps: null,
          destinationUtilityBps: null,
          utilityDeltaBps: null,
          weightedContribution: null,
          materialityThresholdBps: null,
          classification: "unavailable",
          material: false,
          transformationId: "not_evaluated",
          transformationVersion: "0.0.0",
          evidenceRefs: [],
        };
      }

      const promoted = benchmarksByPriority.get(priority.priorityId);
      if (promoted === undefined) {
        throw new Error(
          `Verified benchmark is missing active priority ${priority.priorityId}.`,
        );
      }
      const available = promoted.evidence.quality.missingness === "complete";
      const utilityDelta =
        available &&
        promoted.originUtilityBps !== null &&
        promoted.destinationUtilityBps !== null
          ? promoted.destinationUtilityBps - promoted.originUtilityBps
          : null;
      const classification =
        utilityDelta === null
          ? "unavailable"
          : classifySignedChange(
              utilityDelta,
              promoted.materialityThresholdBps,
            );

      return {
        id: `priority.${priority.priorityId}`,
        priorityId: priority.priorityId,
        weight: priority.weight,
        preferredDirection: priority.preferredDirection,
        availability: available ? "available" : "unavailable",
        originUtilityBps: available ? promoted.originUtilityBps : null,
        destinationUtilityBps: available
          ? promoted.destinationUtilityBps
          : null,
        utilityDeltaBps: utilityDelta,
        weightedContribution:
          utilityDelta === null ? null : utilityDelta * priority.weight,
        materialityThresholdBps: promoted.materialityThresholdBps,
        classification,
        material:
          utilityDelta !== null &&
          isPriorityChangeMaterial(
            utilityDelta,
            priority.weight,
            promoted.materialityThresholdBps,
          ),
        transformationId: promoted.transformationId,
        transformationVersion: promoted.transformationVersion,
        evidenceRefs: [promoted.evidence.id],
      };
    });
};

const financialFinding = (classification: "improves" | "worsens"): Finding => ({
  id: `finding.financial_cushion_${classification}`,
  code: `financial_cushion_${classification}`,
  subject: {
    kind: "financial",
    metricId: FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.metricId,
  },
  material: true,
  evidenceRefs: [
    FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.evidenceId,
  ],
});

const priorityFinding = (change: PriorityChange): Finding => {
  const code = `${change.priorityId}_${change.classification}`;
  return {
    id: `finding.${code}`,
    code,
    subject: {
      kind: "priority",
      priorityId: change.priorityId,
    },
    material: true,
    evidenceRefs: change.evidenceRefs,
  };
};

const buildAssumptionFindings = (
  riskCodes: DecisionProfile["financialPosition"]["riskCodes"],
): Finding[] => {
  return riskCodes.flatMap((riskCode) => {
    const registration = getFinancialRiskFindingRegistration(riskCode);
    if (registration === undefined) {
      return [];
    }
    return [
      {
        id: `finding.${registration.code}`,
        code: registration.code,
        subject: {
          kind: "assumption" as const,
          inputPath: registration.inputPath,
        },
        material: true,
        evidenceRefs: [inputEvidenceId(registration.inputPath)],
      },
    ];
  });
};

type DerivedEvidenceRegistration =
  (typeof FINANCIAL_DERIVED_EVIDENCE_REGISTRY)[keyof typeof FINANCIAL_DERIVED_EVIDENCE_REGISTRY];

const buildDerivedEvidence = (
  registration: DerivedEvidenceRegistration,
  value: number,
  inputEvidenceByPath: ReadonlyMap<FinancialInputPath, ScenarioInputEvidence>,
): DerivedEvidence => {
  const inputRefs = registration.inputPaths.map((inputPath) => {
    const evidence = inputEvidenceByPath.get(inputPath);
    if (evidence === undefined) {
      throw new Error(
        `Cannot derive ${registration.metricId}: missing ${inputPath}.`,
      );
    }
    return evidence.id;
  });

  return {
    kind: "derived",
    id: registration.evidenceId,
    metricId: registration.metricId,
    unit: registration.unit,
    value,
    formula: {
      id: registration.metricId,
      version: DECISION_RULE_VERSION,
    },
    inputRefs: inputRefs.sort(compareStableIds),
  };
};

const buildProfile = (
  scenario: ScenarioInput,
  benchmark: VerifiedBenchmarkComparison,
): DecisionProfile => {
  const financialPosition = buildFinancialPosition(scenario);
  const priorityChanges = buildPriorityChanges(scenario, benchmark);
  const inputEvidence = buildInputEvidence(scenario);
  const inputEvidenceByPath = new Map(
    inputEvidence.map((evidence) => [evidence.inputPath, evidence]),
  );
  const derivedEvidence: DerivedEvidence[] = [
    buildDerivedEvidence(
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta,
      financialPosition.change.monthlyCushionDeltaCents,
      inputEvidenceByPath,
    ),
    buildDerivedEvidence(
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationMonthlyCushion,
      financialPosition.destination.monthlyCushionCents,
      inputEvidenceByPath,
    ),
  ];
  if (financialPosition.destination.housingBurdenBps !== null) {
    derivedEvidence.push(
      buildDerivedEvidence(
        FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationHousingBurden,
        financialPosition.destination.housingBurdenBps,
        inputEvidenceByPath,
      ),
    );
  }

  const materialPriorityChanges = priorityChanges.filter(
    (change) => change.material,
  );
  const criticalMissingChanges = priorityChanges.filter(
    (change) => change.weight >= 4 && change.availability === "unavailable",
  );
  const hasMaterialUpside =
    financialPosition.change.classification === "improves" ||
    materialPriorityChanges.some(
      (change) => change.classification === "improves",
    );
  const hasMaterialDownside =
    financialPosition.change.classification === "worsens" ||
    materialPriorityChanges.some(
      (change) => change.classification === "worsens",
    );
  const condition = selectDecisionCondition({
    hasFinancialBlocker: financialPosition.blockerCodes.length > 0,
    hasCriticalEvidenceGap: criticalMissingChanges.length > 0,
    hasMaterialUpside,
    hasMaterialDownside,
    hasFavorableInRangeBreakpoint: false,
  });

  const conditionEvidenceRefs = new Set<string>([
    FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.evidenceId,
  ]);
  materialPriorityChanges.forEach((change) =>
    change.evidenceRefs.forEach((reference) =>
      conditionEvidenceRefs.add(reference),
    ),
  );
  criticalMissingChanges.forEach((change) =>
    change.evidenceRefs.forEach((reference) =>
      conditionEvidenceRefs.add(reference),
    ),
  );
  financialPosition.blockerCodes.forEach((blockerCode) => {
    const registration = FINANCIAL_BLOCKER_FINDING_REGISTRY[blockerCode];
    conditionEvidenceRefs.add(registration.evidenceId);
    registration.inputPaths.forEach((inputPath) =>
      conditionEvidenceRefs.add(inputEvidenceId(inputPath)),
    );
  });

  const activeBenchmarksByPriority = new Map(
    benchmark.priorities.map((priority) => [priority.priorityId, priority]),
  );
  const activeEvidence = priorityChanges
    .filter((change) => change.weight > 0)
    .map((change) => activeBenchmarksByPriority.get(change.priorityId))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
  const activeGrades = activeEvidence.map(
    (entry) => entry.evidence.quality.grade.value,
  );
  const confidence = deriveConfidenceSelection({
    hasCriticalEvidenceGap: criticalMissingChanges.length > 0,
    activeQualityGrades: activeGrades,
  });

  const drivers: Finding[] = [];
  const tradeoffs: Finding[] = [];
  if (financialPosition.change.classification === "improves") {
    drivers.push(financialFinding("improves"));
  } else if (financialPosition.change.classification === "worsens") {
    tradeoffs.push(financialFinding("worsens"));
  }
  materialPriorityChanges.forEach((change) => {
    if (change.classification === "improves") {
      drivers.push(priorityFinding(change));
    } else if (change.classification === "worsens") {
      tradeoffs.push(priorityFinding(change));
    }
  });

  const blockers: Finding[] = financialPosition.blockerCodes.map(
    (blockerCode) => {
      const registration = FINANCIAL_BLOCKER_FINDING_REGISTRY[blockerCode];
      return {
        id: `finding.${blockerCode}`,
        code: blockerCode,
        subject: {
          kind: "financial",
          metricId: registration.metricId,
        },
        material: true,
        evidenceRefs: [
          registration.evidenceId,
          ...registration.inputPaths.map(inputEvidenceId),
        ].sort(compareStableIds),
      };
    },
  );

  const sortedConditionEvidenceRefs = [...conditionEvidenceRefs].sort(
    compareStableIds,
  );
  const nextSteps = deriveDecisionNextSteps({
    blockerCodes: financialPosition.blockerCodes,
    criticalMissingPriorities: criticalMissingChanges.map((change) => ({
      priorityId: change.priorityId,
      evidenceRefs: change.evidenceRefs,
    })),
    riskCodes: financialPosition.riskCodes,
    conditionEvidenceRefs: sortedConditionEvidenceRefs,
  }).map((nextStep) => ({
    ...nextStep,
    evidenceRefs: [...nextStep.evidenceRefs],
  }));

  const evidence: DecisionEvidence[] = [
    ...benchmark.priorities.map((priority) => priority.evidence),
    ...derivedEvidence,
    ...inputEvidence,
  ]
    .map((entry) => entry as DecisionEvidence)
    .sort((left, right) => compareStableIds(left.id, right.id));

  return {
    schemaVersion: DECISION_PROFILE_SCHEMA_VERSION,
    inputFingerprintSha256: fingerprintScenarioInput(scenario),
    scenario: {
      origin: benchmark.origin,
      destination: benchmark.destination,
      benchmarkSnapshot: {
        ...benchmark.snapshot,
        rawSnapshot: { ...benchmark.snapshot.rawSnapshot },
        sourceArtifacts: benchmark.snapshot.sourceArtifacts.map((artifact) => ({
          ...artifact,
        })),
        derivation: { ...benchmark.snapshot.derivation },
      },
      decisionRuleVersion: DECISION_RULE_VERSION,
    },
    financialPosition,
    priorityChanges,
    condition: {
      value: condition.value,
      ruleId: condition.ruleId,
      evidenceRefs: sortedConditionEvidenceRefs,
    },
    confidence: {
      level: confidence.level,
      ruleIds: [confidence.ruleId],
      evidenceRefs: activeEvidence
        .map((entry) => entry.evidence.id)
        .sort(compareStableIds),
      missingPriorityIds: priorityChanges
        .filter(
          (change) =>
            change.weight > 0 && change.availability === "unavailable",
        )
        .map((change) => change.priorityId)
        .sort(compareStableIds),
    },
    stability: {
      level: "not_evaluated",
      breakpointIds: [],
      reasonCodes: ["stability.not_evaluated"],
    },
    breakpoints: [],
    findings: {
      drivers: drivers.sort((left, right) =>
        compareStableIds(left.id, right.id),
      ),
      tradeoffs: tradeoffs.sort((left, right) =>
        compareStableIds(left.id, right.id),
      ),
      blockers: blockers.sort((left, right) =>
        compareStableIds(left.id, right.id),
      ),
      caveats: [],
      assumptions: buildAssumptionFindings(financialPosition.riskCodes).sort(
        (left, right) => compareStableIds(left.id, right.id),
      ),
      omittedPriorities: priorityChanges
        .filter(
          (change) =>
            change.weight === 0 || change.availability === "unavailable",
        )
        .map((change) => change.priorityId)
        .sort(compareStableIds),
    },
    nextSteps,
    evidence,
  };
};

/**
 * Produces the provider-free MoveWise Decision Profile from validated user
 * assumptions and a checksum-verified benchmark snapshot. Every returned
 * result crosses the full semantic trust boundary before reaching callers.
 */
const evaluateMoveDecisionWithStatus = (
  input: ScenarioInput,
  benchmark: VerifiedBenchmarkComparison,
  releaseStatus: "research_only" | "user_facing",
): VerifiedEvaluationResult | VerifiedResearchEvaluationResult => {
  if (benchmark.snapshot.admissionStatus !== releaseStatus) {
    throw new BenchmarkAdmissionError(
      releaseStatus,
      benchmark.snapshot.admissionStatus,
    );
  }
  const scenario = ScenarioInputSchema.parse(input);
  assertBenchmarkMatchesScenario(scenario, benchmark);
  const decisionProfile = buildProfile(scenario, benchmark);
  const canonicalBenchmark = {
    ...benchmark,
    priorities: [...benchmark.priorities].sort((left, right) =>
      compareStableIds(left.priorityId, right.priorityId),
    ),
  };

  return verifyEvaluationResult({
    schemaVersion: DECISION_PROFILE_SCHEMA_VERSION,
    resultMode: "deterministic",
    releaseStatus,
    scenarioInput: scenario,
    benchmarkComparison: canonicalBenchmark,
    decisionProfile,
  });
};

export const evaluateMoveDecision = (
  input: ScenarioInput,
  benchmark: VerifiedBenchmarkComparison,
): VerifiedEvaluationResult =>
  evaluateMoveDecisionWithStatus(
    input,
    benchmark,
    "user_facing",
  ) as VerifiedEvaluationResult;

export const evaluateResearchMoveDecision = (
  input: ScenarioInput,
  benchmark: VerifiedBenchmarkComparison,
): VerifiedResearchEvaluationResult =>
  evaluateMoveDecisionWithStatus(
    input,
    benchmark,
    "research_only",
  ) as VerifiedResearchEvaluationResult;
