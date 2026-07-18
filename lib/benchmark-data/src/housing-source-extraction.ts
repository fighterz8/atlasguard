import { APPROVED_ACS_RENT_SOURCE } from "./source-registry";

type RentRows = Record<
  "origin" | "destination",
  { estimateDollars: number; marginOfError90Dollars: number }
>;

const parseInteger = (value: string | undefined, field: string): number => {
  if (value === undefined || !/^\d+$/.test(value)) {
    throw new Error(`Official ACS rent field ${field} is not an integer.`);
  }
  return Number(value);
};

export const extractRentRowsFromOfficialTable = (table: string): RentRows => {
  const lines = table.trim().split(/\r?\n/);
  const header = lines[0]?.split("|");
  if (header === undefined) {
    throw new Error("Official ACS B25064 table is empty.");
  }
  const geoIndex = header.indexOf("GEO_ID");
  const estimateIndex = header.indexOf("B25064_E001");
  const moeIndex = header.indexOf("B25064_M001");
  if (geoIndex < 0 || estimateIndex < 0 || moeIndex < 0) {
    throw new Error("Official ACS B25064 table lacks required columns.");
  }

  const extract = (side: "origin" | "destination") => {
    const expectedGeoId = APPROVED_ACS_RENT_SOURCE.geographies[side].acsGeoId;
    const matches = lines
      .slice(1)
      .map((line) => line.split("|"))
      .filter((cells) => cells[geoIndex] === expectedGeoId);
    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one B25064 row for ${expectedGeoId}; found ${matches.length}.`,
      );
    }
    const cells = matches[0];
    return {
      estimateDollars: parseInteger(cells[estimateIndex], "B25064_E001"),
      marginOfError90Dollars: parseInteger(cells[moeIndex], "B25064_M001"),
    };
  };

  return { origin: extract("origin"), destination: extract("destination") };
};
