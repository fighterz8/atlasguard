import { describe, expect, it } from "vitest";

import {
  extractCbsaLabelsFromGeographyInventory,
  extractCommuteRowsFromOfficialTables,
} from "./source-extraction";
import { APPROVED_ACS_COMMUTE_SOURCE } from "./source-registry";

const b08013 = [
  "GEO_ID|B08013_E001|B08013_M001|B08013_E002",
  "310M700US31080|167900745|1472822|94305230",
  "310M700US42660|53404365|740838|31181315",
].join("\n");

const b08006 = [
  "GEO_ID|B08006_E001|B08006_M001|B08006_E017|B08006_M017",
  "310M700US31080|6439157|25869|962126|19480",
  "310M700US42660|2184959|15654|404495|12400",
].join("\n");

const geographyInventory = [
  "FILEID|CBSA|GEO_ID|NAME",
  "ACSSF|31080|310M700US31080|Los Angeles-Long Beach-Anaheim, CA Metro Area",
  "ACSSF|42660|310M700US42660|Seattle-Tacoma-Bellevue, WA Metro Area",
].join("\n");

describe("official ACS row extraction", () => {
  it("reproduces every approved source value from table columns", () => {
    expect(extractCommuteRowsFromOfficialTables(b08013, b08006)).toEqual(
      APPROVED_ACS_COMMUTE_SOURCE.extractedRows,
    );
  });

  it("binds both CBSA codes and titles to official geography rows", () => {
    expect(extractCbsaLabelsFromGeographyInventory(geographyInventory)).toEqual(
      {
        origin: {
          acsGeoId: "310M700US31080",
          cbsaCode: "31080",
          cbsaLabel: "Los Angeles-Long Beach-Anaheim, CA Metro Area",
        },
        destination: {
          acsGeoId: "310M700US42660",
          cbsaCode: "42660",
          cbsaLabel: "Seattle-Tacoma-Bellevue, WA Metro Area",
        },
      },
    );
  });

  it("rejects missing required variables, duplicate rows, and bad values", () => {
    expect(() =>
      extractCommuteRowsFromOfficialTables(
        b08013.replace("B08013_M001", "wrong"),
        b08006,
      ),
    ).toThrow("missing a required extraction column");
    expect(() =>
      extractCommuteRowsFromOfficialTables(
        `${b08013}\n310M700US31080|1|1|1`,
        b08006,
      ),
    ).toThrow("duplicate row");
    expect(() =>
      extractCommuteRowsFromOfficialTables(
        b08013.replace("167900745", "not-a-number"),
        b08006,
      ),
    ).toThrow("Expected integer");
  });
});
