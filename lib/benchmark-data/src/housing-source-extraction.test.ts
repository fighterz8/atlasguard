import { describe, expect, it } from "vitest";

import {
  extractRentRowsFromOfficialTable,
  extractRentRowsFromOfficialTableForMetros,
} from "./housing-source-extraction";
import { APPROVED_ACS_METRO_SOURCE } from "./source-registry";

const table = [
  "GEO_ID|B25064_E001|B25064_M001",
  "310M700US31080|2114|13",
  "310M700US42660|2050|25",
  "310M700US12420|1784|20",
  "310M700US41740|2336|20",
].join("\n");

describe("extractRentRowsFromOfficialTable", () => {
  it("extracts the two approved CBSA estimates and margins of error", () => {
    expect(extractRentRowsFromOfficialTable(table)).toEqual({
      origin: { estimateDollars: 2_114, marginOfError90Dollars: 13 },
      destination: { estimateDollars: 2_050, marginOfError90Dollars: 25 },
    });
  });

  it("rejects missing official columns", () => {
    expect(() =>
      extractRentRowsFromOfficialTable("GEO_ID|VALUE\n310M700US31080|2114"),
    ).toThrow("lacks required columns");
  });

  it("extracts Austin and San Diego rent without comparison-side roles", () => {
    const rows = extractRentRowsFromOfficialTableForMetros(
      table,
      APPROVED_ACS_METRO_SOURCE.metros,
    );

    expect(rows["austin-tx"]).toEqual({
      estimateDollars: 1_784,
      marginOfError90Dollars: 20,
    });
    expect(rows["san-diego-ca"]).toEqual({
      estimateDollars: 2_336,
      marginOfError90Dollars: 20,
    });
  });

  it("rejects duplicate rows for a comparison geography", () => {
    expect(() =>
      extractRentRowsFromOfficialTable(`${table}\n310M700US31080|2114|13`),
    ).toThrow("found 2");
  });
});
