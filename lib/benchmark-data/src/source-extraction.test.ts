import { describe, expect, it } from "vitest";

import {
  extractCbsaLabelsFromGeographyInventory,
  extractCbsaLabelsFromGeographyInventoryForMetros,
  extractCommuteRowsFromOfficialTables,
  extractCommuteRowsFromOfficialTablesForMetros,
} from "./source-extraction";
import {
  APPROVED_ACS_COMMUTE_SOURCE,
  APPROVED_ACS_METRO_SOURCE,
} from "./source-registry";

const b08013 = [
  "GEO_ID|B08013_E001|B08013_M001|B08013_E002",
  "310M700US31080|167900745|1472822|94305230",
  "310M700US42660|53404365|740838|31181315",
  "310M700US12420|30627030|621811|100",
  "310M700US41740|36610825|648200|100",
].join("\n");

const b08006 = [
  "GEO_ID|B08006_E001|B08006_M001|B08006_E017|B08006_M017",
  "310M700US31080|6439157|25869|962126|19480",
  "310M700US42660|2184959|15654|404495|12400",
  "310M700US12420|1413215|12865|327525|12151",
  "310M700US41740|1674562|12717|269795|8695",
].join("\n");

const geographyInventory = [
  "FILEID|CBSA|GEO_ID|NAME",
  "ACSSF|31080|310M700US31080|Los Angeles-Long Beach-Anaheim, CA Metro Area",
  "ACSSF|42660|310M700US42660|Seattle-Tacoma-Bellevue, WA Metro Area",
  "ACSSF|12420|310M700US12420|Austin-Round Rock-San Marcos, TX Metro Area",
  "ACSSF|41740|310M700US41740|San Diego-Chula Vista-Carlsbad, CA Metro Area",
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

  it("extracts the four-metro cohort without origin/destination roles", () => {
    const commute = extractCommuteRowsFromOfficialTablesForMetros(
      b08013,
      b08006,
      APPROVED_ACS_METRO_SOURCE.metros,
    );
    const geographies = extractCbsaLabelsFromGeographyInventoryForMetros(
      geographyInventory,
      APPROVED_ACS_METRO_SOURCE.metros,
    );

    expect(commute["austin-tx"]).toEqual(
      APPROVED_ACS_METRO_SOURCE.metros["austin-tx"].commute,
    );
    expect(commute["san-diego-ca"]).toEqual(
      APPROVED_ACS_METRO_SOURCE.metros["san-diego-ca"].commute,
    );
    expect(geographies["austin-tx"]).toMatchObject({
      cbsaCode: "12420",
      cbsaLabel: "Austin-Round Rock-San Marcos, TX Metro Area",
    });
    expect(geographies["san-diego-ca"]).toMatchObject({
      cbsaCode: "41740",
      cbsaLabel: "San Diego-Chula Vista-Carlsbad, CA Metro Area",
    });
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
