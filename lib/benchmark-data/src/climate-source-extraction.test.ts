import { describe, expect, it } from "vitest";

import {
  extractNoaaHeatInventoryStations,
  extractNoaaHeatStation,
} from "./climate-source-extraction";

const stationCsv = [
  '"STATION","LATITUDE","LONGITUDE","ELEVATION","NAME","ANN-TMAX-AVGNDS-GRTH090","meas_flag_ANN-TMAX-AVGNDS-GRTH090","comp_flag_ANN-TMAX-AVGNDS-GRTH090","years_ANN-TMAX-AVGNDS-GRTH090"',
  '"USW00093134","34.0511","-118.2353","70.1","LOS ANGELES DWTN USC CAMPUS, CA US","25.6"," ","S","26"',
].join("\n");

describe("official NOAA climate-normal extraction", () => {
  it("extracts the approved hot-day normal and station metadata", () => {
    expect(extractNoaaHeatStation(stationCsv)).toEqual({
      stationId: "USW00093134",
      name: "LOS ANGELES DWTN USC CAMPUS, CA US",
      latitude: 34.0511,
      longitude: -118.2353,
      elevationMeters: 70.1,
      annualDaysAbove90F: 25.6,
      measurementFlag: "",
      completenessFlag: "S",
      years: 26,
    });
  });

  it("rejects missing variables, unknown stations, and invalid numbers", () => {
    expect(() =>
      extractNoaaHeatStation(stationCsv.replace("LATITUDE", "WRONG")),
    ).toThrow("lacks LATITUDE");
    expect(() =>
      extractNoaaHeatStation(stationCsv.replace("USW00093134", "USW00000000")),
    ).toThrow("is not approved");
    expect(() =>
      extractNoaaHeatStation(stationCsv.replace('"25.6"', '"not-a-number"')),
    ).toThrow("invalid ANN-TMAX-AVGNDS-GRTH090");
  });

  it("extracts all approved station identities from the NOAA inventory", () => {
    const inventory = [
      "USW00023174  33.9381 -118.3889   29.6 CA LOS ANGELES INTL AP                    72295",
      "USW00024233  47.4444 -122.3139  112.8 WA SEATTLE TACOMA INTL AP                 72793",
      "USW00093134  34.0511 -118.2353   70.1 CA LOS ANGELES DWTN USC CAMPUS                 ",
      "USW00094290  47.6872 -122.2553   18.3 WA SEATTLE SAND PT WSFO                        ",
    ].join("\n");
    expect(extractNoaaHeatInventoryStations(inventory)).toEqual({
      USW00023174: {
        name: "LOS ANGELES INTL AP",
        latitude: 33.9381,
        longitude: -118.3889,
        elevationMeters: 29.6,
      },
      USW00024233: {
        name: "SEATTLE TACOMA INTL AP",
        latitude: 47.4444,
        longitude: -122.3139,
        elevationMeters: 112.8,
      },
      USW00093134: {
        name: "LOS ANGELES DWTN USC CAMPUS",
        latitude: 34.0511,
        longitude: -118.2353,
        elevationMeters: 70.1,
      },
      USW00094290: {
        name: "SEATTLE SAND PT WSFO",
        latitude: 47.6872,
        longitude: -122.2553,
        elevationMeters: 18.3,
      },
    });
    expect(() =>
      extractNoaaHeatInventoryStations(
        inventory.replace(/USW00094290.*\n?/, ""),
      ),
    ).toThrow("missing station USW00094290");
  });
});
