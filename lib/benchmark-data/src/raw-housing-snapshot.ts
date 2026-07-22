import { sha256Hex, sortJsonKeys } from "@workspace/contracts";
import { z } from "zod/v4";

import { APPROVED_ACS_RENT_SOURCE } from "./source-registry";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const ArtifactSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    sourceUrl: z.string().url(),
    sha256: Sha256Schema,
    retrievedOn: z.iso.date(),
  })
  .strict();

const MetroRentSchema = z
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
    medianGrossRentDollars: z.number().int().nonnegative(),
    marginOfError90Dollars: z.number().int().nonnegative(),
  })
  .strict();

export const RawHousingSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: z.literal("acs1.2024.median-gross-rent.la-seattle.raw"),
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
    artifacts: z
      .object({
        acsGeographies: ArtifactSchema,
        b25064: ArtifactSchema,
      })
      .strict(),
    metros: z.array(MetroRentSchema).length(2),
  })
  .strict()
  .superRefine((snapshot, context) => {
    (["origin", "destination"] as const).forEach((side) => {
      const records = snapshot.metros.filter((record) => record.side === side);
      if (records.length !== 1) {
        context.addIssue({
          code: "custom",
          message: `Snapshot must contain exactly one ${side} record.`,
          path: ["metros"],
        });
      }
      const record = records[0];
      if (record !== undefined && !record.acsGeoId.endsWith(record.cbsaCode)) {
        context.addIssue({
          code: "custom",
          message: "ACS geography ID must end with the CBSA code.",
          path: ["metros"],
        });
      }
    });
  });

export type RawHousingSnapshot = z.infer<typeof RawHousingSnapshotSchema>;

declare const verifiedRawHousingSnapshotBrand: unique symbol;
export type VerifiedRawHousingSnapshot = Readonly<RawHousingSnapshot> & {
  readonly [verifiedRawHousingSnapshotBrand]: true;
};

export const serializeRawHousingSnapshotForChecksum = (
  input: RawHousingSnapshot,
): string => {
  const parsed = RawHousingSnapshotSchema.parse(input);
  const { sha256: _sha256, ...content } = parsed;
  return JSON.stringify(sortJsonKeys(content));
};

export const calculateRawHousingSnapshotChecksum = (
  input: RawHousingSnapshot,
): string => sha256Hex(serializeRawHousingSnapshotForChecksum(input));

export class RawHousingSnapshotChecksumMismatchError extends Error {
  constructor(
    readonly expectedSha256: string,
    readonly actualSha256: string,
  ) {
    super(
      `Raw housing snapshot checksum mismatch: expected ${expectedSha256}, received ${actualSha256}.`,
    );
    this.name = "RawHousingSnapshotChecksumMismatchError";
  }
}

export const verifyRawHousingSnapshot = (
  input: unknown,
): VerifiedRawHousingSnapshot => {
  const snapshot = RawHousingSnapshotSchema.parse(input);
  const registry = APPROVED_ACS_RENT_SOURCE;
  (["acsGeographies", "b25064"] as const).forEach((key) => {
    const actual = snapshot.artifacts[key];
    const approved = registry.artifacts[key];
    if (
      actual.id !== approved.id ||
      actual.sourceUrl !== approved.sourceUrl ||
      actual.sha256 !== approved.sha256
    ) {
      throw new Error(`Raw housing snapshot artifact ${key} is not approved.`);
    }
  });
  (["origin", "destination"] as const).forEach((side) => {
    const record = snapshot.metros.find((candidate) => candidate.side === side);
    const geography = registry.geographies[side];
    const values = registry.extractedRows[side];
    if (
      record === undefined ||
      record.cbsaCode !== geography.cbsaCode ||
      record.cbsaLabel !== geography.cbsaLabel ||
      record.acsGeoId !== geography.acsGeoId ||
      record.selectedPlace.city !== geography.selectedPlace.city ||
      record.selectedPlace.stateCode !== geography.selectedPlace.stateCode ||
      record.medianGrossRentDollars !== values.estimateDollars ||
      record.marginOfError90Dollars !== values.marginOfError90Dollars
    ) {
      throw new Error(`Raw housing snapshot ${side} record is not approved.`);
    }
  });
  const actualSha256 = calculateRawHousingSnapshotChecksum(snapshot);
  if (actualSha256 !== snapshot.sha256) {
    throw new RawHousingSnapshotChecksumMismatchError(
      snapshot.sha256,
      actualSha256,
    );
  }
  Object.freeze(snapshot.metros);
  snapshot.metros.forEach(Object.freeze);
  Object.freeze(snapshot.artifacts);
  Object.values(snapshot.artifacts).forEach(Object.freeze);
  return Object.freeze(snapshot) as VerifiedRawHousingSnapshot;
};
