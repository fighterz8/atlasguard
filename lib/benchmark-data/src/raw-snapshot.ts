import { sha256Hex, sortJsonKeys } from "@workspace/contracts";
import { z } from "zod/v4";

import { APPROVED_ACS_COMMUTE_SOURCE } from "./source-registry";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

const SourceArtifactSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    sourceUrl: z.string().url(),
    sha256: Sha256Schema,
    retrievedOn: z.iso.date(),
  })
  .strict();

const AcsEstimateSchema = z
  .object({
    estimate: z.number().int().nonnegative(),
    marginOfError90: z.number().int().nonnegative(),
  })
  .strict();

const CommuteMetroRecordSchema = z
  .object({
    side: z.enum(["origin", "destination"]),
    selectedPlace: z
      .object({
        city: z.string().trim().min(1),
        stateCode: z.string().regex(/^[A-Z]{2}$/),
      })
      .strict(),
    cbsaCode: z.string().regex(/^\d{5}$/),
    cbsaLabel: z.string().trim().min(1),
    acsGeoId: z.string().regex(/^310M700US\d{5}$/),
    aggregateTravelTimeMinutes: AcsEstimateSchema,
    workers16AndOver: AcsEstimateSchema,
    workedFromHome: AcsEstimateSchema,
  })
  .strict()
  .superRefine((record, context) => {
    if (!record.acsGeoId.endsWith(record.cbsaCode)) {
      context.addIssue({
        code: "custom",
        message: "ACS geography ID must end with the declared CBSA code.",
        path: ["acsGeoId"],
      });
    }
    if (
      record.workers16AndOver.estimate - record.workedFromHome.estimate <=
      0
    ) {
      context.addIssue({
        code: "custom",
        message: "The non-home-worker denominator must be positive.",
        path: ["workedFromHome", "estimate"],
      });
    }
  });

export const RawCommuteSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: z.literal("acs1.2024.commute.la-seattle"),
    sha256: Sha256Schema,
    admissionStatus: z.literal("research_only"),
    userFacingEligible: z.literal(false),
    delineationVersion: z.literal("OMB Bulletin 23-01 / Census July 2023"),
    observationPeriod: z.literal("2024 ACS 1-year estimates"),
    releasedOn: z.literal("2025-09-11"),
    verifiedOn: z.literal("2026-07-17"),
    publisher: z.literal("U.S. Census Bureau"),
    dataset: z.literal("2024 ACS 1-year table-based summary files"),
    termsUrl: z.literal(
      "https://www.census.gov/data/developers/about/terms-of-service.html",
    ),
    derivation: z
      .object({
        estimateFormula: z.literal("B08013_E001 / (B08006_E001 - B08006_E017)"),
        marginOfErrorMethod: z.literal(
          "Zero-covariance approximation from the published component 90% margins of error; display rounding is separate from calculation",
        ),
        displayRounding: z.literal("one_decimal_half_up"),
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
      })
      .strict(),
    metros: z.array(CommuteMetroRecordSchema).length(2),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const sides = new Set(snapshot.metros.map((record) => record.side));
    const cbsaCodes = new Set(snapshot.metros.map((record) => record.cbsaCode));
    const geoIds = new Set(snapshot.metros.map((record) => record.acsGeoId));

    if (!sides.has("origin") || !sides.has("destination")) {
      context.addIssue({
        code: "custom",
        message: "Snapshot must contain one origin and one destination.",
        path: ["metros"],
      });
    }
    if (cbsaCodes.size !== snapshot.metros.length) {
      context.addIssue({
        code: "custom",
        message: "Snapshot CBSA codes must be unique.",
        path: ["metros"],
      });
    }
    if (geoIds.size !== snapshot.metros.length) {
      context.addIssue({
        code: "custom",
        message: "Snapshot ACS geography IDs must be unique.",
        path: ["metros"],
      });
    }
  });

export type RawCommuteSnapshot = z.infer<typeof RawCommuteSnapshotSchema>;

declare const verifiedRawSnapshotBrand: unique symbol;

export type VerifiedRawCommuteSnapshot = Readonly<RawCommuteSnapshot> & {
  readonly [verifiedRawSnapshotBrand]: true;
};

export const serializeRawCommuteSnapshotForChecksum = (
  input: RawCommuteSnapshot,
): string => {
  const parsed = RawCommuteSnapshotSchema.parse(input);
  const { sha256: _sha256, ...content } = parsed;
  return JSON.stringify(sortJsonKeys(content));
};

export const calculateRawCommuteSnapshotChecksum = (
  input: RawCommuteSnapshot,
): string => sha256Hex(serializeRawCommuteSnapshotForChecksum(input));

export class RawSnapshotChecksumMismatchError extends Error {
  readonly expectedSha256: string;
  readonly actualSha256: string;

  constructor(expectedSha256: string, actualSha256: string) {
    super(
      `Raw commute snapshot checksum mismatch: expected ${expectedSha256}, received ${actualSha256}.`,
    );
    this.name = "RawSnapshotChecksumMismatchError";
    this.expectedSha256 = expectedSha256;
    this.actualSha256 = actualSha256;
  }
}

export class RawSnapshotRegistryMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RawSnapshotRegistryMismatchError";
  }
}

const assertApprovedSourceRegistry = (snapshot: RawCommuteSnapshot): void => {
  const artifactKeys = [
    "cbsaDelineation",
    "acsGeographies",
    "b08013",
    "b08006",
  ] as const;
  artifactKeys.forEach((key) => {
    const actual = snapshot.artifacts[key];
    const approved = APPROVED_ACS_COMMUTE_SOURCE.artifacts[key];
    if (
      actual.id !== approved.id ||
      actual.sourceUrl !== approved.sourceUrl ||
      actual.sha256 !== approved.sha256
    ) {
      throw new RawSnapshotRegistryMismatchError(
        `Raw snapshot artifact ${key} does not match the approved source registry.`,
      );
    }
  });

  (["origin", "destination"] as const).forEach((side) => {
    const actual = snapshot.metros.find((record) => record.side === side);
    const approved = APPROVED_ACS_COMMUTE_SOURCE.geographies[side];
    if (
      actual === undefined ||
      actual.cbsaCode !== approved.cbsaCode ||
      actual.cbsaLabel !== approved.cbsaLabel ||
      actual.acsGeoId !== approved.acsGeoId ||
      actual.selectedPlace.city !== approved.selectedPlace.city ||
      actual.selectedPlace.stateCode !== approved.selectedPlace.stateCode
    ) {
      throw new RawSnapshotRegistryMismatchError(
        `Raw snapshot ${side} geography does not match the approved source registry.`,
      );
    }
    const expectedValues = APPROVED_ACS_COMMUTE_SOURCE.extractedRows[side];
    if (
      JSON.stringify({
        aggregateTravelTimeMinutes: actual.aggregateTravelTimeMinutes,
        workers16AndOver: actual.workers16AndOver,
        workedFromHome: actual.workedFromHome,
      }) !== JSON.stringify(expectedValues)
    ) {
      throw new RawSnapshotRegistryMismatchError(
        `Raw snapshot ${side} values do not match the source-verified extraction registry.`,
      );
    }
  });
};

const deepFreeze = <Value>(value: Value): Value => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value;
};

export const verifyRawCommuteSnapshot = (
  input: unknown,
): VerifiedRawCommuteSnapshot => {
  const parsed = RawCommuteSnapshotSchema.parse(input);
  const actualSha256 = calculateRawCommuteSnapshotChecksum(parsed);
  if (actualSha256 !== parsed.sha256) {
    throw new RawSnapshotChecksumMismatchError(parsed.sha256, actualSha256);
  }
  assertApprovedSourceRegistry(parsed);
  return deepFreeze(parsed) as VerifiedRawCommuteSnapshot;
};
