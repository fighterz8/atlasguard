import {
  APPROVED_ACS_COMMUTE_SOURCE,
  APPROVED_ACS_RENT_SOURCE,
  extractCbsaLabelsFromGeographyInventory,
  extractCommuteRowsFromOfficialTables,
  extractRentRowsFromOfficialTable,
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

const [delineation, geographies, b08013, b08006, b25064] = await Promise.all([
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.cbsaDelineation),
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.acsGeographies),
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.b08013),
  download(APPROVED_ACS_COMMUTE_SOURCE.artifacts.b08006),
  download(APPROVED_ACS_RENT_SOURCE.artifacts.b25064),
]);
if (delineation.byteLength === 0) {
  throw new Error("Official CBSA delineation artifact is empty.");
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

const rentRows = extractRentRowsFromOfficialTable(decoder.decode(b25064));
if (
  JSON.stringify(rentRows) !==
  JSON.stringify(APPROVED_ACS_RENT_SOURCE.extractedRows)
) {
  throw new Error(
    "Official ACS rent rows do not match the approved extraction.",
  );
}

process.stdout.write(
  "Verified five official artifact checksums, two CBSA rows, and ten ACS values.\n",
);
