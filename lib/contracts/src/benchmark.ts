import { z } from "zod/v4";

import { compareCodePoints, sha256Hex, sortJsonKeys } from "./canonical-json";
import {
  AssumptionBasisSchema,
  BasisPointsSchema,
  IsoDateSchema,
  MAX_MONTHLY_CENTS,
  MetroSlugSchema,
  PreferredDirectionSchema,
  PriorityIdSchema,
  SafeIntegerSchema,
  Sha256Schema,
  StableIdSchema,
  VersionSchema,
} from "./primitives";
import { applyRegisteredUtilityTransform } from "./utility-transforms";

export const ResolvedMetroRefSchema = z
  .object({
    slug: MetroSlugSchema,
    cbsaCode: z.string().regex(/^\d{5}$/),
    label: z.string().trim().min(1).max(160),
    selectedPlace: z
      .object({
        city: z.string().trim().min(1).max(120),
        stateCode: z.string().regex(/^[A-Z]{2}$/),
      })
      .strict(),
    selectedPlaceMapping: z
      .object({
        method: z.enum(["official_cbsa_title_match", "synthetic_fixture"]),
        sourceArtifactId: StableIdSchema,
        sourceUrl: z.string().url(),
        sourceArtifactSha256: Sha256Schema,
        verifiedOn: IsoDateSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((metro, context) => {
    if (
      metro.selectedPlaceMapping.method === "official_cbsa_title_match" &&
      !metro.label.includes(metro.selectedPlace.city)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "An official CBSA-title mapping must name the selected city in the CBSA title.",
        path: ["selectedPlaceMapping", "method"],
      });
    }
  });

export const BenchmarkSnapshotRefSchema = z
  .object({
    id: StableIdSchema,
    version: VersionSchema,
    sha256: Sha256Schema,
    admissionStatus: z.enum(["research_only", "user_facing"]),
    rawSnapshot: z
      .object({
        id: StableIdSchema,
        sha256: Sha256Schema,
      })
      .strict(),
    sourceArtifacts: z
      .array(
        z
          .object({
            id: StableIdSchema,
            sourceUrl: z.string().url(),
            sha256: Sha256Schema,
          })
          .strict(),
      )
      .min(1),
    derivation: z
      .object({
        id: StableIdSchema,
        version: VersionSchema,
      })
      .strict(),
    delineationVersion: z.string().trim().min(1).max(80),
    verifiedOn: IsoDateSchema,
  })
  .strict()
  .superRefine((snapshot, context) => {
    const sourceIds = new Set<string>();
    snapshot.sourceArtifacts.forEach((artifact, index) => {
      if (sourceIds.has(artifact.id)) {
        context.addIssue({
          code: "custom",
          message: "Snapshot source-artifact IDs must be unique.",
          path: ["sourceArtifacts", index, "id"],
        });
      }
      sourceIds.add(artifact.id);
    });
  });

export const MetricUnitSchema = z.enum([
  "basis_points",
  "count",
  "days",
  "degrees_fahrenheit",
  "index",
  "inches",
  "minutes",
  "percent",
  "usd_cents",
]);

export const BenchmarkGeographySchema = z
  .object({
    kind: z.enum(["cbsa", "county", "place", "state", "station", "national"]),
    code: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(160),
    matchQuality: z.enum(["exact", "mapped_proxy", "mismatch"]),
  })
  .strict();

export const METRIC_QUALITY_GRADE_POLICY_VERSION = "1.0.0" as const;

export const MetricQualityGradeValueSchema = z.enum([
  "high",
  "moderate",
  "limited",
]);

const TransformedUtilityOutputsSchema = z
  .object({
    originUtilityBps: BasisPointsSchema.nullable(),
    destinationUtilityBps: BasisPointsSchema.nullable(),
    originUncertaintyBps: BasisPointsSchema.nullable(),
    destinationUncertaintyBps: BasisPointsSchema.nullable(),
  })
  .strict();

export type MetricQualityGradeValue = z.infer<
  typeof MetricQualityGradeValueSchema
>;

export type MetricQualityGradeInputs = Readonly<{
  freshness: "current" | "stale" | "unknown";
  missingness: "complete" | "partial" | "unavailable";
  coverageBps: number | null;
  originGeographyMatch: "exact" | "mapped_proxy" | "mismatch";
  destinationGeographyMatch: "exact" | "mapped_proxy" | "mismatch";
  originUncertaintyBps: number | null;
  destinationUncertaintyBps: number | null;
}>;

/**
 * Quality grades are intentionally conservative. Unknown or incomplete
 * evidence is limited; otherwise proxy geography, sub-95% coverage, or more
 * than 5% transformed uncertainty caps a metric at moderate.
 */
export const deriveMetricQualityGrade = (
  inputs: MetricQualityGradeInputs,
): MetricQualityGradeValue => {
  const geographyMatches = [
    inputs.originGeographyMatch,
    inputs.destinationGeographyMatch,
  ];
  const uncertainties = [
    inputs.originUncertaintyBps,
    inputs.destinationUncertaintyBps,
  ];

  if (
    inputs.freshness !== "current" ||
    inputs.missingness !== "complete" ||
    inputs.coverageBps === null ||
    inputs.coverageBps < 8_000 ||
    geographyMatches.includes("mismatch") ||
    uncertainties.some((uncertainty) => uncertainty === null) ||
    uncertainties.some(
      (uncertainty) => uncertainty !== null && uncertainty > 1_000,
    )
  ) {
    return "limited";
  }

  if (
    inputs.coverageBps < 9_500 ||
    geographyMatches.includes("mapped_proxy") ||
    uncertainties.some(
      (uncertainty) => uncertainty !== null && uncertainty > 500,
    )
  ) {
    return "moderate";
  }

  return "high";
};

export const FinancialInputPathSchema = z.enum([
  "finances.origin.takeHomeIncome.monthlyCents",
  "finances.origin.grossIncome.monthlyCents",
  "finances.origin.housingCost.monthlyCents",
  "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
  "finances.destination.takeHomeIncome.monthlyCents",
  "finances.destination.grossIncome.monthlyCents",
  "finances.destination.housingCost.monthlyCents",
  "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
  "finances.destination.retainedPropertyNet.monthlyCents",
]);

export const SIGNED_FINANCIAL_INPUT_PATH =
  "finances.destination.retainedPropertyNet.monthlyCents" as const;

const canonicalEquals = (left: unknown, right: unknown): boolean =>
  JSON.stringify(sortJsonKeys(left)) === JSON.stringify(sortJsonKeys(right));

const InputPlausibleRangeSchema = z
  .object({
    min: SafeIntegerSchema,
    max: SafeIntegerSchema,
  })
  .strict()
  .superRefine((range, context) => {
    if (range.min > range.max) {
      context.addIssue({
        code: "custom",
        message: "Plausible range minimum must not exceed its maximum.",
        path: ["max"],
      });
    }
  });

export const MetricEvidenceSchema = z
  .object({
    kind: z.literal("benchmark_metric"),
    id: StableIdSchema.refine((id) => id.startsWith("benchmark."), {
      message: "Benchmark evidence IDs must use the benchmark. namespace.",
    }),
    metricId: StableIdSchema,
    definition: z.string().trim().min(1).max(500),
    priorityId: PriorityIdSchema,
    unit: MetricUnitSchema,
    originValue: z.number().nullable(),
    destinationValue: z.number().nullable(),
    deltaValue: z.number().nullable(),
    source: z
      .object({
        dataset: z.string().trim().min(1).max(160),
        publisher: z.string().trim().min(1).max(160),
        sourceUrl: z.string().url(),
        termsUrl: z.string().url().nullable(),
      })
      .strict(),
    observationPeriod: z.string().trim().min(1).max(80),
    releasedOn: IsoDateSchema,
    verifiedOn: IsoDateSchema,
    geographies: z
      .object({
        origin: BenchmarkGeographySchema,
        destination: BenchmarkGeographySchema,
      })
      .strict(),
    snapshotVersion: VersionSchema,
    snapshotSha256: Sha256Schema,
    transformation: z
      .object({
        id: StableIdSchema,
        version: VersionSchema,
        preferredDirection: PreferredDirectionSchema,
        outputs: TransformedUtilityOutputsSchema,
      })
      .strict(),
    materialityPolicy: z
      .object({
        utilityDeltaBps: BasisPointsSchema.min(1),
        rationale: z.string().trim().min(1).max(500),
      })
      .strict(),
    quality: z
      .object({
        freshness: z.enum(["current", "stale", "unknown"]),
        missingness: z.enum(["complete", "partial", "unavailable"]),
        marginOfError: z
          .object({
            origin: z.number().nonnegative().nullable(),
            destination: z.number().nonnegative().nullable(),
          })
          .strict()
          .nullable(),
        coverageBps: BasisPointsSchema.nullable(),
        grade: z
          .object({
            value: MetricQualityGradeValueSchema,
            policyVersion: z.literal(METRIC_QUALITY_GRADE_POLICY_VERSION),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((evidence, context) => {
    const originAvailable = evidence.originValue !== null;
    const destinationAvailable = evidence.destinationValue !== null;
    const expectedMissingness =
      originAvailable && destinationAvailable
        ? "complete"
        : originAvailable || destinationAvailable
          ? "partial"
          : "unavailable";
    const outputs = evidence.transformation.outputs;

    const originTransform = applyRegisteredUtilityTransform({
      priorityId: evidence.priorityId,
      metricId: evidence.metricId,
      transformationId: evidence.transformation.id,
      transformationVersion: evidence.transformation.version,
      materialityThresholdBps: evidence.materialityPolicy.utilityDeltaBps,
      unit: evidence.unit,
      preferredDirection: evidence.transformation.preferredDirection,
      rawValue: evidence.originValue,
    });
    const destinationTransform = applyRegisteredUtilityTransform({
      priorityId: evidence.priorityId,
      metricId: evidence.metricId,
      transformationId: evidence.transformation.id,
      transformationVersion: evidence.transformation.version,
      materialityThresholdBps: evidence.materialityPolicy.utilityDeltaBps,
      unit: evidence.unit,
      preferredDirection: evidence.transformation.preferredDirection,
      rawValue: evidence.destinationValue,
    });
    if (
      originTransform.status !== "ok" ||
      destinationTransform.status !== "ok"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Priority, metric, transformation, version, materiality, unit, and direction must be registered before promotion.",
        path: ["transformation"],
      });
    } else if (
      outputs.originUtilityBps !== originTransform.utilityBps ||
      outputs.destinationUtilityBps !== destinationTransform.utilityBps
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Transformed utilities must equal the registered transformation outputs.",
        path: ["transformation", "outputs"],
      });
    }

    if (evidence.quality.missingness !== expectedMissingness) {
      context.addIssue({
        code: "custom",
        message: "Metric missingness must match raw value availability.",
        path: ["quality", "missingness"],
      });
    }

    if (
      (evidence.deltaValue !== null) !==
      (originAvailable && destinationAvailable)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Metric delta is available only when both raw comparison values are available.",
        path: ["deltaValue"],
      });
    }

    const utilityAvailabilityChecks = [
      {
        side: "origin",
        rawAvailable: originAvailable,
        utility: outputs.originUtilityBps,
        uncertainty: outputs.originUncertaintyBps,
      },
      {
        side: "destination",
        rawAvailable: destinationAvailable,
        utility: outputs.destinationUtilityBps,
        uncertainty: outputs.destinationUncertaintyBps,
      },
    ] as const;

    utilityAvailabilityChecks.forEach(
      ({ side, rawAvailable, utility, uncertainty }) => {
        if ((utility !== null) !== rawAvailable) {
          context.addIssue({
            code: "custom",
            message:
              "Transformed utility availability must match its raw metric value.",
            path: ["transformation", "outputs", `${side}UtilityBps`],
          });
        }
        if ((uncertainty !== null) !== rawAvailable) {
          context.addIssue({
            code: "custom",
            message:
              "Transformed uncertainty availability must match its raw metric value.",
            path: ["transformation", "outputs", `${side}UncertaintyBps`],
          });
        }
      },
    );

    if (evidence.originValue !== null && evidence.destinationValue !== null) {
      const expectedDelta = evidence.destinationValue - evidence.originValue;
      if (
        evidence.deltaValue === null ||
        Math.abs(evidence.deltaValue - expectedDelta) > 1e-9
      ) {
        context.addIssue({
          code: "custom",
          message: "Metric delta must equal destination minus origin.",
          path: ["deltaValue"],
        });
      }
    }

    const expectedGrade = deriveMetricQualityGrade({
      freshness: evidence.quality.freshness,
      missingness: evidence.quality.missingness,
      coverageBps: evidence.quality.coverageBps,
      originGeographyMatch: evidence.geographies.origin.matchQuality,
      destinationGeographyMatch: evidence.geographies.destination.matchQuality,
      originUncertaintyBps: outputs.originUncertaintyBps,
      destinationUncertaintyBps: outputs.destinationUncertaintyBps,
    });

    if (evidence.quality.grade.value !== expectedGrade) {
      context.addIssue({
        code: "custom",
        message: `Metric quality grade must be ${expectedGrade} under policy ${METRIC_QUALITY_GRADE_POLICY_VERSION}.`,
        path: ["quality", "grade", "value"],
      });
    }
  });

export const ScenarioInputEvidenceSchema = z
  .object({
    kind: z.literal("scenario_input"),
    id: StableIdSchema.refine((id) => id.startsWith("input."), {
      message: "Scenario-input evidence IDs must use the input. namespace.",
    }),
    inputPath: FinancialInputPathSchema,
    unit: z.literal("usd_cents"),
    value: SafeIntegerSchema,
    assumptionBasis: AssumptionBasisSchema,
    plausibleRangeCents: InputPlausibleRangeSchema.nullable(),
  })
  .strict()
  .superRefine((evidence, context) => {
    const range = evidence.plausibleRangeCents;
    const isSignedInput = evidence.inputPath === SIGNED_FINANCIAL_INPUT_PATH;
    const isGrossIncome = evidence.inputPath.includes(".grossIncome.");

    if (
      evidence.value < (isSignedInput ? -MAX_MONTHLY_CENTS : 0) ||
      evidence.value > MAX_MONTHLY_CENTS
    ) {
      context.addIssue({
        code: "custom",
        message: isSignedInput
          ? "Retained-property evidence must stay within signed monthly-money bounds."
          : "Income, housing, and expense evidence must be non-negative monthly money.",
        path: ["value"],
      });
    }
    if (
      range !== null &&
      (range.min < (isSignedInput ? -MAX_MONTHLY_CENTS : 0) ||
        range.max > MAX_MONTHLY_CENTS)
    ) {
      context.addIssue({
        code: "custom",
        message: isSignedInput
          ? "Retained-property ranges must stay within signed monthly-money bounds."
          : "Income, housing, and expense ranges must be non-negative monthly money.",
        path: ["plausibleRangeCents"],
      });
    }
    if (
      isGrossIncome &&
      (evidence.value === 0 || (range !== null && range.min === 0))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Provided gross-income evidence and its range must be greater than zero.",
        path: evidence.value === 0 ? ["value"] : ["plausibleRangeCents", "min"],
      });
    }
    if (evidence.assumptionBasis === "confirmed" && range !== null) {
      context.addIssue({
        code: "custom",
        message: "Confirmed input evidence cannot contain a plausible range.",
        path: ["plausibleRangeCents"],
      });
    }
    if (
      range !== null &&
      (evidence.value < range.min || evidence.value > range.max)
    ) {
      context.addIssue({
        code: "custom",
        message: "Plausible range must contain the input value.",
        path: ["plausibleRangeCents"],
      });
    }
  });

export const DerivedEvidenceSchema = z
  .object({
    kind: z.literal("derived"),
    id: StableIdSchema.refine((id) => id.startsWith("derived."), {
      message: "Derived evidence IDs must use the derived. namespace.",
    }),
    metricId: StableIdSchema,
    unit: MetricUnitSchema,
    value: z.number(),
    formula: z
      .object({
        id: StableIdSchema,
        version: VersionSchema,
      })
      .strict(),
    inputRefs: z.array(StableIdSchema).min(1),
  })
  .strict();

export const DecisionEvidenceSchema = z.discriminatedUnion("kind", [
  MetricEvidenceSchema,
  ScenarioInputEvidenceSchema,
  DerivedEvidenceSchema,
]);

export const PriorityBenchmarkSchema = z
  .object({
    priorityId: PriorityIdSchema,
    originUtilityBps: BasisPointsSchema.nullable(),
    destinationUtilityBps: BasisPointsSchema.nullable(),
    materialityThresholdBps: BasisPointsSchema.min(1),
    transformationId: StableIdSchema,
    transformationVersion: VersionSchema,
    evidence: MetricEvidenceSchema,
  })
  .strict()
  .superRefine((benchmark, context) => {
    if (benchmark.evidence.priorityId !== benchmark.priorityId) {
      context.addIssue({
        code: "custom",
        message: "Evidence priority must match the benchmark priority.",
        path: ["evidence", "priorityId"],
      });
    }

    if (
      benchmark.evidence.transformation.id !== benchmark.transformationId ||
      benchmark.evidence.transformation.version !==
        benchmark.transformationVersion
    ) {
      context.addIssue({
        code: "custom",
        message: "Evidence must use the benchmark transformation and version.",
        path: ["evidence", "transformation"],
      });
    }

    const outputs = benchmark.evidence.transformation.outputs;
    if (
      benchmark.originUtilityBps !== outputs.originUtilityBps ||
      benchmark.destinationUtilityBps !== outputs.destinationUtilityBps
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Priority utility outputs must match the metric transformation outputs.",
        path: ["evidence", "transformation", "outputs"],
      });
    }

    if (
      benchmark.evidence.materialityPolicy.utilityDeltaBps !==
      benchmark.materialityThresholdBps
    ) {
      context.addIssue({
        code: "custom",
        message: "Evidence and benchmark materiality thresholds must match.",
        path: ["evidence", "materialityPolicy", "utilityDeltaBps"],
      });
    }
  });

export const BenchmarkComparisonSchema = z
  .object({
    snapshot: BenchmarkSnapshotRefSchema,
    origin: ResolvedMetroRefSchema,
    destination: ResolvedMetroRefSchema,
    priorities: z
      .array(PriorityBenchmarkSchema)
      .max(PriorityIdSchema.options.length),
  })
  .strict()
  .superRefine((comparison, context) => {
    const seenPriorities = new Set<string>();
    const seenEvidence = new Set<string>();
    const sourceArtifactsById = new Map(
      comparison.snapshot.sourceArtifacts.map((artifact) => [
        artifact.id,
        artifact,
      ]),
    );

    (["origin", "destination"] as const).forEach((side) => {
      const mapping = comparison[side].selectedPlaceMapping;
      const artifact = sourceArtifactsById.get(mapping.sourceArtifactId);
      if (
        artifact === undefined ||
        artifact.sourceUrl !== mapping.sourceUrl ||
        artifact.sha256 !== mapping.sourceArtifactSha256
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Selected-place mapping must reference an exact snapshot source artifact.",
          path: [side, "selectedPlaceMapping"],
        });
      }
    });

    comparison.priorities.forEach((priority, index) => {
      if (seenPriorities.has(priority.priorityId)) {
        context.addIssue({
          code: "custom",
          message: "Benchmark priorities must be unique.",
          path: ["priorities", index, "priorityId"],
        });
      }
      seenPriorities.add(priority.priorityId);

      if (seenEvidence.has(priority.evidence.id)) {
        context.addIssue({
          code: "custom",
          message: "Benchmark evidence IDs must be unique.",
          path: ["priorities", index, "evidence", "id"],
        });
      }
      seenEvidence.add(priority.evidence.id);

      if (
        !comparison.snapshot.sourceArtifacts.some(
          (artifact) =>
            artifact.sourceUrl === priority.evidence.source.sourceUrl,
        )
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Metric evidence source URL must belong to the snapshot source-artifact lineage.",
          path: ["priorities", index, "evidence", "source", "sourceUrl"],
        });
      }

      if (
        priority.evidence.snapshotVersion !== comparison.snapshot.version ||
        priority.evidence.snapshotSha256 !== comparison.snapshot.sha256
      ) {
        context.addIssue({
          code: "custom",
          message: "Benchmark evidence must belong to the declared snapshot.",
          path: ["priorities", index, "evidence", "snapshotVersion"],
        });
      }

      const geographyPairs = [
        ["origin", priority.evidence.geographies.origin, comparison.origin],
        [
          "destination",
          priority.evidence.geographies.destination,
          comparison.destination,
        ],
      ] as const;

      geographyPairs.forEach(([side, geography, metro]) => {
        if (
          geography.matchQuality === "exact" &&
          (geography.kind !== "cbsa" || geography.code !== metro.cbsaCode)
        ) {
          context.addIssue({
            code: "custom",
            message: "Exact benchmark geography must match the resolved CBSA.",
            path: ["priorities", index, "evidence", "geographies", side],
          });
        }
      });
    });

    if (comparison.origin.slug === comparison.destination.slug) {
      if (!canonicalEquals(comparison.origin, comparison.destination)) {
        context.addIssue({
          code: "custom",
          message:
            "A same-metro comparison must resolve to one identical geography record.",
          path: ["destination"],
        });
      }

      comparison.priorities.forEach((priority, index) => {
        const evidence = priority.evidence;
        const outputs = evidence.transformation.outputs;
        const sameMetricState =
          canonicalEquals(
            evidence.geographies.origin,
            evidence.geographies.destination,
          ) &&
          Object.is(evidence.originValue, evidence.destinationValue) &&
          (evidence.deltaValue === null || evidence.deltaValue === 0) &&
          Object.is(outputs.originUtilityBps, outputs.destinationUtilityBps) &&
          Object.is(
            outputs.originUncertaintyBps,
            outputs.destinationUncertaintyBps,
          ) &&
          Object.is(priority.originUtilityBps, priority.destinationUtilityBps);
        if (!sameMetricState) {
          context.addIssue({
            code: "custom",
            message:
              "Same-metro benchmark metrics must have identical geography, values, utilities, uncertainty, and zero delta.",
            path: ["priorities", index, "evidence", "deltaValue"],
          });
        }
      });
    }
  })
  .transform((comparison) => ({
    ...comparison,
    priorities: [...comparison.priorities].sort((left, right) =>
      compareCodePoints(left.priorityId, right.priorityId),
    ),
  }));

export type ResolvedMetroRef = z.infer<typeof ResolvedMetroRefSchema>;
export type BenchmarkSnapshotRef = z.infer<typeof BenchmarkSnapshotRefSchema>;
export type BenchmarkGeography = z.infer<typeof BenchmarkGeographySchema>;
export type FinancialInputPath = z.infer<typeof FinancialInputPathSchema>;
export type MetricEvidence = z.infer<typeof MetricEvidenceSchema>;
export type ScenarioInputEvidence = z.infer<typeof ScenarioInputEvidenceSchema>;
export type DerivedEvidence = z.infer<typeof DerivedEvidenceSchema>;
export type DecisionEvidence = z.infer<typeof DecisionEvidenceSchema>;
export type PriorityBenchmark = z.infer<typeof PriorityBenchmarkSchema>;
export type BenchmarkComparison = z.infer<typeof BenchmarkComparisonSchema>;

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

declare const verifiedBenchmarkComparisonBrand: unique symbol;

/** A schema-valid, checksum-bound, deeply frozen benchmark comparison. */
export type VerifiedBenchmarkComparison = DeepReadonly<BenchmarkComparison> & {
  readonly [verifiedBenchmarkComparisonBrand]: true;
};

export const serializeBenchmarkComparisonForChecksum = (
  comparison: BenchmarkComparison | VerifiedBenchmarkComparison,
): string => {
  const parsed = BenchmarkComparisonSchema.parse(comparison);
  const { sha256: _snapshotSha256, ...snapshot } = parsed.snapshot;
  const priorities = [...parsed.priorities]
    .sort((left, right) => compareCodePoints(left.priorityId, right.priorityId))
    .map((priority) => {
      const { snapshotSha256: _evidenceSha256, ...evidence } =
        priority.evidence;
      return { ...priority, evidence };
    });

  return JSON.stringify(
    sortJsonKeys({
      snapshot,
      origin: parsed.origin,
      destination: parsed.destination,
      priorities,
    }),
  );
};

export const calculateBenchmarkComparisonChecksum = (
  comparison: BenchmarkComparison | VerifiedBenchmarkComparison,
): string => sha256Hex(serializeBenchmarkComparisonForChecksum(comparison));

export class BenchmarkChecksumMismatchError extends Error {
  readonly actualSha256: string;
  readonly expectedSha256: string;

  constructor(expectedSha256: string, actualSha256: string) {
    super(
      `Benchmark snapshot checksum mismatch: expected ${expectedSha256}, received ${actualSha256}.`,
    );
    this.name = "BenchmarkChecksumMismatchError";
    this.expectedSha256 = expectedSha256;
    this.actualSha256 = actualSha256;
  }
}

export class PartialBenchmarkEvidenceError extends Error {
  readonly evidenceId: string;

  constructor(evidenceId: string) {
    super(
      `Benchmark evidence ${evidenceId} is partial and cannot be promoted for comparison.`,
    );
    this.name = "PartialBenchmarkEvidenceError";
    this.evidenceId = evidenceId;
  }
}

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

/**
 * Establishes the benchmark trust boundary. Callers must not cast plain parsed
 * data to VerifiedBenchmarkComparison; only this function checks the content
 * checksum and returns an immutable branded value.
 */
export const verifyBenchmarkComparison = (
  input: unknown,
): VerifiedBenchmarkComparison => {
  const comparison = BenchmarkComparisonSchema.parse(input);
  const partialEvidence = comparison.priorities.find(
    (priority) => priority.evidence.quality.missingness === "partial",
  )?.evidence;
  if (partialEvidence !== undefined) {
    throw new PartialBenchmarkEvidenceError(partialEvidence.id);
  }
  const actualSha256 = calculateBenchmarkComparisonChecksum(comparison);

  if (actualSha256 !== comparison.snapshot.sha256) {
    throw new BenchmarkChecksumMismatchError(
      comparison.snapshot.sha256,
      actualSha256,
    );
  }

  return deepFreeze(comparison) as VerifiedBenchmarkComparison;
};
