import { z } from "zod/v4";

import {
  BenchmarkGeographySchema,
  BenchmarkSnapshotRefSchema,
  MetricUnitSchema,
  ResolvedMetroRefSchema,
} from "./benchmark";
import { compareCodePoints, sha256Hex, sortJsonKeys } from "./canonical-json";
import {
  IsoDateSchema,
  MAX_MONTHLY_CENTS,
  Sha256Schema,
  StableIdSchema,
  VersionSchema,
} from "./primitives";

const ContextMoneySchema = z.number().int().min(0).max(MAX_MONTHLY_CENTS);
const ContextMoneyDeltaSchema = z
  .number()
  .int()
  .min(-MAX_MONTHLY_CENTS)
  .max(MAX_MONTHLY_CENTS);

export const ContextMetricComparisonSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    decisionUse: z.literal("context_only"),
    interpretationBoundary: z.literal("descriptive_not_user_budget"),
    snapshot: BenchmarkSnapshotRefSchema,
    origin: ResolvedMetroRefSchema,
    destination: ResolvedMetroRefSchema,
    metric: z
      .object({
        id: StableIdSchema,
        definition: z.string().trim().min(1).max(500),
        unit: MetricUnitSchema,
        originValue: ContextMoneySchema,
        destinationValue: ContextMoneySchema,
        deltaValue: ContextMoneyDeltaSchema,
        marginOfError90: z
          .object({
            origin: ContextMoneySchema,
            destination: ContextMoneySchema,
          })
          .strict(),
        source: z
          .object({
            artifactId: StableIdSchema,
            artifactSha256: Sha256Schema,
            dataset: z.string().trim().min(1).max(200),
            publisher: z.string().trim().min(1).max(160),
            tableId: StableIdSchema,
            sourceUrl: z.string().url(),
            termsUrl: z.string().url(),
          })
          .strict(),
        sourceRows: z
          .object({
            origin: z.string().trim().min(1).max(160),
            destination: z.string().trim().min(1).max(160),
          })
          .strict(),
        observationPeriod: z.string().trim().min(1).max(120),
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
      })
      .strict(),
    caveats: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  })
  .strict()
  .superRefine((comparison, context) => {
    const { metric, snapshot } = comparison;
    if (metric.deltaValue !== metric.destinationValue - metric.originValue) {
      context.addIssue({
        code: "custom",
        message: "Context metric delta must equal destination minus origin.",
        path: ["metric", "deltaValue"],
      });
    }

    const artifact = snapshot.sourceArtifacts.find(
      (candidate) => candidate.id === metric.source.artifactId,
    );
    if (
      artifact === undefined ||
      artifact.sourceUrl !== metric.source.sourceUrl ||
      artifact.sha256 !== metric.source.artifactSha256
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Context metric source must reference an exact snapshot artifact.",
        path: ["metric", "source"],
      });
    }

    if (
      metric.snapshotVersion !== snapshot.version ||
      metric.snapshotSha256 !== snapshot.sha256
    ) {
      context.addIssue({
        code: "custom",
        message: "Context metric must belong to the declared snapshot.",
        path: ["metric", "snapshotSha256"],
      });
    }

    if (metric.verifiedOn !== snapshot.verifiedOn) {
      context.addIssue({
        code: "custom",
        message: "Metric and snapshot verification dates must match.",
        path: ["metric", "verifiedOn"],
      });
    }

    (["origin", "destination"] as const).forEach((side) => {
      const geography = metric.geographies[side];
      const metro = comparison[side];
      if (
        geography.matchQuality !== "exact" ||
        geography.kind !== "cbsa" ||
        geography.code !== metro.cbsaCode
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Context metric geography must exactly match the resolved CBSA.",
          path: ["metric", "geographies", side],
        });
      }
    });
  });

export type ContextMetricComparison = z.infer<
  typeof ContextMetricComparisonSchema
>;

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

declare const verifiedContextMetricComparisonBrand: unique symbol;

export type VerifiedContextMetricComparison =
  DeepReadonly<ContextMetricComparison> & {
    readonly [verifiedContextMetricComparisonBrand]: true;
  };

export const serializeContextMetricComparisonForChecksum = (
  input: ContextMetricComparison | VerifiedContextMetricComparison,
): string => {
  const parsed = ContextMetricComparisonSchema.parse(input);
  const { sha256: _snapshotSha256, ...snapshot } = parsed.snapshot;
  const { snapshotSha256: _metricSnapshotSha256, ...metric } = parsed.metric;
  return JSON.stringify(
    sortJsonKeys({
      ...parsed,
      snapshot: {
        ...snapshot,
        sourceArtifacts: [...snapshot.sourceArtifacts].sort((left, right) =>
          compareCodePoints(left.id, right.id),
        ),
      },
      metric,
    }),
  );
};

export const calculateContextMetricComparisonChecksum = (
  input: ContextMetricComparison | VerifiedContextMetricComparison,
): string => sha256Hex(serializeContextMetricComparisonForChecksum(input));

export class ContextMetricChecksumMismatchError extends Error {
  constructor(
    readonly expectedSha256: string,
    readonly actualSha256: string,
  ) {
    super(
      `Context metric checksum mismatch: expected ${expectedSha256}, received ${actualSha256}.`,
    );
    this.name = "ContextMetricChecksumMismatchError";
  }
}

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

export const verifyContextMetricComparison = (
  input: unknown,
): VerifiedContextMetricComparison => {
  const comparison = ContextMetricComparisonSchema.parse(input);
  const actualSha256 = calculateContextMetricComparisonChecksum(comparison);
  if (actualSha256 !== comparison.snapshot.sha256) {
    throw new ContextMetricChecksumMismatchError(
      comparison.snapshot.sha256,
      actualSha256,
    );
  }
  return deepFreeze(comparison) as VerifiedContextMetricComparison;
};
