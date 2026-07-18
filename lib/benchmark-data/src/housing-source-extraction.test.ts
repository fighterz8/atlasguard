import { describe, expect, it } from "vitest";

import { extractRentRowsFromOfficialTable } from "./housing-source-extraction";

const table = [
  "GEO_ID|B25064_E001|B25064_M001",
  "310M700US31080|2114|13",
  "310M700US42660|2050|25",
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

  it("rejects duplicate rows for a comparison geography", () => {
    expect(() =>
      extractRentRowsFromOfficialTable(`${table}\n310M700US31080|2114|13`),
    ).toThrow("found 2");
  });
});
