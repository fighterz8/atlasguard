import { z } from "zod/v4";

import { compareCodePoints, sha256Hex, sortJsonKeys } from "./canonical-json";
import {
  BenchmarkGeographySchema,
  MetricUnitSchema,
  ResolvedMetroRefSchema,
} from "./benchmark";
import {
  BasisPointsSchema,
  IsoDateSchema,
  PreferredDirectionSchema,
  PriorityIdSchema,
  Sha256Schema,
  StableIdSchema,
  VersionSchema,
} from "./primitives";

const MetroProfileRawSnapshotRefSchema = z
  .object({
    id: StableIdSchema,
    sha256: Sha256Schema,
  })
  .strict();

const MetroProfileSourceArtifactSchema = z
  .object({
    id: StableIdSchema,
    sourceUrl: z.string().url(),
    sha256: Sha256Schema,
    rawSnapshotIds: z.array(StableIdSchema).min(1),
  })
  .strict();

export const MetroProfileSnapshotSchema = z
  .object({
    id: StableIdSchema.refine((id) => id.startsWith("metro-profile."), {
      message:
        "Metro-profile snapshot IDs must use the metro-profile. namespace.",
    }),
    version: VersionSchema,
    sha256: Sha256Schema,
    admissionStatus: z.enum(["research_only", "user_facing"]),
    rawSnapshots: z.array(MetroProfileRawSnapshotRefSchema).min(1),
    sourceArtifacts: z.array(MetroProfileSourceArtifactSchema).min(1),
    derivation: z
      .object({
        id: StableIdSchema,
        version: VersionSchema,
      })
      .strict(),
    delineationVersion: z.string().trim().min(1).max(80),
    verifiedOn: IsoDateSchema,
  })
  .strict();

const MetroProfileSelectionUncertaintySchema = z
  .object({
    kind: z.literal("reference_site_range"),
    min: z.number(),
    max: z.number(),
    rationale: z.string().trim().min(1).max(500),
  })
  .strict()
  .refine((range) => range.min <= range.max, {
    message: "Selection range minimum must not exceed its maximum.",
    path: ["max"],
  });

const MetroProfileSourceCompletenessSchema = z
  .object({
    classification: z.enum(["standard", "representative"]),
    observedYears: z.number().int().min(10).max(30),
    normalPeriodYears: z.literal(30),
    missingPeriodTreatment: z.literal("surrounding_station_estimates"),
    rationale: z.string().trim().min(1).max(500),
  })
  .strict()
  .superRefine((completeness, context) => {
    if (
      completeness.classification === "standard" &&
      completeness.observedYears < 24
    ) {
      context.addIssue({
        code: "custom",
        message: "NOAA Standard completeness requires at least 24 years.",
        path: ["observedYears"],
      });
    }
    if (
      completeness.classification === "representative" &&
      completeness.observedYears >= 24
    ) {
      context.addIssue({
        code: "custom",
        message:
          "NOAA Representative completeness must not be used when Standard completeness applies.",
        path: ["classification"],
      });
    }
  });

const MetroProfileObservationBaseSchema = z.object({
  metricId: StableIdSchema,
  definition: z.string().trim().min(1).max(500),
  unit: MetricUnitSchema,
  value: z.number().nullable(),
  source: z
    .object({
      artifactIds: z.array(StableIdSchema).min(1),
      dataset: z.string().trim().min(1).max(160),
      publisher: z.string().trim().min(1).max(160),
      sourceUrl: z.string().url(),
      termsUrl: z.string().url().nullable(),
    })
    .strict(),
  rawSnapshotId: StableIdSchema,
  observationPeriod: z.string().trim().min(1).max(80),
  releasedOn: IsoDateSchema,
  verifiedOn: IsoDateSchema,
  geography: BenchmarkGeographySchema,
  quality: z
    .object({
      freshness: z.enum(["current", "stale", "unknown"]),
      missingness: z.enum(["complete", "unavailable"]),
      marginOfError: z.number().nonnegative().nullable(),
      selectionUncertainty: MetroProfileSelectionUncertaintySchema.optional(),
      sourceCompleteness: MetroProfileSourceCompletenessSchema.optional(),
      coverageBps: BasisPointsSchema.nullable(),
    })
    .strict(),
});

const MetroProfileDecisionObservationSchema =
  MetroProfileObservationBaseSchema.extend({
    role: z.literal("decision_input"),
    priorityId: PriorityIdSchema,
    transformation: z
      .object({
        id: StableIdSchema,
        version: VersionSchema,
        supportedPreferredDirections: z
          .array(PreferredDirectionSchema)
          .min(1)
          .max(PreferredDirectionSchema.options.length),
      })
      .strict(),
    materialityPolicy: z
      .object({
        utilityDeltaBps: BasisPointsSchema.min(1),
        rationale: z.string().trim().min(1).max(500),
      })
      .strict(),
  }).strict();

const MetroProfileContextObservationSchema =
  MetroProfileObservationBaseSchema.extend({
    role: z.literal("context_only"),
    priorityId: z.null(),
    transformation: z.null(),
    materialityPolicy: z.null(),
  }).strict();

export const MetroProfileObservationSchema = z
  .discriminatedUnion("role", [
    MetroProfileDecisionObservationSchema,
    MetroProfileContextObservationSchema,
  ])
  .superRefine((observation, context) => {
    const expectedMissingness =
      observation.value === null ? "unavailable" : "complete";
    if (observation.quality.missingness !== expectedMissingness) {
      context.addIssue({
        code: "custom",
        message: "Observation missingness must match raw value availability.",
        path: ["quality", "missingness"],
      });
    }

    const selectionUncertainty = observation.quality.selectionUncertainty;
    if (
      selectionUncertainty !== undefined &&
      (observation.value === null ||
        observation.value < selectionUncertainty.min ||
        observation.value > selectionUncertainty.max)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Reference-site selection ranges must contain the declared raw metric value.",
        path: ["quality", "selectionUncertainty"],
      });
    }

    if (observation.role === "decision_input") {
      const directions =
        observation.transformation.supportedPreferredDirections;
      if (new Set(directions).size !== directions.length) {
        context.addIssue({
          code: "custom",
          message: "Supported preferred directions must be unique.",
          path: ["transformation", "supportedPreferredDirections"],
        });
      }
    }
  });

export const MetroProfileSchema = z
  .object({
    snapshot: MetroProfileSnapshotSchema,
    metro: ResolvedMetroRefSchema,
    observations: z.array(MetroProfileObservationSchema).min(1),
  })
  .strict()
  .superRefine((profile, context) => {
    const rawSnapshotIds = new Set<string>();
    profile.snapshot.rawSnapshots.forEach((snapshot, index) => {
      if (rawSnapshotIds.has(snapshot.id)) {
        context.addIssue({
          code: "custom",
          message: "Raw-snapshot IDs must be unique.",
          path: ["snapshot", "rawSnapshots", index, "id"],
        });
      }
      rawSnapshotIds.add(snapshot.id);
    });

    const sourceArtifacts = new Map<
      string,
      { sourceUrl: string; sha256: string }
    >();
    profile.snapshot.sourceArtifacts.forEach((artifact, index) => {
      if (sourceArtifacts.has(artifact.id)) {
        context.addIssue({
          code: "custom",
          message: "Source-artifact IDs must be unique.",
          path: ["snapshot", "sourceArtifacts", index, "id"],
        });
      }
      sourceArtifacts.set(artifact.id, {
        sourceUrl: artifact.sourceUrl,
        sha256: artifact.sha256,
      });
      if (
        new Set(artifact.rawSnapshotIds).size !== artifact.rawSnapshotIds.length
      ) {
        context.addIssue({
          code: "custom",
          message: "Source-artifact raw-snapshot IDs must be unique.",
          path: ["snapshot", "sourceArtifacts", index, "rawSnapshotIds"],
        });
      }
      if (
        artifact.rawSnapshotIds.some(
          (rawSnapshotId) => !rawSnapshotIds.has(rawSnapshotId),
        )
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Every source artifact must reference a declared raw snapshot.",
          path: ["snapshot", "sourceArtifacts", index, "rawSnapshotIds"],
        });
      }
    });

    const metricIds = new Set<string>();
    const mappingArtifact = sourceArtifacts.get(
      profile.metro.selectedPlaceMapping.sourceArtifactId,
    );
    if (
      mappingArtifact?.sourceUrl !==
        profile.metro.selectedPlaceMapping.sourceUrl ||
      mappingArtifact.sha256 !==
        profile.metro.selectedPlaceMapping.sourceArtifactSha256
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Selected-place mapping lineage must match a declared source artifact and URL.",
        path: ["metro", "selectedPlaceMapping", "sourceArtifactId"],
      });
    }

    profile.observations.forEach((observation, index) => {
      if (metricIds.has(observation.metricId)) {
        context.addIssue({
          code: "custom",
          message: "Metro-profile metric IDs must be unique.",
          path: ["observations", index, "metricId"],
        });
      }
      metricIds.add(observation.metricId);

      if (!rawSnapshotIds.has(observation.rawSnapshotId)) {
        context.addIssue({
          code: "custom",
          message:
            "Observation raw-snapshot lineage must exist in the profile snapshot.",
          path: ["observations", index, "rawSnapshotId"],
        });
      }

      if (
        new Set(observation.source.artifactIds).size !==
        observation.source.artifactIds.length
      ) {
        context.addIssue({
          code: "custom",
          message: "Observation source-artifact IDs must be unique.",
          path: ["observations", index, "source", "artifactIds"],
        });
      }
      const observationArtifactUrls = observation.source.artifactIds.map(
        (artifactId) => sourceArtifacts.get(artifactId)?.sourceUrl,
      );
      if (
        observationArtifactUrls.some((sourceUrl) => sourceUrl === undefined) ||
        !observationArtifactUrls.includes(observation.source.sourceUrl)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Observation source lineage must resolve to declared artifacts and include the primary source URL.",
          path: ["observations", index, "source", "artifactIds"],
        });
      }

      if (
        observation.geography.kind === "cbsa" &&
        observation.geography.matchQuality === "exact" &&
        observation.geography.code !== profile.metro.cbsaCode
      ) {
        context.addIssue({
          code: "custom",
          message: "An exact CBSA observation must match the profile metro.",
          path: ["observations", index, "geography"],
        });
      }
    });
  })
  .transform((profile) => ({
    ...profile,
    snapshot: {
      ...profile.snapshot,
      rawSnapshots: [...profile.snapshot.rawSnapshots].sort((left, right) =>
        compareCodePoints(left.id, right.id),
      ),
      sourceArtifacts: [...profile.snapshot.sourceArtifacts].sort(
        (left, right) => compareCodePoints(left.id, right.id),
      ),
    },
    observations: [...profile.observations].sort((left, right) =>
      compareCodePoints(left.metricId, right.metricId),
    ),
  }));

export type MetroProfile = z.infer<typeof MetroProfileSchema>;
export type MetroProfileObservation = z.infer<
  typeof MetroProfileObservationSchema
>;

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

declare const verifiedMetroProfileBrand: unique symbol;

/** A schema-valid, checksum-bound, deeply frozen independent metro profile. */
export type VerifiedMetroProfile = DeepReadonly<MetroProfile> & {
  readonly [verifiedMetroProfileBrand]: true;
};

export const serializeMetroProfileForChecksum = (
  profile: MetroProfile | VerifiedMetroProfile,
): string => {
  const parsed = MetroProfileSchema.parse(profile);
  const { sha256: _profileSha256, ...snapshot } = parsed.snapshot;

  return JSON.stringify(
    sortJsonKeys({
      snapshot,
      metro: parsed.metro,
      observations: parsed.observations,
    }),
  );
};

export const calculateMetroProfileChecksum = (
  profile: MetroProfile | VerifiedMetroProfile,
): string => sha256Hex(serializeMetroProfileForChecksum(profile));

export class MetroProfileChecksumMismatchError extends Error {
  readonly actualSha256: string;
  readonly expectedSha256: string;

  constructor(expectedSha256: string, actualSha256: string) {
    super(
      `Metro-profile checksum mismatch: expected ${expectedSha256}, received ${actualSha256}.`,
    );
    this.name = "MetroProfileChecksumMismatchError";
    this.expectedSha256 = expectedSha256;
    this.actualSha256 = actualSha256;
  }
}

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

/** Establishes the independent metro-profile promotion trust boundary. */
export const verifyMetroProfile = (input: unknown): VerifiedMetroProfile => {
  const profile = MetroProfileSchema.parse(input);
  const actualSha256 = calculateMetroProfileChecksum(profile);

  if (actualSha256 !== profile.snapshot.sha256) {
    throw new MetroProfileChecksumMismatchError(
      profile.snapshot.sha256,
      actualSha256,
    );
  }

  return deepFreeze(profile) as VerifiedMetroProfile;
};
