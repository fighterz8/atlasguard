import { z } from "zod/v4";

import {
  BenchmarkSnapshotRefSchema,
  DecisionEvidenceSchema,
  FinancialInputPathSchema,
  ResolvedMetroRefSchema,
  SIGNED_FINANCIAL_INPUT_PATH,
} from "./benchmark";
import type {
  DerivedEvidence,
  FinancialInputPath,
  ScenarioInputEvidence,
} from "./benchmark";
import { compareCodePoints } from "./canonical-json";
import {
  calculateFinancialMaterialityCents,
  calculateHousingBurdenBps,
  calculateMonthlyCushion,
  classifySignedChange,
  DECISION_RULE_VERSION,
  deriveConfidenceSelection,
  deriveDecisionNextSteps,
  deriveFinancialBlockerCodes,
  deriveFinancialRiskCodes,
  FINANCIAL_BLOCKER_CODES,
  FINANCIAL_BLOCKER_FINDING_REGISTRY,
  FINANCIAL_DERIVED_EVIDENCE_REGISTRY,
  FINANCIAL_INPUT_EVIDENCE_IDS,
  FINANCIAL_RISK_CODES,
  getFinancialRiskFindingRegistration,
  isPriorityChangeMaterial,
  roundHalfAwayFromZero,
  selectDecisionCondition,
} from "./decision-rules";
import {
  AssumptionBasisSchema,
  BasisPointsSchema,
  DECISION_PROFILE_SCHEMA_VERSION,
  MonthlyCentsSchema,
  NonnegativeBasisPointsSchema,
  PreferredDirectionSchema,
  PriorityIdSchema,
  PriorityWeightSchema,
  SafeIntegerSchema,
  Sha256Schema,
  SignedAssumptionBasisSchema,
  SignedBasisPointsSchema,
  StableIdSchema,
  VersionSchema,
} from "./primitives";

const arraysEqual = <T>(left: T[], right: T[]): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

export const ChangeClassificationSchema = z.enum([
  "improves",
  "similar",
  "worsens",
]);

export const DecisionConditionValueSchema = z.enum([
  "worth_a_closer_look",
  "promising_if",
  "meaningful_tradeoff",
  "high_financial_risk_under_assumptions",
]);

export const FinancialBlockerCodeSchema = z.enum(FINANCIAL_BLOCKER_CODES);

export const FinancialRiskCodeSchema = z.enum(FINANCIAL_RISK_CODES);

export const FinancialStateSchema = z
  .object({
    monthlyTakeHomeIncomeCents: MonthlyCentsSchema,
    monthlyGrossIncomeCents: MonthlyCentsSchema.positive().nullable(),
    monthlyHousingCostCents: MonthlyCentsSchema,
    monthlyRecurringExpensesCents: MonthlyCentsSchema,
    monthlyRetainedPropertyNetCents: SafeIntegerSchema,
    monthlyCushionCents: SafeIntegerSchema,
    housingBurdenBps: NonnegativeBasisPointsSchema.nullable(),
    assumptionBasis: z
      .object({
        takeHomeIncome: AssumptionBasisSchema,
        grossIncome: AssumptionBasisSchema.nullable(),
        housingCost: AssumptionBasisSchema,
        recurringExpenses: AssumptionBasisSchema,
        retainedPropertyNet: SignedAssumptionBasisSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((state, context) => {
    const expectedCushion = calculateMonthlyCushion(
      state.monthlyTakeHomeIncomeCents,
      state.monthlyHousingCostCents,
      state.monthlyRecurringExpensesCents,
      state.monthlyRetainedPropertyNetCents,
    );
    if (state.monthlyCushionCents !== expectedCushion) {
      context.addIssue({
        code: "custom",
        message: "Monthly cushion does not match the financial inputs.",
        path: ["monthlyCushionCents"],
      });
    }

    const expectedBurden = calculateHousingBurdenBps(
      state.monthlyHousingCostCents,
      state.monthlyGrossIncomeCents,
    );
    if (state.housingBurdenBps !== expectedBurden) {
      context.addIssue({
        code: "custom",
        message: "Housing burden does not match housing cost and gross income.",
        path: ["housingBurdenBps"],
      });
    }

    const grossValueIsPresent = state.monthlyGrossIncomeCents !== null;
    const grossBasisIsPresent = state.assumptionBasis.grossIncome !== null;
    if (grossValueIsPresent !== grossBasisIsPresent) {
      context.addIssue({
        code: "custom",
        message:
          "Gross-income value and assumption basis must be present together.",
        path: ["assumptionBasis", "grossIncome"],
      });
    }
  });

export const FinancialPositionSchema = z
  .object({
    origin: FinancialStateSchema,
    destination: FinancialStateSchema,
    change: z
      .object({
        monthlyCushionDeltaCents: SafeIntegerSchema,
        cushionDeltaBpsOfOriginTakeHome: SignedBasisPointsSchema.nullable(),
        housingBurdenDeltaBps: SignedBasisPointsSchema.nullable(),
        materialityThresholdCents: MonthlyCentsSchema,
        classification: ChangeClassificationSchema,
      })
      .strict(),
    blockerCodes: z.array(FinancialBlockerCodeSchema),
    riskCodes: z.array(FinancialRiskCodeSchema),
  })
  .strict()
  .superRefine((position, context) => {
    if (
      position.origin.monthlyRetainedPropertyNetCents !== 0 ||
      position.origin.assumptionBasis.retainedPropertyNet !== "confirmed"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "The origin retained-property adjustment must be a confirmed zero.",
        path: ["origin", "monthlyRetainedPropertyNetCents"],
      });
    }

    const expectedDelta =
      position.destination.monthlyCushionCents -
      position.origin.monthlyCushionCents;
    if (position.change.monthlyCushionDeltaCents !== expectedDelta) {
      context.addIssue({
        code: "custom",
        message: "Cushion delta must equal destination minus origin.",
        path: ["change", "monthlyCushionDeltaCents"],
      });
    }

    const expectedDeltaBps =
      position.origin.monthlyTakeHomeIncomeCents === 0
        ? null
        : roundHalfAwayFromZero(
            (expectedDelta * 10_000) /
              position.origin.monthlyTakeHomeIncomeCents,
          );
    if (position.change.cushionDeltaBpsOfOriginTakeHome !== expectedDeltaBps) {
      context.addIssue({
        code: "custom",
        message:
          "Cushion delta basis points do not match the financial inputs.",
        path: ["change", "cushionDeltaBpsOfOriginTakeHome"],
      });
    }

    const expectedBurdenDelta =
      position.origin.housingBurdenBps === null ||
      position.destination.housingBurdenBps === null
        ? null
        : position.destination.housingBurdenBps -
          position.origin.housingBurdenBps;
    if (position.change.housingBurdenDeltaBps !== expectedBurdenDelta) {
      context.addIssue({
        code: "custom",
        message: "Housing-burden delta must equal destination minus origin.",
        path: ["change", "housingBurdenDeltaBps"],
      });
    }

    const expectedMateriality = calculateFinancialMaterialityCents(
      position.origin.monthlyTakeHomeIncomeCents,
    );
    if (position.change.materialityThresholdCents !== expectedMateriality) {
      context.addIssue({
        code: "custom",
        message:
          "Financial materiality must be max($150, 5% of origin take-home).",
        path: ["change", "materialityThresholdCents"],
      });
    }

    const expectedClassification = classifySignedChange(
      expectedDelta,
      expectedMateriality,
    );
    if (position.change.classification !== expectedClassification) {
      context.addIssue({
        code: "custom",
        message:
          "Financial classification does not match delta and materiality.",
        path: ["change", "classification"],
      });
    }

    const expectedBlockers = deriveFinancialBlockerCodes({
      destinationMonthlyCushionCents: position.destination.monthlyCushionCents,
      destinationHousingBurdenBps: position.destination.housingBurdenBps,
    });
    if (!arraysEqual(position.blockerCodes, expectedBlockers)) {
      context.addIssue({
        code: "custom",
        message: "Financial blocker codes do not match the destination state.",
        path: ["blockerCodes"],
      });
    }

    const destinationBasis = position.destination.assumptionBasis;
    const expectedRisks = deriveFinancialRiskCodes({
      targetTakeHomeBasis: destinationBasis.takeHomeIncome,
      targetGrossIncomeCents: position.destination.monthlyGrossIncomeCents,
      targetGrossIncomeBasis: destinationBasis.grossIncome,
      targetHousingBasis: destinationBasis.housingCost,
      targetExpensesBasis: destinationBasis.recurringExpenses,
      retainedPropertyNetBasis: destinationBasis.retainedPropertyNet,
    });
    if (!arraysEqual(position.riskCodes, expectedRisks)) {
      context.addIssue({
        code: "custom",
        message:
          "Financial risk codes do not match destination assumption provenance.",
        path: ["riskCodes"],
      });
    }
  });

export const PriorityChangeSchema = z
  .object({
    id: StableIdSchema,
    priorityId: PriorityIdSchema,
    weight: PriorityWeightSchema,
    preferredDirection: PreferredDirectionSchema,
    availability: z.enum(["available", "unavailable"]),
    originUtilityBps: BasisPointsSchema.nullable(),
    destinationUtilityBps: BasisPointsSchema.nullable(),
    utilityDeltaBps: SignedBasisPointsSchema.nullable(),
    weightedContribution: SafeIntegerSchema.nullable(),
    materialityThresholdBps: BasisPointsSchema.min(1).nullable(),
    classification: z.enum(["improves", "similar", "worsens", "unavailable"]),
    material: z.boolean(),
    transformationId: StableIdSchema,
    transformationVersion: VersionSchema,
    evidenceRefs: z.array(StableIdSchema),
  })
  .strict()
  .superRefine((change, context) => {
    if (change.weight === 0) {
      if (
        change.availability !== "unavailable" ||
        change.originUtilityBps !== null ||
        change.destinationUtilityBps !== null ||
        change.utilityDeltaBps !== null ||
        change.weightedContribution !== null ||
        change.classification !== "unavailable" ||
        change.material ||
        change.evidenceRefs.length > 0 ||
        change.materialityThresholdBps !== null ||
        change.transformationId !== "not_evaluated" ||
        change.transformationVersion !== "0.0.0"
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Weight-zero priorities are excluded and must use the canonical not-evaluated representation.",
          path: ["weight"],
        });
      }
      return;
    }

    if (change.materialityThresholdBps === null) {
      context.addIssue({
        code: "custom",
        message: "Every active priority requires a materiality threshold.",
        path: ["materialityThresholdBps"],
      });
      return;
    }

    if (change.availability === "unavailable") {
      if (
        change.originUtilityBps !== null ||
        change.destinationUtilityBps !== null ||
        change.utilityDeltaBps !== null ||
        change.weightedContribution !== null
      ) {
        context.addIssue({
          code: "custom",
          message: "Unavailable priorities cannot contain computed values.",
          path: ["availability"],
        });
      }
      if (change.classification !== "unavailable" || change.material) {
        context.addIssue({
          code: "custom",
          message:
            "Unavailable priorities must be non-material and classified unavailable.",
          path: ["classification"],
        });
      }
      return;
    }

    if (
      change.originUtilityBps === null ||
      change.destinationUtilityBps === null ||
      change.utilityDeltaBps === null ||
      change.weightedContribution === null
    ) {
      context.addIssue({
        code: "custom",
        message: "Available priorities require every computed value.",
        path: ["availability"],
      });
      return;
    }

    const expectedDelta =
      change.destinationUtilityBps - change.originUtilityBps;
    if (change.utilityDeltaBps !== expectedDelta) {
      context.addIssue({
        code: "custom",
        message: "Priority utility delta must equal destination minus origin.",
        path: ["utilityDeltaBps"],
      });
    }

    const expectedContribution = expectedDelta * change.weight;
    if (change.weightedContribution !== expectedContribution) {
      context.addIssue({
        code: "custom",
        message: "Weighted contribution must equal utility delta times weight.",
        path: ["weightedContribution"],
      });
    }

    const expectedClassification = classifySignedChange(
      expectedDelta,
      change.materialityThresholdBps,
    );
    if (change.classification !== expectedClassification) {
      context.addIssue({
        code: "custom",
        message:
          "Priority classification does not match delta and materiality.",
        path: ["classification"],
      });
    }

    const expectedMaterial = isPriorityChangeMaterial(
      expectedDelta,
      change.weight,
      change.materialityThresholdBps,
    );
    if (change.material !== expectedMaterial) {
      context.addIssue({
        code: "custom",
        message:
          "Priority materiality does not match weight and classification.",
        path: ["material"],
      });
    }
  });

export const FindingSubjectSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("financial"),
      metricId: StableIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("priority"),
      priorityId: PriorityIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("assumption"),
      inputPath: FinancialInputPathSchema,
    })
    .strict(),
]);

export const FindingSchema = z
  .object({
    id: StableIdSchema,
    code: StableIdSchema,
    subject: FindingSubjectSchema,
    material: z.boolean(),
    evidenceRefs: z.array(StableIdSchema),
  })
  .strict()
  .transform((finding) => ({
    ...finding,
    evidenceRefs: [...finding.evidenceRefs].sort(compareCodePoints),
  }));

export const NextStepSchema = z
  .object({
    id: StableIdSchema.refine((id) => id.startsWith("next_step."), {
      message: "Next-step IDs must use the next_step. namespace.",
    }),
    code: StableIdSchema,
    evidenceRefs: z.array(StableIdSchema).min(1),
  })
  .strict()
  .transform((nextStep) => ({
    ...nextStep,
    evidenceRefs: [...nextStep.evidenceRefs].sort(compareCodePoints),
  }));

const BreakpointDestinationSchema = z.enum([
  "worth_a_closer_look",
  "meaningful_tradeoff",
  "high_financial_risk_under_assumptions",
]);

export const BreakpointSchema = z.discriminatedUnion("kind", [
  z
    .object({
      id: StableIdSchema,
      kind: z.literal("money"),
      inputPath: FinancialInputPathSchema.refine(
        (path) => path.startsWith("finances.destination."),
        "A decision breakpoint must target a destination assumption.",
      ),
      operator: z.enum(["at_or_below", "at_or_above"]),
      thresholdCents: SafeIntegerSchema,
      withinPlausibleRange: z.boolean(),
      changesConditionTo: BreakpointDestinationSchema,
      evidenceRefs: z.array(StableIdSchema).min(1),
    })
    .strict()
    .superRefine((breakpoint, context) => {
      if (
        breakpoint.inputPath !== SIGNED_FINANCIAL_INPUT_PATH &&
        breakpoint.thresholdCents < 0
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Income, housing, and expense breakpoints cannot be negative.",
          path: ["thresholdCents"],
        });
      }
    }),
  z
    .object({
      id: StableIdSchema,
      kind: z.literal("priority_weight"),
      priorityId: PriorityIdSchema,
      operator: z.enum(["at_or_below", "at_or_above"]),
      thresholdWeight: PriorityWeightSchema,
      withinPlausibleRange: z.boolean(),
      changesConditionTo: BreakpointDestinationSchema,
      evidenceRefs: z.array(StableIdSchema).min(1),
    })
    .strict(),
]);

export const DecisionProfileSchema = z
  .object({
    schemaVersion: z.literal(DECISION_PROFILE_SCHEMA_VERSION),
    inputFingerprintSha256: Sha256Schema,
    scenario: z
      .object({
        origin: ResolvedMetroRefSchema,
        destination: ResolvedMetroRefSchema,
        benchmarkSnapshot: BenchmarkSnapshotRefSchema,
        decisionRuleVersion: z.literal(DECISION_RULE_VERSION),
      })
      .strict(),
    financialPosition: FinancialPositionSchema,
    priorityChanges: z.array(PriorityChangeSchema),
    condition: z
      .object({
        value: DecisionConditionValueSchema,
        ruleId: StableIdSchema,
        evidenceRefs: z.array(StableIdSchema).min(1),
      })
      .strict(),
    confidence: z
      .object({
        level: z.enum(["high", "moderate", "limited"]),
        ruleIds: z.array(StableIdSchema).min(1),
        evidenceRefs: z.array(StableIdSchema),
        missingPriorityIds: z.array(PriorityIdSchema),
      })
      .strict(),
    stability: z
      .object({
        level: z.enum(["not_evaluated", "stable", "assumption_sensitive"]),
        breakpointIds: z.array(StableIdSchema),
        reasonCodes: z.array(StableIdSchema).min(1),
      })
      .strict(),
    breakpoints: z.array(BreakpointSchema),
    findings: z
      .object({
        drivers: z.array(FindingSchema),
        tradeoffs: z.array(FindingSchema),
        blockers: z.array(FindingSchema),
        caveats: z.array(FindingSchema),
        assumptions: z.array(FindingSchema),
        omittedPriorities: z.array(PriorityIdSchema),
      })
      .strict(),
    nextSteps: z.array(NextStepSchema).min(1),
    evidence: z.array(DecisionEvidenceSchema),
  })
  .strict()
  .superRefine((profile, context) => {
    const evidenceIds = profile.evidence.map((evidence) => evidence.id);
    const evidenceById = new Map(
      profile.evidence.map((evidence) => [evidence.id, evidence]),
    );
    const breakpointIds = profile.breakpoints.map(
      (breakpoint) => breakpoint.id,
    );
    const breakpointById = new Map(
      profile.breakpoints.map((breakpoint) => [breakpoint.id, breakpoint]),
    );
    const registeredDerivedMetrics = new Set<string>(
      Object.values(FINANCIAL_DERIVED_EVIDENCE_REGISTRY).map(
        (registration) => registration.metricId,
      ),
    );

    const reportDuplicate = (ids: string[], path: (string | number)[]) => {
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          message: "IDs must be unique.",
          path,
        });
      }
    };

    const reportMissingEvidence = (
      refs: string[],
      path: (string | number)[],
    ) => {
      refs.forEach((reference, index) => {
        if (!evidenceById.has(reference)) {
          context.addIssue({
            code: "custom",
            message: `Unknown evidence reference: ${reference}`,
            path: [...path, index],
          });
        }
      });
    };

    reportDuplicate(evidenceIds, ["evidence"]);
    reportDuplicate(
      profile.priorityChanges.map((change) => change.id),
      ["priorityChanges"],
    );
    reportDuplicate(
      profile.priorityChanges.map((change) => change.priorityId),
      ["priorityChanges"],
    );
    reportDuplicate(breakpointIds, ["breakpoints"]);
    reportDuplicate(
      profile.nextSteps.map((nextStep) => nextStep.id),
      ["nextSteps"],
    );

    if (evidenceIds.join("|") !== [...evidenceIds].sort().join("|")) {
      context.addIssue({
        code: "custom",
        message: "Evidence must be sorted by stable ID.",
        path: ["evidence"],
      });
    }
    const priorityIds = profile.priorityChanges.map((change) => change.id);
    if (priorityIds.join("|") !== [...priorityIds].sort().join("|")) {
      context.addIssue({
        code: "custom",
        message: "Priority changes must be sorted by stable ID.",
        path: ["priorityChanges"],
      });
    }

    profile.evidence.forEach((evidence, index) => {
      if (evidence.kind === "benchmark_metric") {
        if (
          evidence.snapshotVersion !==
            profile.scenario.benchmarkSnapshot.version ||
          evidence.snapshotSha256 !== profile.scenario.benchmarkSnapshot.sha256
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Metric evidence must belong to the profile benchmark snapshot.",
            path: ["evidence", index, "snapshotVersion"],
          });
        }

        const geographyPairs = [
          ["origin", evidence.geographies.origin, profile.scenario.origin],
          [
            "destination",
            evidence.geographies.destination,
            profile.scenario.destination,
          ],
        ] as const;
        geographyPairs.forEach(([side, geography, metro]) => {
          if (
            geography.matchQuality === "exact" &&
            (geography.kind !== "cbsa" || geography.code !== metro.cbsaCode)
          ) {
            context.addIssue({
              code: "custom",
              message: "Exact metric geography must match the profile CBSA.",
              path: ["evidence", index, "geographies", side],
            });
          }
        });
      }

      if (evidence.kind === "derived") {
        if (!registeredDerivedMetrics.has(evidence.metricId)) {
          context.addIssue({
            code: "custom",
            message:
              "Phase 0 permits only registered deterministic derived metrics.",
            path: ["evidence", index, "metricId"],
          });
        }
        reportMissingEvidence(evidence.inputRefs, [
          "evidence",
          index,
          "inputRefs",
        ]);
        evidence.inputRefs.forEach((reference, referenceIndex) => {
          if (evidenceById.get(reference)?.kind !== "scenario_input") {
            context.addIssue({
              code: "custom",
              message:
                "Registered financial evidence may reference only scenario inputs.",
              path: ["evidence", index, "inputRefs", referenceIndex],
            });
          }
        });
      }
    });

    type FinancialInputPath = z.infer<typeof FinancialInputPathSchema>;
    type ExpectedInput = {
      path: FinancialInputPath;
      value: number;
      basis: z.infer<typeof AssumptionBasisSchema>;
    };
    const expectedInputs: ExpectedInput[] = [
      {
        path: "finances.origin.takeHomeIncome.monthlyCents",
        value: profile.financialPosition.origin.monthlyTakeHomeIncomeCents,
        basis: profile.financialPosition.origin.assumptionBasis.takeHomeIncome,
      },
      {
        path: "finances.origin.housingCost.monthlyCents",
        value: profile.financialPosition.origin.monthlyHousingCostCents,
        basis: profile.financialPosition.origin.assumptionBasis.housingCost,
      },
      {
        path: "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
        value: profile.financialPosition.origin.monthlyRecurringExpensesCents,
        basis:
          profile.financialPosition.origin.assumptionBasis.recurringExpenses,
      },
      {
        path: "finances.destination.takeHomeIncome.monthlyCents",
        value: profile.financialPosition.destination.monthlyTakeHomeIncomeCents,
        basis:
          profile.financialPosition.destination.assumptionBasis.takeHomeIncome,
      },
      {
        path: "finances.destination.housingCost.monthlyCents",
        value: profile.financialPosition.destination.monthlyHousingCostCents,
        basis:
          profile.financialPosition.destination.assumptionBasis.housingCost,
      },
      {
        path: "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
        value:
          profile.financialPosition.destination.monthlyRecurringExpensesCents,
        basis:
          profile.financialPosition.destination.assumptionBasis
            .recurringExpenses,
      },
      {
        path: "finances.destination.retainedPropertyNet.monthlyCents",
        value:
          profile.financialPosition.destination.monthlyRetainedPropertyNetCents,
        basis:
          profile.financialPosition.destination.assumptionBasis
            .retainedPropertyNet,
      },
    ];
    if (profile.financialPosition.origin.monthlyGrossIncomeCents !== null) {
      expectedInputs.push({
        path: "finances.origin.grossIncome.monthlyCents",
        value: profile.financialPosition.origin.monthlyGrossIncomeCents,
        basis: profile.financialPosition.origin.assumptionBasis.grossIncome!,
      });
    }
    if (
      profile.financialPosition.destination.monthlyGrossIncomeCents !== null
    ) {
      expectedInputs.push({
        path: "finances.destination.grossIncome.monthlyCents",
        value: profile.financialPosition.destination.monthlyGrossIncomeCents,
        basis:
          profile.financialPosition.destination.assumptionBasis.grossIncome!,
      });
    }

    const expectedInputPaths = new Set(
      expectedInputs.map((input) => input.path),
    );
    const inputEvidenceIdsByPath = new Map<FinancialInputPath, string>();
    expectedInputs.forEach((expected) => {
      const matches = profile.evidence.filter(
        (evidence): evidence is ScenarioInputEvidence =>
          evidence.kind === "scenario_input" &&
          evidence.inputPath === expected.path,
      );
      if (matches.length !== 1) {
        context.addIssue({
          code: "custom",
          message: `Expected exactly one input-evidence record for ${expected.path}.`,
          path: ["evidence"],
        });
        return;
      }
      const evidence = matches[0];
      inputEvidenceIdsByPath.set(expected.path, evidence.id);
      if (
        evidence.id !== FINANCIAL_INPUT_EVIDENCE_IDS[expected.path] ||
        evidence.value !== expected.value ||
        evidence.assumptionBasis !== expected.basis
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Input evidence ID, value, and assumption basis must match the canonical financial input.",
          path: ["evidence", profile.evidence.indexOf(evidence)],
        });
      }
    });
    profile.evidence.forEach((evidence, index) => {
      if (
        evidence.kind === "scenario_input" &&
        !expectedInputPaths.has(evidence.inputPath)
      ) {
        context.addIssue({
          code: "custom",
          message: "Input evidence is not used by this Decision Profile.",
          path: ["evidence", index, "inputPath"],
        });
      }
    });

    const derivedExpectations = [
      {
        registration: FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta,
        value: profile.financialPosition.change.monthlyCushionDeltaCents,
      },
      {
        registration:
          FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationMonthlyCushion,
        value: profile.financialPosition.destination.monthlyCushionCents,
      },
      ...(profile.financialPosition.destination.housingBurdenBps === null
        ? []
        : [
            {
              registration:
                FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationHousingBurden,
              value: profile.financialPosition.destination.housingBurdenBps,
            },
          ]),
    ];
    const expectedDerivedMetricIds = new Set<string>(
      derivedExpectations.map(({ registration }) => registration.metricId),
    );
    const derivedEvidenceByMetricId = new Map<string, DerivedEvidence>();

    derivedExpectations.forEach(({ registration, value }) => {
      const matches = profile.evidence.filter(
        (evidence): evidence is DerivedEvidence =>
          evidence.kind === "derived" &&
          evidence.metricId === registration.metricId,
      );
      if (matches.length !== 1) {
        context.addIssue({
          code: "custom",
          message: `Decision Profile requires exactly one ${registration.metricId} evidence record.`,
          path: ["evidence"],
        });
        return;
      }

      const evidence = matches[0];
      derivedEvidenceByMetricId.set(registration.metricId, evidence);
      const expectedRefs = registration.inputPaths
        .map((path) => inputEvidenceIdsByPath.get(path))
        .filter((reference): reference is string => reference !== undefined)
        .sort(compareCodePoints);
      if (
        evidence.id !== registration.evidenceId ||
        evidence.unit !== registration.unit ||
        evidence.value !== value ||
        evidence.formula.id !== registration.metricId ||
        evidence.formula.version !== DECISION_RULE_VERSION ||
        !arraysEqual(evidence.inputRefs, expectedRefs) ||
        expectedRefs.length !== registration.inputPaths.length
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Derived financial evidence must match its registered ID, formula, value, unit, and complete input set.",
          path: ["evidence", profile.evidence.indexOf(evidence)],
        });
      }
    });

    profile.evidence.forEach((evidence, index) => {
      if (
        evidence.kind === "derived" &&
        !expectedDerivedMetricIds.has(evidence.metricId)
      ) {
        context.addIssue({
          code: "custom",
          message: "Derived evidence is not applicable to this profile.",
          path: ["evidence", index, "metricId"],
        });
      }
    });

    const cushionEvidence = derivedEvidenceByMetricId.get(
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.metricId,
    );

    reportMissingEvidence(profile.condition.evidenceRefs, [
      "condition",
      "evidenceRefs",
    ]);
    reportMissingEvidence(profile.confidence.evidenceRefs, [
      "confidence",
      "evidenceRefs",
    ]);
    profile.nextSteps.forEach((nextStep, index) =>
      reportMissingEvidence(nextStep.evidenceRefs, [
        "nextSteps",
        index,
        "evidenceRefs",
      ]),
    );

    const materialPriorityEvidence = new Set<string>();
    profile.priorityChanges.forEach((change, index) => {
      reportMissingEvidence(change.evidenceRefs, [
        "priorityChanges",
        index,
        "evidenceRefs",
      ]);
      if (change.weight > 0 && change.evidenceRefs.length === 0) {
        context.addIssue({
          code: "custom",
          message: "Every active priority requires benchmark evidence.",
          path: ["priorityChanges", index, "evidenceRefs"],
        });
      }
      if (change.weight > 0 && change.evidenceRefs.length !== 1) {
        context.addIssue({
          code: "custom",
          message:
            "Each active priority must bind to exactly one promoted benchmark entry.",
          path: ["priorityChanges", index, "evidenceRefs"],
        });
      }

      change.evidenceRefs.forEach((reference, referenceIndex) => {
        const evidence = evidenceById.get(reference);
        if (
          evidence?.kind !== "benchmark_metric" ||
          evidence.priorityId !== change.priorityId ||
          evidence.transformation.preferredDirection !==
            change.preferredDirection ||
          evidence.transformation.id !== change.transformationId ||
          evidence.transformation.version !== change.transformationVersion ||
          evidence.materialityPolicy.utilityDeltaBps !==
            change.materialityThresholdBps
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Priority evidence must match its metric, transformation, and policy.",
            path: ["priorityChanges", index, "evidenceRefs", referenceIndex],
          });
          return;
        }

        const expectedMissingness =
          change.availability === "available" ? "complete" : "unavailable";
        if (evidence.quality.missingness !== expectedMissingness) {
          context.addIssue({
            code: "custom",
            message:
              "Priority availability must agree with evidence missingness.",
            path: ["priorityChanges", index, "availability"],
          });
        }
        const outputs = evidence.transformation.outputs;
        if (
          outputs.originUtilityBps !== change.originUtilityBps ||
          outputs.destinationUtilityBps !== change.destinationUtilityBps
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Priority utilities must equal the checksum-bound transformation outputs.",
            path: ["priorityChanges", index, "evidenceRefs", referenceIndex],
          });
        }
        if (change.material) {
          materialPriorityEvidence.add(reference);
        }
      });
    });

    const expectedConfidenceEvidenceRefs = [
      ...new Set(
        profile.priorityChanges
          .filter((change) => change.weight > 0)
          .flatMap((change) => change.evidenceRefs),
      ),
    ].sort();
    if (
      !arraysEqual(
        profile.confidence.evidenceRefs,
        expectedConfidenceEvidenceRefs,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Confidence evidence must exactly cite every active priority benchmark.",
        path: ["confidence", "evidenceRefs"],
      });
    }

    const expectedConditionEvidence = new Set(materialPriorityEvidence);
    if (cushionEvidence !== undefined) {
      expectedConditionEvidence.add(cushionEvidence.id);
    }
    profile.priorityChanges
      .filter(
        (change) => change.weight >= 4 && change.availability === "unavailable",
      )
      .flatMap((change) => change.evidenceRefs)
      .forEach((reference) => expectedConditionEvidence.add(reference));
    profile.financialPosition.blockerCodes.forEach((blockerCode) => {
      const registration = FINANCIAL_BLOCKER_FINDING_REGISTRY[blockerCode];
      expectedConditionEvidence.add(registration.evidenceId);
      registration.inputPaths.forEach((inputPath) => {
        const reference = inputEvidenceIdsByPath.get(inputPath);
        if (reference !== undefined) {
          expectedConditionEvidence.add(reference);
        }
      });
    });
    const expectedConditionEvidenceRefs = [...expectedConditionEvidence].sort(
      compareCodePoints,
    );
    if (
      !arraysEqual(
        profile.condition.evidenceRefs,
        expectedConditionEvidenceRefs,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Condition evidence must exactly cover the financial, material-priority, and blocker signals.",
        path: ["condition", "evidenceRefs"],
      });
    }

    profile.breakpoints.forEach((breakpoint, index) => {
      reportMissingEvidence(breakpoint.evidenceRefs, [
        "breakpoints",
        index,
        "evidenceRefs",
      ]);

      if (breakpoint.kind === "money") {
        const matchingInputs = breakpoint.evidenceRefs
          .map((reference) => evidenceById.get(reference))
          .filter(
            (evidence): evidence is ScenarioInputEvidence =>
              evidence?.kind === "scenario_input" &&
              evidence.inputPath === breakpoint.inputPath,
          );
        if (matchingInputs.length !== 1) {
          context.addIssue({
            code: "custom",
            message: "Money breakpoint must cite its exact destination input.",
            path: ["breakpoints", index, "evidenceRefs"],
          });
        } else {
          const range = matchingInputs[0].plausibleRangeCents;
          const expectedWithinRange =
            range !== null &&
            breakpoint.thresholdCents >= range.min &&
            breakpoint.thresholdCents <= range.max;
          if (breakpoint.withinPlausibleRange !== expectedWithinRange) {
            context.addIssue({
              code: "custom",
              message:
                "Breakpoint range status must match the cited input range.",
              path: ["breakpoints", index, "withinPlausibleRange"],
            });
          }
        }

        breakpoint.evidenceRefs.forEach((reference, referenceIndex) => {
          const evidence = evidenceById.get(reference);
          const relevant =
            (evidence?.kind === "scenario_input" &&
              evidence.inputPath === breakpoint.inputPath) ||
            (evidence?.kind === "derived" &&
              evidence.metricId.startsWith("financial."));
          if (evidence && !relevant) {
            context.addIssue({
              code: "custom",
              message:
                "Money breakpoint evidence must be financial and input-specific.",
              path: ["breakpoints", index, "evidenceRefs", referenceIndex],
            });
          }
        });
      } else {
        const hasMatchingPriority = breakpoint.evidenceRefs.some(
          (reference) => {
            const evidence = evidenceById.get(reference);
            return (
              evidence?.kind === "benchmark_metric" &&
              evidence.priorityId === breakpoint.priorityId
            );
          },
        );
        if (!hasMatchingPriority || !breakpoint.withinPlausibleRange) {
          context.addIssue({
            code: "custom",
            message:
              "Priority breakpoint must cite its metric and a valid 0-5 weight.",
            path: ["breakpoints", index, "evidenceRefs"],
          });
        }
      }
    });

    const findingGroups = [
      ["drivers", profile.findings.drivers],
      ["tradeoffs", profile.findings.tradeoffs],
      ["blockers", profile.findings.blockers],
      ["caveats", profile.findings.caveats],
      ["assumptions", profile.findings.assumptions],
    ] as const;
    const findingIds = findingGroups.flatMap(([, findings]) =>
      findings.map((finding) => finding.id),
    );
    reportDuplicate(findingIds, ["findings"]);
    findingGroups.forEach(([groupName, findings]) =>
      findings.forEach((finding, findingIndex) => {
        reportMissingEvidence(finding.evidenceRefs, [
          "findings",
          groupName,
          findingIndex,
          "evidenceRefs",
        ]);
        if (finding.material && finding.evidenceRefs.length === 0) {
          context.addIssue({
            code: "custom",
            message: "Material findings require evidence.",
            path: ["findings", groupName, findingIndex, "evidenceRefs"],
          });
        }
        if (!finding.material) {
          context.addIssue({
            code: "custom",
            message:
              "Phase 0 findings must be selected by a registered material rule.",
            path: ["findings", groupName, findingIndex, "material"],
          });
        }

        finding.evidenceRefs.forEach((reference, referenceIndex) => {
          const evidence = evidenceById.get(reference);
          const financialMetricId =
            finding.subject.kind === "financial"
              ? finding.subject.metricId
              : null;
          const matchingDerivedEvidence =
            financialMetricId !== null
              ? profile.evidence.find(
                  (candidate): candidate is DerivedEvidence =>
                    candidate.kind === "derived" &&
                    candidate.metricId === financialMetricId,
                )
              : undefined;
          const subjectMatches =
            (finding.subject.kind === "financial" &&
              matchingDerivedEvidence !== undefined &&
              (evidence?.id === matchingDerivedEvidence.id ||
                matchingDerivedEvidence.inputRefs.includes(reference))) ||
            (finding.subject.kind === "priority" &&
              evidence?.kind === "benchmark_metric" &&
              evidence.priorityId === finding.subject.priorityId) ||
            (finding.subject.kind === "assumption" &&
              evidence?.kind === "scenario_input" &&
              evidence.inputPath === finding.subject.inputPath);

          if (evidence && !subjectMatches) {
            context.addIssue({
              code: "custom",
              message: "Finding evidence must match the typed finding subject.",
              path: [
                "findings",
                groupName,
                findingIndex,
                "evidenceRefs",
                referenceIndex,
              ],
            });
          }
        });
      }),
    );

    const hasMaterialFinding = (
      group: Finding[],
      predicate: (finding: Finding) => boolean,
    ) => group.some((finding) => finding.material && predicate(finding));

    const financialClassification =
      profile.financialPosition.change.classification;
    if (
      financialClassification === "improves" &&
      !hasMaterialFinding(
        profile.findings.drivers,
        (finding) =>
          finding.subject.kind === "financial" &&
          finding.subject.metricId === "financial.monthly_cushion_delta",
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "A material financial improvement requires a driver finding.",
        path: ["findings", "drivers"],
      });
    }
    if (
      financialClassification === "worsens" &&
      !hasMaterialFinding(
        profile.findings.tradeoffs,
        (finding) =>
          finding.subject.kind === "financial" &&
          finding.subject.metricId === "financial.monthly_cushion_delta",
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "A material financial decline requires a tradeoff finding.",
        path: ["findings", "tradeoffs"],
      });
    }

    profile.priorityChanges.forEach((change) => {
      if (!change.material || change.classification === "similar") return;
      const group =
        change.classification === "improves"
          ? profile.findings.drivers
          : profile.findings.tradeoffs;
      const groupName =
        change.classification === "improves" ? "drivers" : "tradeoffs";
      if (
        !hasMaterialFinding(
          group,
          (finding) =>
            finding.subject.kind === "priority" &&
            finding.subject.priorityId === change.priorityId,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Every material priority signal requires a finding.",
          path: ["findings", groupName],
        });
      }
    });

    profile.financialPosition.riskCodes.forEach((riskCode) => {
      const inputPath =
        getFinancialRiskFindingRegistration(riskCode)?.inputPath;
      if (inputPath === undefined || !inputEvidenceIdsByPath.has(inputPath)) {
        return;
      }
      if (
        !hasMaterialFinding(
          profile.findings.assumptions,
          (finding) =>
            finding.subject.kind === "assumption" &&
            finding.subject.inputPath === inputPath,
        )
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Every unconfirmed financial assumption requires an assumption finding.",
          path: ["findings", "assumptions"],
        });
      }
    });

    const findingSubjectKey = (finding: Finding): string => {
      if (finding.subject.kind === "financial") {
        return `financial:${finding.subject.metricId}`;
      }
      if (finding.subject.kind === "priority") {
        return `priority:${finding.subject.priorityId}`;
      }
      return `assumption:${finding.subject.inputPath}`;
    };
    const materialFindingKey = (finding: Finding): string =>
      `${finding.id}|${finding.code}|${findingSubjectKey(finding)}|${finding.evidenceRefs.join(",")}`;
    const compareExpectedMaterialFindings = (
      groupName: "drivers" | "tradeoffs" | "assumptions",
      expectedKeys: string[],
    ) => {
      const actualKeys = profile.findings[groupName]
        .filter((finding) => finding.material)
        .map(materialFindingKey)
        .sort();
      if (!arraysEqual(actualKeys, [...expectedKeys].sort())) {
        context.addIssue({
          code: "custom",
          message:
            "Material findings must exactly match the deterministic signal selection.",
          path: ["findings", groupName],
        });
      }
    };

    const expectedDriverKeys: string[] = [];
    const expectedTradeoffKeys: string[] = [];
    if (financialClassification === "improves") {
      expectedDriverKeys.push(
        `finding.financial_cushion_improves|financial_cushion_improves|financial:financial.monthly_cushion_delta|${FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.evidenceId}`,
      );
    } else if (financialClassification === "worsens") {
      expectedTradeoffKeys.push(
        `finding.financial_cushion_worsens|financial_cushion_worsens|financial:financial.monthly_cushion_delta|${FINANCIAL_DERIVED_EVIDENCE_REGISTRY.monthlyCushionDelta.evidenceId}`,
      );
    }
    profile.priorityChanges.forEach((change) => {
      if (!change.material || change.classification === "similar") return;
      const code = `${change.priorityId}_${change.classification}`;
      const key = `finding.${code}|${code}|priority:${change.priorityId}|${change.evidenceRefs.join(",")}`;
      if (change.classification === "improves") {
        expectedDriverKeys.push(key);
      } else if (change.classification === "worsens") {
        expectedTradeoffKeys.push(key);
      }
    });

    const expectedAssumptionKeys = profile.financialPosition.riskCodes.flatMap(
      (riskCode) => {
        const registration = getFinancialRiskFindingRegistration(riskCode);
        const inputPath = registration?.inputPath;
        const code = registration?.code;
        if (
          inputPath === undefined ||
          code === undefined ||
          !inputEvidenceIdsByPath.has(inputPath)
        ) {
          return [];
        }
        const evidenceId = inputEvidenceIdsByPath.get(inputPath);
        return evidenceId === undefined
          ? []
          : [`finding.${code}|${code}|assumption:${inputPath}|${evidenceId}`];
      },
    );
    compareExpectedMaterialFindings("drivers", expectedDriverKeys);
    compareExpectedMaterialFindings("tradeoffs", expectedTradeoffKeys);
    compareExpectedMaterialFindings("assumptions", expectedAssumptionKeys);

    const expectedBlockerKeys = profile.financialPosition.blockerCodes
      .map((blockerCode) => {
        const registration = FINANCIAL_BLOCKER_FINDING_REGISTRY[blockerCode];
        const evidenceRefs = [
          registration.evidenceId,
          ...registration.inputPaths.map(
            (inputPath) => FINANCIAL_INPUT_EVIDENCE_IDS[inputPath],
          ),
        ].sort(compareCodePoints);
        return `finding.${blockerCode}|${blockerCode}|financial:${registration.metricId}|${evidenceRefs.join(",")}|true`;
      })
      .sort();
    const actualBlockerKeys = profile.findings.blockers
      .map(
        (finding) =>
          `${materialFindingKey(finding)}|${String(finding.material)}`,
      )
      .sort();
    if (!arraysEqual(actualBlockerKeys, expectedBlockerKeys)) {
      context.addIssue({
        code: "custom",
        message:
          "Blocker findings must exactly match the deterministic financial blocker set.",
        path: ["findings", "blockers"],
      });
    }
    if (profile.findings.caveats.length > 0) {
      context.addIssue({
        code: "custom",
        message:
          "Phase 0 does not accept free-standing caveats before the caveat registry exists.",
        path: ["findings", "caveats"],
      });
    }

    profile.stability.breakpointIds.forEach((reference, index) => {
      const breakpoint = breakpointById.get(reference);
      if (!breakpoint) {
        context.addIssue({
          code: "custom",
          message: `Unknown breakpoint reference: ${reference}`,
          path: ["stability", "breakpointIds", index],
        });
      }
    });

    const inRangeBreakpointIds = profile.breakpoints
      .filter((breakpoint) => breakpoint.withinPlausibleRange)
      .map((breakpoint) => breakpoint.id)
      .sort();
    const sensitivityInputPaths = new Set<FinancialInputPath>([
      "finances.destination.takeHomeIncome.monthlyCents",
      "finances.destination.housingCost.monthlyCents",
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
    ]);
    const hasSensitivityRange = profile.evidence.some(
      (evidence) =>
        evidence.kind === "scenario_input" &&
        sensitivityInputPaths.has(evidence.inputPath) &&
        evidence.plausibleRangeCents !== null,
    );
    if (
      profile.stability.level === "not_evaluated" &&
      (profile.stability.breakpointIds.length > 0 ||
        hasSensitivityRange ||
        !arraysEqual(
          profile.stability.reasonCodes,
          profile.breakpoints.length === 0
            ? ["stability.not_evaluated"]
            : ["stability.no_plausible_ranges"],
        ))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Not-evaluated stability requires no plausible ranges, no cited breakpoints, and its canonical reason.",
        path: ["stability"],
      });
    }
    if (
      profile.stability.level !== "not_evaluated" &&
      !arraysEqual(profile.stability.breakpointIds, inRangeBreakpointIds)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Stability must cite every in-range decision-changing breakpoint.",
        path: ["stability", "breakpointIds"],
      });
    }

    const expectedEvaluatedStability =
      inRangeBreakpointIds.length === 0 ? "stable" : "assumption_sensitive";
    if (
      profile.stability.level !== "not_evaluated" &&
      profile.stability.level !== expectedEvaluatedStability
    ) {
      context.addIssue({
        code: "custom",
        message: "Stability level must reflect the in-range breakpoint set.",
        path: ["stability", "level"],
      });
    }
    if (
      profile.stability.level !== "not_evaluated" &&
      (!hasSensitivityRange ||
        !arraysEqual(
          profile.stability.reasonCodes,
          expectedEvaluatedStability === "stable"
            ? ["stability.no_in_range_condition_change"]
            : ["stability.in_range_condition_change"],
        ))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Evaluated stability requires a plausible range and its canonical reason.",
        path: ["stability", "reasonCodes"],
      });
    }

    if (profile.condition.value === "promising_if") {
      if (
        profile.stability.level !== "assumption_sensitive" ||
        profile.stability.breakpointIds.length === 0
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Promising-if requires an in-range decision-changing breakpoint.",
          path: ["condition", "value"],
        });
      }
    }

    const hasFinancialBlocker =
      profile.financialPosition.blockerCodes.length > 0;
    const hasCriticalEvidenceGap = profile.priorityChanges.some(
      (change) => change.weight >= 4 && change.availability === "unavailable",
    );
    const hasMaterialUpside =
      profile.financialPosition.change.classification === "improves" ||
      profile.priorityChanges.some(
        (change) => change.material && change.classification === "improves",
      );
    const hasMaterialDownside =
      profile.financialPosition.change.classification === "worsens" ||
      profile.priorityChanges.some(
        (change) => change.material && change.classification === "worsens",
      );
    const hasFavorableInRangeBreakpoint = profile.breakpoints.some(
      (breakpoint) =>
        breakpoint.withinPlausibleRange &&
        breakpoint.changesConditionTo === "worth_a_closer_look",
    );
    const expectedCondition = selectDecisionCondition({
      hasFinancialBlocker,
      hasCriticalEvidenceGap,
      hasMaterialUpside,
      hasMaterialDownside,
      hasFavorableInRangeBreakpoint,
    });
    if (
      profile.condition.value !== expectedCondition.value ||
      profile.condition.ruleId !== expectedCondition.ruleId
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Condition value and rule must match the exhaustive decision table.",
        path: ["condition"],
      });
    }

    const expectedNextSteps = deriveDecisionNextSteps({
      blockerCodes: profile.financialPosition.blockerCodes,
      criticalMissingPriorities: profile.priorityChanges
        .filter(
          (change) =>
            change.weight >= 4 && change.availability === "unavailable",
        )
        .map((change) => ({
          priorityId: change.priorityId,
          evidenceRefs: change.evidenceRefs,
        })),
      riskCodes: profile.financialPosition.riskCodes,
      conditionEvidenceRefs: profile.condition.evidenceRefs,
    });
    const nextStepKey = (nextStep: {
      id: string;
      code: string;
      evidenceRefs: readonly string[];
    }): string =>
      `${nextStep.id}|${nextStep.code}|${[...nextStep.evidenceRefs].sort(compareCodePoints).join(",")}`;
    const actualNextStepKeys = profile.nextSteps
      .map(nextStepKey)
      .sort(compareCodePoints);
    const expectedNextStepKeys = expectedNextSteps
      .map(nextStepKey)
      .sort(compareCodePoints);
    if (!arraysEqual(actualNextStepKeys, expectedNextStepKeys)) {
      context.addIssue({
        code: "custom",
        message:
          "Next steps must exactly match the deterministic blocker, evidence-gap, assumption, or review rule.",
        path: ["nextSteps"],
      });
    }

    profile.breakpoints.forEach((breakpoint, index) => {
      if (breakpoint.changesConditionTo === profile.condition.value) {
        context.addIssue({
          code: "custom",
          message: "A breakpoint must change the current condition.",
          path: ["breakpoints", index, "changesConditionTo"],
        });
      }
    });

    const missingPriorities = profile.priorityChanges
      .filter(
        (change) => change.weight > 0 && change.availability === "unavailable",
      )
      .map((change) => change.priorityId)
      .sort();
    const omittedPriorities = profile.priorityChanges
      .filter(
        (change) =>
          change.weight === 0 || change.availability === "unavailable",
      )
      .map((change) => change.priorityId)
      .sort();

    if (
      !arraysEqual(profile.confidence.missingPriorityIds, missingPriorities)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Missing priority IDs must exactly match unavailable active priorities.",
        path: ["confidence", "missingPriorityIds"],
      });
    }
    if (!arraysEqual(profile.findings.omittedPriorities, omittedPriorities)) {
      context.addIssue({
        code: "custom",
        message:
          "Omitted priorities must include every excluded or unavailable priority.",
        path: ["findings", "omittedPriorities"],
      });
    }

    if (hasCriticalEvidenceGap && profile.confidence.level !== "limited") {
      context.addIssue({
        code: "custom",
        message: "A missing high-weight priority limits evidence confidence.",
        path: ["confidence", "level"],
      });
    }
    if (missingPriorities.length > 0 && profile.confidence.level === "high") {
      context.addIssue({
        code: "custom",
        message:
          "Evidence confidence cannot be high when active priorities are unavailable.",
        path: ["confidence", "level"],
      });
    }

    const activeQualityGrades = profile.priorityChanges
      .filter((change) => change.weight > 0)
      .flatMap((change) => change.evidenceRefs)
      .map((reference) => evidenceById.get(reference))
      .filter((evidence) => evidence?.kind === "benchmark_metric")
      .map((evidence) => evidence.quality.grade.value);
    const expectedConfidence = deriveConfidenceSelection({
      hasCriticalEvidenceGap,
      activeQualityGrades,
    });
    if (
      profile.confidence.level !== expectedConfidence.level ||
      !arraysEqual(profile.confidence.ruleIds, [expectedConfidence.ruleId])
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Confidence level and rule must aggregate the promoted evidence grades.",
        path: ["confidence"],
      });
    }

    if (profile.confidence.level === "high") {
      const activeEvidence = profile.priorityChanges
        .filter((change) => change.weight > 0)
        .flatMap((change) => change.evidenceRefs)
        .map((reference) => evidenceById.get(reference))
        .filter((evidence) => evidence?.kind === "benchmark_metric");
      const hasQualifiedEvidence = activeEvidence.every(
        (evidence) =>
          evidence.quality.freshness === "current" &&
          evidence.quality.missingness === "complete" &&
          evidence.geographies.origin.matchQuality === "exact" &&
          evidence.geographies.destination.matchQuality === "exact",
      );
      if (!hasQualifiedEvidence) {
        context.addIssue({
          code: "custom",
          message:
            "High confidence requires current, complete, exact-geography evidence.",
          path: ["confidence", "level"],
        });
      }
    }
  })
  .transform((profile) => ({
    ...profile,
    breakpoints: [...profile.breakpoints].sort((left, right) =>
      compareCodePoints(left.id, right.id),
    ),
    findings: {
      ...profile.findings,
      drivers: [...profile.findings.drivers].sort((left, right) =>
        compareCodePoints(left.id, right.id),
      ),
      tradeoffs: [...profile.findings.tradeoffs].sort((left, right) =>
        compareCodePoints(left.id, right.id),
      ),
      blockers: [...profile.findings.blockers].sort((left, right) =>
        compareCodePoints(left.id, right.id),
      ),
      caveats: [...profile.findings.caveats].sort((left, right) =>
        compareCodePoints(left.id, right.id),
      ),
      assumptions: [...profile.findings.assumptions].sort((left, right) =>
        compareCodePoints(left.id, right.id),
      ),
      omittedPriorities: [...profile.findings.omittedPriorities].sort(
        compareCodePoints,
      ),
    },
    nextSteps: [...profile.nextSteps].sort((left, right) =>
      compareCodePoints(left.id, right.id),
    ),
  }));

export type ChangeClassification = z.infer<typeof ChangeClassificationSchema>;
export type DecisionConditionValue = z.infer<
  typeof DecisionConditionValueSchema
>;
export type FinancialState = z.infer<typeof FinancialStateSchema>;
export type FinancialPosition = z.infer<typeof FinancialPositionSchema>;
export type PriorityChange = z.infer<typeof PriorityChangeSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type NextStep = z.infer<typeof NextStepSchema>;
export type Breakpoint = z.infer<typeof BreakpointSchema>;
export type DecisionProfile = z.infer<typeof DecisionProfileSchema>;
