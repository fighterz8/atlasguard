import {
  MetroSlugSchema,
  Sha256Schema,
  StableIdSchema,
  sha256Hex,
  sortJsonKeys,
} from "@workspace/contracts";
import { z } from "zod/v4";

import { APPROVED_NOAA_METRO_SOURCE } from "./source-registry";

const SourceArtifactSchema = z
  .object({
    id: StableIdSchema,
    title: z.string().trim().min(1),
    sourceUrl: z.string().url(),
    sha256: Sha256Schema,
    retrievedOn: z.iso.date(),
  })
  .strict();

export const NoaaCompletenessFlagSchema = z.enum(["S", "R"]);

const ClimateStationSchema = z
  .object({
    stationId: z.string().regex(/^US[CW]\d{8}$/),
    role: z.enum(["urban_reference", "primary_airport_contrast"]),
    name: z.string().trim().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    elevationMeters: z.number(),
    annualDaysAbove90F: z.number().min(0).max(366),
    measurementFlag: z.literal(""),
    completenessFlag: NoaaCompletenessFlagSchema,
    years: z.number().int().min(10).max(30),
  })
  .strict()
  .superRefine((station, context) => {
    if (station.completenessFlag === "S" && station.years < 24) {
      context.addIssue({
        code: "custom",
        message: "NOAA Standard completeness requires at least 24 years.",
        path: ["years"],
      });
    }
    if (station.completenessFlag === "R" && station.years >= 24) {
      context.addIssue({
        code: "custom",
        message:
          "NOAA Representative completeness must not be used when Standard completeness applies.",
        path: ["completenessFlag"],
      });
    }
  });

export const RawMetroClimateSnapshotSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: StableIdSchema.refine(
      (id) => id.startsWith("noaa.normals.1991-2020.metro-profile."),
      "Independent NOAA snapshot IDs must use the metro-profile namespace.",
    ),
    sha256: Sha256Schema,
    admissionStatus: z.literal("research_only"),
    userFacingEligible: z.literal(false),
    metroSlug: MetroSlugSchema,
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
          "One NOAA urban reference station named for the selected city with at least Representative completeness",
        ),
        envelope: z.literal(
          "The urban reference plus the NOAA primary-airport station named for the selected city, each with at least Representative completeness",
        ),
        uncertainty: z.literal(
          "Maximum absolute utility difference between the urban reference and either station in the selected-city envelope",
        ),
        interpretation: z.literal(
          "Selected-city station proxy with reference-site selection and source-completeness uncertainty; not a metro-wide or neighborhood forecast",
        ),
      })
      .strict(),
    artifacts: z
      .object({
        inventory: SourceArtifactSchema,
        documentation: SourceArtifactSchema,
        referenceStation: SourceArtifactSchema,
        contrastStation: SourceArtifactSchema,
      })
      .strict(),
    place: z
      .object({
        selectedPlace: z
          .object({
            city: z.string().trim().min(1),
            stateCode: z.string().regex(/^[A-Z]{2}$/),
          })
          .strict(),
        referenceStationId: z.string().regex(/^US[CW]\d{8}$/),
        envelopeStationIds: z
          .array(z.string().regex(/^US[CW]\d{8}$/))
          .length(2),
      })
      .strict(),
    stations: z.array(ClimateStationSchema).length(2),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (!snapshot.id.endsWith(`${snapshot.metroSlug}.raw`)) {
      context.addIssue({
        code: "custom",
        message: "Independent NOAA snapshot ID must end with its metro slug.",
        path: ["id"],
      });
    }
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
    if (
      !snapshot.place.envelopeStationIds.includes(
        snapshot.place.referenceStationId,
      ) ||
      snapshot.place.envelopeStationIds.some(
        (stationId) => !stationIds.has(stationId),
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Reference and envelope station IDs must resolve within the snapshot.",
        path: ["place", "envelopeStationIds"],
      });
    }
    const reference = snapshot.stations.find(
      ({ stationId }) => stationId === snapshot.place.referenceStationId,
    );
    if (reference?.role !== "urban_reference") {
      context.addIssue({
        code: "custom",
        message: "The reference station must have the urban-reference role.",
        path: ["place", "referenceStationId"],
      });
    }
  });

export type RawMetroClimateSnapshot = z.infer<
  typeof RawMetroClimateSnapshotSchema
>;

declare const verifiedRawMetroClimateSnapshotBrand: unique symbol;
export type VerifiedRawMetroClimateSnapshot =
  Readonly<RawMetroClimateSnapshot> & {
    readonly [verifiedRawMetroClimateSnapshotBrand]: true;
  };

export const serializeRawMetroClimateSnapshotForChecksum = (
  input: RawMetroClimateSnapshot,
): string => {
  const parsed = RawMetroClimateSnapshotSchema.parse(input);
  const { sha256: _sha256, ...content } = parsed;
  return JSON.stringify(sortJsonKeys(content));
};

export const calculateRawMetroClimateSnapshotChecksum = (
  input: RawMetroClimateSnapshot,
): string => sha256Hex(serializeRawMetroClimateSnapshotForChecksum(input));

export class RawMetroClimateSnapshotChecksumMismatchError extends Error {}
export class RawMetroClimateSnapshotRegistryMismatchError extends Error {}

const assertApprovedRegistry = (snapshot: RawMetroClimateSnapshot): void => {
  const approvedMetro =
    APPROVED_NOAA_METRO_SOURCE.metros[
      snapshot.metroSlug as keyof typeof APPROVED_NOAA_METRO_SOURCE.metros
    ];
  if (approvedMetro === undefined) {
    throw new RawMetroClimateSnapshotRegistryMismatchError(
      `NOAA metro ${snapshot.metroSlug} is not approved.`,
    );
  }
  const contrastStationId = approvedMetro.envelopeStationIds.find(
    (stationId) => stationId !== approvedMetro.referenceStationId,
  );
  if (contrastStationId === undefined) {
    throw new RawMetroClimateSnapshotRegistryMismatchError(
      `NOAA metro ${snapshot.metroSlug} does not define a contrast station.`,
    );
  }
  const expectedArtifacts = {
    inventory: APPROVED_NOAA_METRO_SOURCE.artifacts.inventory,
    documentation: APPROVED_NOAA_METRO_SOURCE.artifacts.documentation,
    referenceStation:
      APPROVED_NOAA_METRO_SOURCE.artifacts.stations[
        approvedMetro.referenceStationId
      ],
    contrastStation:
      APPROVED_NOAA_METRO_SOURCE.artifacts.stations[contrastStationId],
  };
  Object.entries(snapshot.artifacts).forEach(([key, artifact]) => {
    const expected = expectedArtifacts[key as keyof typeof expectedArtifacts];
    if (
      artifact.id !== expected.id ||
      artifact.sourceUrl !== expected.sourceUrl ||
      artifact.sha256 !== expected.sha256
    ) {
      throw new RawMetroClimateSnapshotRegistryMismatchError(
        `NOAA metro artifact ${key} is not approved.`,
      );
    }
  });
  if (
    JSON.stringify(snapshot.place) !==
    JSON.stringify({
      selectedPlace: approvedMetro.selectedPlace,
      referenceStationId: approvedMetro.referenceStationId,
      envelopeStationIds: approvedMetro.envelopeStationIds,
    })
  ) {
    throw new RawMetroClimateSnapshotRegistryMismatchError(
      `NOAA metro ${snapshot.metroSlug} selection differs from the registry.`,
    );
  }
  snapshot.stations.forEach((station) => {
    const expected =
      APPROVED_NOAA_METRO_SOURCE.stations[
        station.stationId as keyof typeof APPROVED_NOAA_METRO_SOURCE.stations
      ];
    const expectedRole =
      station.stationId === approvedMetro.referenceStationId
        ? "urban_reference"
        : "primary_airport_contrast";
    if (
      expected === undefined ||
      station.role !== expectedRole ||
      JSON.stringify({
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        elevationMeters: station.elevationMeters,
        annualDaysAbove90F: station.annualDaysAbove90F,
        completenessFlag: station.completenessFlag,
        years: station.years,
      }) !== JSON.stringify(expected)
    ) {
      throw new RawMetroClimateSnapshotRegistryMismatchError(
        `NOAA station ${station.stationId} differs from the registry.`,
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

export const verifyRawMetroClimateSnapshot = (
  input: unknown,
): VerifiedRawMetroClimateSnapshot => {
  const snapshot = RawMetroClimateSnapshotSchema.parse(input);
  assertApprovedRegistry(snapshot);
  const actualSha256 = calculateRawMetroClimateSnapshotChecksum(snapshot);
  if (actualSha256 !== snapshot.sha256) {
    throw new RawMetroClimateSnapshotChecksumMismatchError(
      `Raw NOAA metro checksum mismatch: expected ${snapshot.sha256}, received ${actualSha256}.`,
    );
  }
  return deepFreeze(snapshot) as VerifiedRawMetroClimateSnapshot;
};
