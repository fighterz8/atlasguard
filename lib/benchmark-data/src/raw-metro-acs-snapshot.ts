import {
  MetroSlugSchema,
  Sha256Schema,
  StableIdSchema,
  sha256Hex,
  sortJsonKeys,
} from "@workspace/contracts";
import { z } from "zod/v4";

import { APPROVED_ACS_METRO_SOURCE } from "./source-registry";

const SourceArtifactSchema = z
  .object({
    id: StableIdSchema,
    title: z.string().trim().min(1),
    sourceUrl: z.string().url(),
    sha256: Sha256Schema,
    retrievedOn: z.iso.date(),
  })
  .strict();

const EstimateSchema = z
  .object({
    estimate: z.number().int().nonnegative(),
    marginOfError90: z.number().int().nonnegative(),
  })
  .strict();

export const RawMetroAcsSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: StableIdSchema.refine(
      (id) => id.startsWith("acs1.2024.metro-profile."),
      "Independent ACS snapshot IDs must use the metro-profile namespace.",
    ),
    sha256: Sha256Schema,
    admissionStatus: z.literal("research_only"),
    userFacingEligible: z.literal(false),
    metroSlug: MetroSlugSchema,
    delineationVersion: z.literal("OMB Bulletin 23-01 / Census July 2023"),
    observationPeriod: z.literal("2024 ACS 1-year estimates"),
    releasedOn: z.literal("2025-09-11"),
    verifiedOn: z.literal("2026-07-18"),
    publisher: z.literal("U.S. Census Bureau"),
    dataset: z.literal("2024 ACS 1-year table-based summary files"),
    termsUrl: z.literal(
      "https://www.census.gov/data/developers/about/terms-of-service.html",
    ),
    derivation: z
      .object({
        commuteEstimateFormula: z.literal(
          "B08013_E001 / (B08006_E001 - B08006_E017)",
        ),
        commuteMarginOfErrorMethod: z.literal(
          "Zero-covariance approximation from the published component 90% margins of error; display rounding is separate from calculation",
        ),
        rentConversion: z.literal("B25064 dollars multiplied by 100"),
        coveragePolicy: z.literal(
          "null: no defensible population-coverage percentage is inferred from ACS survey estimates",
        ),
      })
      .strict(),
    artifacts: z
      .object({
        cbsaDelineation: SourceArtifactSchema,
        acsGeographies: SourceArtifactSchema,
        b08013: SourceArtifactSchema,
        b08006: SourceArtifactSchema,
        b25064: SourceArtifactSchema,
      })
      .strict(),
    metro: z
      .object({
        selectedPlace: z
          .object({
            city: z.string().trim().min(1),
            stateCode: z.string().regex(/^[A-Z]{2}$/),
          })
          .strict(),
        cbsaCode: z.string().regex(/^\d{5}$/),
        cbsaLabel: z.string().trim().min(1),
        acsGeoId: z.string().regex(/^310M700US\d{5}$/),
        aggregateTravelTimeMinutes: EstimateSchema,
        workers16AndOver: EstimateSchema,
        workedFromHome: EstimateSchema,
        medianGrossRentDollars: z.number().int().nonnegative(),
        medianGrossRentMarginOfError90Dollars: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (!snapshot.id.endsWith(`${snapshot.metroSlug}.raw`)) {
      context.addIssue({
        code: "custom",
        message: "Independent ACS snapshot ID must end with its metro slug.",
        path: ["id"],
      });
    }
    if (!snapshot.metro.acsGeoId.endsWith(snapshot.metro.cbsaCode)) {
      context.addIssue({
        code: "custom",
        message: "ACS geography ID must end with the declared CBSA code.",
        path: ["metro", "acsGeoId"],
      });
    }
    if (
      snapshot.metro.workers16AndOver.estimate -
        snapshot.metro.workedFromHome.estimate <=
      0
    ) {
      context.addIssue({
        code: "custom",
        message: "The non-home-worker denominator must be positive.",
        path: ["metro", "workedFromHome", "estimate"],
      });
    }
  });

export type RawMetroAcsSnapshot = z.infer<typeof RawMetroAcsSnapshotSchema>;

declare const verifiedRawMetroAcsSnapshotBrand: unique symbol;
export type VerifiedRawMetroAcsSnapshot = Readonly<RawMetroAcsSnapshot> & {
  readonly [verifiedRawMetroAcsSnapshotBrand]: true;
};

export const serializeRawMetroAcsSnapshotForChecksum = (
  input: RawMetroAcsSnapshot,
): string => {
  const parsed = RawMetroAcsSnapshotSchema.parse(input);
  const { sha256: _sha256, ...content } = parsed;
  return JSON.stringify(sortJsonKeys(content));
};

export const calculateRawMetroAcsSnapshotChecksum = (
  input: RawMetroAcsSnapshot,
): string => sha256Hex(serializeRawMetroAcsSnapshotForChecksum(input));

export class RawMetroAcsSnapshotChecksumMismatchError extends Error {}
export class RawMetroAcsSnapshotRegistryMismatchError extends Error {}

const assertApprovedRegistry = (snapshot: RawMetroAcsSnapshot): void => {
  const approved =
    APPROVED_ACS_METRO_SOURCE.metros[
      snapshot.metroSlug as keyof typeof APPROVED_ACS_METRO_SOURCE.metros
    ];
  if (approved === undefined) {
    throw new RawMetroAcsSnapshotRegistryMismatchError(
      `ACS metro ${snapshot.metroSlug} is not approved.`,
    );
  }
  Object.entries(snapshot.artifacts).forEach(([key, artifact]) => {
    const expected =
      APPROVED_ACS_METRO_SOURCE.artifacts[
        key as keyof typeof APPROVED_ACS_METRO_SOURCE.artifacts
      ];
    if (
      artifact.id !== expected.id ||
      artifact.sourceUrl !== expected.sourceUrl ||
      artifact.sha256 !== expected.sha256
    ) {
      throw new RawMetroAcsSnapshotRegistryMismatchError(
        `ACS metro artifact ${key} is not approved.`,
      );
    }
  });
  const expectedMetro = {
    selectedPlace: approved.selectedPlace,
    cbsaCode: approved.cbsaCode,
    cbsaLabel: approved.cbsaLabel,
    acsGeoId: approved.acsGeoId,
    aggregateTravelTimeMinutes: approved.commute.aggregateTravelTimeMinutes,
    workers16AndOver: approved.commute.workers16AndOver,
    workedFromHome: approved.commute.workedFromHome,
    medianGrossRentDollars: approved.rent.estimateDollars,
    medianGrossRentMarginOfError90Dollars: approved.rent.marginOfError90Dollars,
  };
  if (JSON.stringify(snapshot.metro) !== JSON.stringify(expectedMetro)) {
    throw new RawMetroAcsSnapshotRegistryMismatchError(
      `ACS metro ${snapshot.metroSlug} values differ from the approved extraction.`,
    );
  }
};

const deepFreeze = <Value>(value: Value): Value => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value;
};

export const verifyRawMetroAcsSnapshot = (
  input: unknown,
): VerifiedRawMetroAcsSnapshot => {
  const snapshot = RawMetroAcsSnapshotSchema.parse(input);
  assertApprovedRegistry(snapshot);
  const actualSha256 = calculateRawMetroAcsSnapshotChecksum(snapshot);
  if (actualSha256 !== snapshot.sha256) {
    throw new RawMetroAcsSnapshotChecksumMismatchError(
      `Raw ACS metro checksum mismatch: expected ${snapshot.sha256}, received ${actualSha256}.`,
    );
  }
  return deepFreeze(snapshot) as VerifiedRawMetroAcsSnapshot;
};
