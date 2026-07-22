import { sha256Hex, sortJsonKeys } from "@workspace/contracts";
import { z } from "zod/v4";

import { APPROVED_NOAA_HEAT_SOURCE } from "./source-registry";

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

const ClimateStationSchema = z
  .object({
    stationId: z.string().regex(/^USW\d{8}$/),
    role: z.enum(["urban_reference", "airport_contrast"]),
    name: z.string().trim().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    elevationMeters: z.number(),
    annualDaysAbove90F: z.number().min(0).max(366),
    measurementFlag: z.literal(""),
    completenessFlag: z.literal("S"),
    years: z.number().int().min(24).max(30),
  })
  .strict();

const PlaceClimateRecordSchema = z
  .object({
    side: z.enum(["origin", "destination"]),
    selectedPlace: z
      .object({
        city: z.string().trim().min(1),
        stateCode: z.string().regex(/^[A-Z]{2}$/),
      })
      .strict(),
    referenceStationId: z.string().regex(/^USW\d{8}$/),
    envelopeStationIds: z.array(z.string().regex(/^USW\d{8}$/)).length(2),
  })
  .strict();

export const RawClimateSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: z.literal("noaa.normals.1991-2020.hot-days.la-seattle"),
    sha256: Sha256Schema,
    admissionStatus: z.literal("research_only"),
    userFacingEligible: z.literal(false),
    observationPeriod: z.literal("1991-2020 climate normal"),
    releasedOn: z.literal("2023-06-27"),
    verifiedOn: z.literal("2026-07-18"),
    publisher: z.literal("NOAA National Centers for Environmental Information"),
    dataset: z.literal("U.S. Climate Normals 1991-2020 Annual/Seasonal"),
    termsUrl: z.literal("https://www.weather.gov/disclaimer"),
    metric: z
      .object({
        column: z.literal("ANN-TMAX-AVGNDS-GRTH090"),
        definition: z.literal(
          "Normal annual number of days with maximum temperature greater than 90 degrees Fahrenheit",
        ),
        unit: z.literal("days"),
      })
      .strict(),
    selectionPolicy: z
      .object({
        reference: z.literal(
          "One NOAA Standard-completeness urban station named for the selected city",
        ),
        envelope: z.literal(
          "The urban reference plus the NOAA Standard-completeness primary-airport station named for the selected city",
        ),
        uncertainty: z.literal(
          "Maximum absolute utility difference between the urban reference and either station in the selected-city envelope",
        ),
        interpretation: z.literal(
          "Selected-city station proxy with reference-site selection uncertainty; not a metro-wide or neighborhood forecast",
        ),
      })
      .strict(),
    artifacts: z
      .object({
        inventory: SourceArtifactSchema,
        documentation: SourceArtifactSchema,
        losAngelesUrban: SourceArtifactSchema,
        losAngelesAirport: SourceArtifactSchema,
        seattleUrban: SourceArtifactSchema,
        seattleAirport: SourceArtifactSchema,
      })
      .strict(),
    stations: z.array(ClimateStationSchema).length(4),
    places: z.array(PlaceClimateRecordSchema).length(2),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const stationIds = new Set(
      snapshot.stations.map(({ stationId }) => stationId),
    );
    if (stationIds.size !== snapshot.stations.length) {
      context.addIssue({
        code: "custom",
        message: "Climate station IDs must be unique.",
        path: ["stations"],
      });
    }
    const sides = new Set(snapshot.places.map(({ side }) => side));
    if (!sides.has("origin") || !sides.has("destination")) {
      context.addIssue({
        code: "custom",
        message: "Climate snapshot must contain both comparison sides.",
        path: ["places"],
      });
    }
    snapshot.places.forEach((place, index) => {
      if (!place.envelopeStationIds.includes(place.referenceStationId)) {
        context.addIssue({
          code: "custom",
          message: "Reference station must belong to its uncertainty envelope.",
          path: ["places", index, "referenceStationId"],
        });
      }
      if (
        place.envelopeStationIds.some((stationId) => !stationIds.has(stationId))
      ) {
        context.addIssue({
          code: "custom",
          message: "Every envelope station must exist in the snapshot.",
          path: ["places", index, "envelopeStationIds"],
        });
      }
    });
  });

export type RawClimateSnapshot = z.infer<typeof RawClimateSnapshotSchema>;

declare const verifiedRawClimateSnapshotBrand: unique symbol;
export type VerifiedRawClimateSnapshot = Readonly<RawClimateSnapshot> & {
  readonly [verifiedRawClimateSnapshotBrand]: true;
};

export const calculateRawClimateSnapshotChecksum = (
  input: RawClimateSnapshot,
): string => {
  const parsed = RawClimateSnapshotSchema.parse(input);
  const { sha256: _sha256, ...content } = parsed;
  return sha256Hex(JSON.stringify(sortJsonKeys(content)));
};

export class RawClimateSnapshotChecksumMismatchError extends Error {}
export class RawClimateSnapshotRegistryMismatchError extends Error {}

const assertApprovedRegistry = (snapshot: RawClimateSnapshot): void => {
  Object.entries(snapshot.artifacts).forEach(([key, artifact]) => {
    const approved =
      APPROVED_NOAA_HEAT_SOURCE.artifacts[
        key as keyof typeof APPROVED_NOAA_HEAT_SOURCE.artifacts
      ];
    if (
      artifact.id !== approved.id ||
      artifact.sourceUrl !== approved.sourceUrl ||
      artifact.sha256 !== approved.sha256
    ) {
      throw new RawClimateSnapshotRegistryMismatchError(
        `Climate artifact ${key} does not match the approved registry.`,
      );
    }
  });
  snapshot.stations.forEach((station) => {
    const approved =
      APPROVED_NOAA_HEAT_SOURCE.extractedStations[
        station.stationId as keyof typeof APPROVED_NOAA_HEAT_SOURCE.extractedStations
      ];
    if (
      approved === undefined ||
      JSON.stringify({
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        elevationMeters: station.elevationMeters,
        annualDaysAbove90F: station.annualDaysAbove90F,
        completenessFlag: station.completenessFlag,
        years: station.years,
      }) !== JSON.stringify(approved)
    ) {
      throw new RawClimateSnapshotRegistryMismatchError(
        `Climate station ${station.stationId} does not match the approved extraction.`,
      );
    }
  });
  snapshot.places.forEach((place) => {
    const approved = APPROVED_NOAA_HEAT_SOURCE.places[place.side];
    if (
      place.selectedPlace.city !== approved.city ||
      place.selectedPlace.stateCode !== approved.stateCode ||
      place.referenceStationId !== approved.referenceStationId ||
      JSON.stringify(place.envelopeStationIds) !==
        JSON.stringify(approved.envelopeStationIds)
    ) {
      throw new RawClimateSnapshotRegistryMismatchError(
        `Climate ${place.side} selection does not match the approved registry.`,
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

export const verifyRawClimateSnapshot = (
  input: unknown,
): VerifiedRawClimateSnapshot => {
  const parsed = RawClimateSnapshotSchema.parse(input);
  const actual = calculateRawClimateSnapshotChecksum(parsed);
  if (actual !== parsed.sha256) {
    throw new RawClimateSnapshotChecksumMismatchError(
      `Raw climate snapshot checksum mismatch: expected ${parsed.sha256}, received ${actual}.`,
    );
  }
  assertApprovedRegistry(parsed);
  return deepFreeze(parsed) as VerifiedRawClimateSnapshot;
};
