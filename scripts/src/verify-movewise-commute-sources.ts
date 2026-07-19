import {
  APPROVED_ACS_COMMUTE_SOURCE,
  APPROVED_ACS_METRO_SOURCE,
  APPROVED_ACS_RENT_SOURCE,
  APPROVED_NOAA_METRO_SOURCE,
  extractCbsaLabelsFromGeographyInventory,
  extractCbsaLabelsFromGeographyInventoryForMetros,
  extractCommuteRowsFromOfficialTables,
  extractCommuteRowsFromOfficialTablesForMetros,
  extractNoaaHeatInventoryStationsForRegistry,
  extractNoaaHeatStationForRegistry,
  extractRentRowsFromOfficialTable,
  extractRentRowsFromOfficialTableForMetros,
} from "@workspace/benchmark-data";
import { createHash } from "node:crypto";

const download = async (source: {
  sourceUrl: string;
  sha256: string;
}): Promise<Uint8Array> => {
  const response = await fetch(source.sourceUrl);
  if (!response.ok) {
    throw new Error(`Source download failed with HTTP ${response.status}.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== source.sha256) {
    throw new Error(
      `Official source checksum mismatch: expected ${source.sha256}, received ${actualSha256}.`,
    );
  }
  return bytes;
};

const [
  delineation,
  geographies,
  b08013,
  b08006,
  b25064,
  noaaInventory,
  noaaDocumentation,
] = await Promise.all([
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.cbsaDelineation),
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.acsGeographies),
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.b08013),
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.b08006),
  download(APPROVED_ACS_RENT_SOURCE.artifacts.b25064),
  download(APPROVED_NOAA_METRO_SOURCE.artifacts.inventory),
  download(APPROVED_NOAA_METRO_SOURCE.artifacts.documentation),
]);
const stationArtifacts = await Promise.all(
  Object.values(APPROVED_NOAA_METRO_SOURCE.artifacts.stations).map(download),
);
if (delineation.byteLength === 0 || noaaDocumentation.byteLength === 0) {
  throw new Error("Official source documentation artifact is empty.");
}
const decoder = new TextDecoder();
const extracted = extractCommuteRowsFromOfficialTables(
  decoder.decode(b08013),
  decoder.decode(b08006),
);
if (
  JSON.stringify(extracted) !==
  JSON.stringify(APPROVED_ACS_COMMUTE_SOURCE.extractedRows)
) {
  throw new Error("Official ACS rows do not match the approved extraction.");
}
const cohortCommuteRows = extractCommuteRowsFromOfficialTablesForMetros(
  decoder.decode(b08013),
  decoder.decode(b08006),
  APPROVED_ACS_METRO_SOURCE.metros,
);
const expectedCohortCommuteRows = Object.fromEntries(
  Object.entries(APPROVED_ACS_METRO_SOURCE.metros).map(([slug, metro]) => [
    slug,
    metro.commute,
  ]),
);
if (
  JSON.stringify(cohortCommuteRows) !==
  JSON.stringify(expectedCohortCommuteRows)
) {
  throw new Error(
    "Official ACS cohort commute rows do not match the registry.",
  );
}
const geographyRows = extractCbsaLabelsFromGeographyInventory(
  decoder.decode(geographies),
);
(["origin", "destination"] as const).forEach((side) => {
  const expected = APPROVED_ACS_COMMUTE_SOURCE.geographies[side];
  const actual = geographyRows[side];
  if (
    actual.acsGeoId !== expected.acsGeoId ||
    actual.cbsaCode !== expected.cbsaCode ||
    actual.cbsaLabel !== expected.cbsaLabel ||
    !actual.cbsaLabel.includes(expected.selectedPlace.city)
  ) {
    throw new Error(`Official geography mapping mismatch for ${side}.`);
  }
});
const cohortGeographyRows = extractCbsaLabelsFromGeographyInventoryForMetros(
  decoder.decode(geographies),
  APPROVED_ACS_METRO_SOURCE.metros,
);
Object.entries(APPROVED_ACS_METRO_SOURCE.metros).forEach(([slug, expected]) => {
  const actual = cohortGeographyRows[slug];
  if (
    actual.acsGeoId !== expected.acsGeoId ||
    actual.cbsaCode !== expected.cbsaCode ||
    actual.cbsaLabel !== expected.cbsaLabel ||
    !actual.cbsaLabel.includes(expected.selectedPlace.city)
  ) {
    throw new Error(`Official cohort geography mapping mismatch for ${slug}.`);
  }
});

const rentRows = extractRentRowsFromOfficialTable(decoder.decode(b25064));
if (
  JSON.stringify(rentRows) !==
  JSON.stringify(APPROVED_ACS_RENT_SOURCE.extractedRows)
) {
  throw new Error(
    "Official ACS rent rows do not match the approved extraction.",
  );
}
const cohortRentRows = extractRentRowsFromOfficialTableForMetros(
  decoder.decode(b25064),
  APPROVED_ACS_METRO_SOURCE.metros,
);
const expectedCohortRentRows = Object.fromEntries(
  Object.entries(APPROVED_ACS_METRO_SOURCE.metros).map(([slug, metro]) => [
    slug,
    metro.rent,
  ]),
);
if (JSON.stringify(cohortRentRows) !== JSON.stringify(expectedCohortRentRows)) {
  throw new Error("Official ACS cohort rent rows do not match the registry.");
}

const inventoryStations = extractNoaaHeatInventoryStationsForRegistry(
  decoder.decode(noaaInventory),
  APPROVED_NOAA_METRO_SOURCE.stations,
);
Object.entries(APPROVED_NOAA_METRO_SOURCE.stations).forEach(
  ([stationId, expected]) => {
    const inventory = inventoryStations[stationId];
    if (
      inventory === undefined ||
      inventory.name !== expected.name.split(",")[0] ||
      inventory.latitude !== expected.latitude ||
      inventory.longitude !== expected.longitude ||
      inventory.elevationMeters !== expected.elevationMeters
    ) {
      throw new Error(`Official NOAA inventory mismatch for ${stationId}.`);
    }
  },
);

stationArtifacts.forEach((bytes) => {
  const actual = extractNoaaHeatStationForRegistry(
    decoder.decode(bytes),
    APPROVED_NOAA_METRO_SOURCE.stations,
  );
  const expected =
    APPROVED_NOAA_METRO_SOURCE.stations[
      actual.stationId as keyof typeof APPROVED_NOAA_METRO_SOURCE.stations
    ];
  if (
    expected === undefined ||
    actual.measurementFlag !== "" ||
    JSON.stringify({
      name: actual.name,
      latitude: actual.latitude,
      longitude: actual.longitude,
      elevationMeters: actual.elevationMeters,
      annualDaysAbove90F: actual.annualDaysAbove90F,
      completenessFlag: actual.completenessFlag,
      years: actual.years,
    }) !== JSON.stringify(expected)
  ) {
    throw new Error(`Official NOAA station mismatch for ${actual.stationId}.`);
  }
});

process.stdout.write(
  "Verified fifteen official artifact checksums, four CBSA rows, sixteen ACS estimate/MOE pairs, and eight NOAA station normals.\n",
);
