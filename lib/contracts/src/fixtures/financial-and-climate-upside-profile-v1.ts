import type { MetricEvidence, ScenarioInputEvidence } from "../benchmark";
import type { DecisionProfile } from "../decision-profile";
import { PHASE0_BENCHMARK_SNAPSHOT_SHA256 } from "./financial-and-climate-upside-benchmark-v1";

const benchmarkEvidence = (
  values: Pick<
    MetricEvidence,
    | "id"
    | "metricId"
    | "definition"
    | "priorityId"
    | "unit"
    | "originValue"
    | "destinationValue"
    | "deltaValue"
  > & {
    transformationId: string;
    originUtilityBps: number;
    destinationUtilityBps: number;
    materialityThresholdBps: number;
  },
): MetricEvidence => ({
  kind: "benchmark_metric",
  id: values.id,
  metricId: values.metricId,
  definition: values.definition,
  priorityId: values.priorityId,
  unit: values.unit,
  originValue: values.originValue,
  destinationValue: values.destinationValue,
  deltaValue: values.deltaValue,
  source: {
    dataset: "Synthetic Phase 0 benchmark",
    publisher: "MoveWise",
    sourceUrl: "https://example.com/movewise/phase-0-benchmark",
    termsUrl: null,
  },
  observationPeriod: "Phase 0 synthetic fixture",
  releasedOn: "2026-07-17",
  verifiedOn: "2026-07-17",
  geographies: {
    origin: {
      kind: "cbsa",
      code: "00001",
      label: "River Metro",
      matchQuality: "exact",
    },
    destination: {
      kind: "cbsa",
      code: "00002",
      label: "Pine Metro",
      matchQuality: "exact",
    },
  },
  snapshotVersion: "1.0.0",
  snapshotSha256: PHASE0_BENCHMARK_SNAPSHOT_SHA256,
  transformation: {
    id: values.transformationId,
    version: "1.0.0",
    preferredDirection: "lower",
    outputs: {
      originUtilityBps: values.originUtilityBps,
      destinationUtilityBps: values.destinationUtilityBps,
      originUncertaintyBps: 0,
      destinationUncertaintyBps: 0,
    },
  },
  materialityPolicy: {
    utilityDeltaBps: values.materialityThresholdBps,
    rationale:
      "Synthetic Phase 0 materiality boundary for deterministic tests.",
  },
  quality: {
    freshness: "current",
    missingness: "complete",
    marginOfError: null,
    coverageBps: 10_000,
    grade: {
      value: "high",
      policyVersion: "1.0.0",
    },
  },
});

const inputEvidence = (
  id: string,
  inputPath: ScenarioInputEvidence["inputPath"],
  value: number,
  assumptionBasis: ScenarioInputEvidence["assumptionBasis"],
  plausibleRangeCents: ScenarioInputEvidence["plausibleRangeCents"] = null,
): ScenarioInputEvidence => ({
  kind: "scenario_input",
  id,
  inputPath,
  unit: "usd_cents",
  value,
  assumptionBasis,
  plausibleRangeCents,
});

export const financialAndClimateUpsideProfile = {
  schemaVersion: "1.0.0",
  inputFingerprintSha256:
    "690863de15801f840d768c90544d38573c1f27623aed038ddc0b12476a342b81",
  scenario: {
    origin: {
      slug: "fixture-river",
      cbsaCode: "00001",
      label: "River Metro",
      selectedPlace: {
        city: "River City",
        stateCode: "RV",
      },
    },
    destination: {
      slug: "fixture-pine",
      cbsaCode: "00002",
      label: "Pine Metro",
      selectedPlace: {
        city: "Pine City",
        stateCode: "PN",
      },
    },
    benchmarkSnapshot: {
      id: "fixture.phase0.2026-07-17",
      version: "1.0.0",
      sha256: PHASE0_BENCHMARK_SNAPSHOT_SHA256,
      delineationVersion: "fixture-2026",
      verifiedOn: "2026-07-17",
    },
    decisionRuleVersion: "1.0.0",
  },
  financialPosition: {
    origin: {
      monthlyTakeHomeIncomeCents: 500_000,
      monthlyGrossIncomeCents: 700_000,
      monthlyHousingCostCents: 150_000,
      monthlyRecurringExpensesCents: 230_000,
      monthlyRetainedPropertyNetCents: 0,
      monthlyCushionCents: 120_000,
      housingBurdenBps: 2_143,
      assumptionBasis: {
        takeHomeIncome: "confirmed",
        grossIncome: "confirmed",
        housingCost: "confirmed",
        recurringExpenses: "confirmed",
        retainedPropertyNet: "confirmed",
      },
    },
    destination: {
      monthlyTakeHomeIncomeCents: 560_000,
      monthlyGrossIncomeCents: 770_000,
      monthlyHousingCostCents: 170_000,
      monthlyRecurringExpensesCents: 240_000,
      monthlyRetainedPropertyNetCents: 0,
      monthlyCushionCents: 150_000,
      housingBurdenBps: 2_208,
      assumptionBasis: {
        takeHomeIncome: "confirmed",
        grossIncome: "confirmed",
        housingCost: "user_estimate",
        recurringExpenses: "user_estimate",
        retainedPropertyNet: "confirmed",
      },
    },
    change: {
      monthlyCushionDeltaCents: 30_000,
      cushionDeltaBpsOfOriginTakeHome: 600,
      housingBurdenDeltaBps: 65,
      materialityThresholdCents: 25_000,
      classification: "improves",
    },
    blockerCodes: [],
    riskCodes: [
      "target_housing_not_confirmed",
      "target_expenses_not_confirmed",
    ],
  },
  priorityChanges: [
    {
      id: "priority.climate_heat",
      priorityId: "climate_heat",
      weight: 5,
      preferredDirection: "lower",
      availability: "available",
      originUtilityBps: 3_000,
      destinationUtilityBps: 7_000,
      utilityDeltaBps: 4_000,
      weightedContribution: 20_000,
      materialityThresholdBps: 500,
      classification: "improves",
      material: true,
      transformationId: "climate_heat.utility",
      transformationVersion: "1.0.0",
      evidenceRefs: ["benchmark.climate_heat.fixture"],
    },
    {
      id: "priority.commute_time",
      priorityId: "commute_time",
      weight: 3,
      preferredDirection: "lower",
      availability: "available",
      originUtilityBps: 7_200,
      destinationUtilityBps: 6_900,
      utilityDeltaBps: -300,
      weightedContribution: -900,
      materialityThresholdBps: 500,
      classification: "similar",
      material: false,
      transformationId: "commute_time.utility",
      transformationVersion: "1.0.0",
      evidenceRefs: ["benchmark.commute_time.fixture"],
    },
  ],
  condition: {
    value: "worth_a_closer_look",
    ruleId: "condition.material_upside_without_material_downside",
    evidenceRefs: [
      "benchmark.climate_heat.fixture",
      "derived.financial.cushion_delta",
    ],
  },
  confidence: {
    level: "high",
    ruleIds: ["confidence.active_evidence_high"],
    evidenceRefs: [
      "benchmark.climate_heat.fixture",
      "benchmark.commute_time.fixture",
    ],
    missingPriorityIds: [],
  },
  stability: {
    level: "not_evaluated",
    breakpointIds: [],
    reasonCodes: ["stability.not_evaluated"],
  },
  breakpoints: [],
  findings: {
    drivers: [
      {
        id: "finding.financial_cushion_improves",
        code: "financial_cushion_improves",
        subject: {
          kind: "financial",
          metricId: "financial.monthly_cushion_delta",
        },
        material: true,
        evidenceRefs: ["derived.financial.cushion_delta"],
      },
      {
        id: "finding.climate_heat_improves",
        code: "climate_heat_improves",
        subject: {
          kind: "priority",
          priorityId: "climate_heat",
        },
        material: true,
        evidenceRefs: ["benchmark.climate_heat.fixture"],
      },
    ],
    tradeoffs: [],
    blockers: [],
    caveats: [],
    assumptions: [
      {
        id: "finding.target_housing_estimate",
        code: "target_housing_estimate",
        subject: {
          kind: "assumption",
          inputPath: "finances.destination.housingCost.monthlyCents",
        },
        material: true,
        evidenceRefs: ["input.destination.housing"],
      },
      {
        id: "finding.target_expenses_estimate",
        code: "target_expenses_estimate",
        subject: {
          kind: "assumption",
          inputPath:
            "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
        },
        material: true,
        evidenceRefs: ["input.destination.recurring"],
      },
    ],
    omittedPriorities: [],
  },
  evidence: [
    benchmarkEvidence({
      id: "benchmark.climate_heat.fixture",
      metricId: "climate.annual_hot_days",
      definition:
        "Annual count of synthetic days above the Phase 0 heat threshold.",
      priorityId: "climate_heat",
      unit: "days",
      originValue: 80,
      destinationValue: 40,
      deltaValue: -40,
      transformationId: "climate_heat.utility",
      originUtilityBps: 3_000,
      destinationUtilityBps: 7_000,
      materialityThresholdBps: 500,
    }),
    benchmarkEvidence({
      id: "benchmark.commute_time.fixture",
      metricId: "commute.mean_minutes",
      definition: "Synthetic mean one-way commute time in minutes.",
      priorityId: "commute_time",
      unit: "minutes",
      originValue: 28,
      destinationValue: 30,
      deltaValue: 2,
      transformationId: "commute_time.utility",
      originUtilityBps: 7_200,
      destinationUtilityBps: 6_900,
      materialityThresholdBps: 500,
    }),
    {
      kind: "derived",
      id: "derived.financial.cushion_delta",
      metricId: "financial.monthly_cushion_delta",
      unit: "usd_cents",
      value: 30_000,
      formula: {
        id: "financial.monthly_cushion_delta",
        version: "1.0.0",
      },
      inputRefs: [
        "input.destination.housing",
        "input.destination.recurring",
        "input.destination.retained",
        "input.destination.take_home",
        "input.origin.housing",
        "input.origin.recurring",
        "input.origin.take_home",
      ],
    },
    inputEvidence(
      "input.destination.gross",
      "finances.destination.grossIncome.monthlyCents",
      770_000,
      "confirmed",
    ),
    inputEvidence(
      "input.destination.housing",
      "finances.destination.housingCost.monthlyCents",
      170_000,
      "user_estimate",
      { min: 160_000, max: 180_000 },
    ),
    inputEvidence(
      "input.destination.recurring",
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
      240_000,
      "user_estimate",
      { min: 230_000, max: 250_000 },
    ),
    inputEvidence(
      "input.destination.retained",
      "finances.destination.retainedPropertyNet.monthlyCents",
      0,
      "confirmed",
    ),
    inputEvidence(
      "input.destination.take_home",
      "finances.destination.takeHomeIncome.monthlyCents",
      560_000,
      "confirmed",
    ),
    inputEvidence(
      "input.origin.gross",
      "finances.origin.grossIncome.monthlyCents",
      700_000,
      "confirmed",
    ),
    inputEvidence(
      "input.origin.housing",
      "finances.origin.housingCost.monthlyCents",
      150_000,
      "confirmed",
    ),
    inputEvidence(
      "input.origin.recurring",
      "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
      230_000,
      "confirmed",
    ),
    inputEvidence(
      "input.origin.take_home",
      "finances.origin.takeHomeIncome.monthlyCents",
      500_000,
      "confirmed",
    ),
  ],
} satisfies DecisionProfile;
