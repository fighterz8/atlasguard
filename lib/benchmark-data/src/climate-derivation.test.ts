import { describe, expect, it } from "vitest";

import { deriveClimateHeatMetric } from "./climate-derivation";
import { noaa1991To2020HotDaysLaSeattleRawSnapshot } from "./raw/noaa-1991-2020-hot-days-la-seattle";
import { verifyRawClimateSnapshot } from "./raw-climate-snapshot";

const snapshot = verifyRawClimateSnapshot(
  noaa1991To2020HotDaysLaSeattleRawSnapshot,
);

describe("NOAA hot-day preference transformation", () => {
  it("derives fewer-hot-days utilities and station-selection uncertainty", () => {
    expect(deriveClimateHeatMetric(snapshot, "origin", "lower")).toEqual({
      referenceStationId: "USW00093134",
      referenceStationName: "LOS ANGELES DWTN USC CAMPUS, CA US",
      annualDaysAbove90F: 25.6,
      envelopeMinDays: 4.8,
      envelopeMaxDays: 25.6,
      utilityBps: 8_440,
      utilityUncertaintyBps: 1_560,
    });
    expect(deriveClimateHeatMetric(snapshot, "destination", "lower")).toEqual({
      referenceStationId: "USW00094290",
      referenceStationName: "SEATTLE SAND PT WSFO, WA US",
      annualDaysAbove90F: 2.1,
      envelopeMinDays: 2.1,
      envelopeMaxDays: 3.8,
      utilityBps: 10_000,
      utilityUncertaintyBps: 0,
    });
  });

  it("reverses utilities without changing the station envelope", () => {
    expect(deriveClimateHeatMetric(snapshot, "origin", "higher")).toMatchObject(
      {
        annualDaysAbove90F: 25.6,
        utilityBps: 1_560,
        utilityUncertaintyBps: 1_560,
      },
    );
    expect(
      deriveClimateHeatMetric(snapshot, "destination", "higher"),
    ).toMatchObject({
      annualDaysAbove90F: 2.1,
      utilityBps: 0,
      utilityUncertaintyBps: 0,
    });
  });
});
