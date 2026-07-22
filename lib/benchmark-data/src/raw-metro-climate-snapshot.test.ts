import { describe, expect, it } from "vitest";

import {
  noaaHotDaysAustinRawSnapshot,
  noaaHotDaysSanDiegoRawSnapshot,
} from "./raw/noaa-hot-days-austin-san-diego";
import {
  calculateRawMetroClimateSnapshotChecksum,
  RawMetroClimateSnapshotChecksumMismatchError,
  RawMetroClimateSnapshotRegistryMismatchError,
  verifyRawMetroClimateSnapshot,
} from "./raw-metro-climate-snapshot";

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

describe("independent NOAA metro snapshots", () => {
  it("locks Austin and San Diego to independent checksums", () => {
    expect(
      calculateRawMetroClimateSnapshotChecksum(noaaHotDaysAustinRawSnapshot),
    ).toBe("ff28337ec41a6a34849e5246c778cdd6f2fedab2c0f484edab2ccff547ea4492");
    expect(
      calculateRawMetroClimateSnapshotChecksum(noaaHotDaysSanDiegoRawSnapshot),
    ).toBe("93b8b2faf459b76bf2b5876695a552cb17dce6ca388f7d9857f448c5e4295f0c");
  });

  it("preserves the official station values and completeness classes", () => {
    const austin = verifyRawMetroClimateSnapshot(noaaHotDaysAustinRawSnapshot);
    const sanDiego = verifyRawMetroClimateSnapshot(
      noaaHotDaysSanDiegoRawSnapshot,
    );

    expect(
      austin.stations.map(({ annualDaysAbove90F }) => annualDaysAbove90F),
    ).toEqual([122.8, 123.5]);
    expect(
      austin.stations.map(({ completenessFlag }) => completenessFlag),
    ).toEqual(["S", "S"]);
    expect(
      sanDiego.stations.map(({ annualDaysAbove90F }) => annualDaysAbove90F),
    ).toEqual([16, 3]);
    expect(
      sanDiego.stations.map(({ completenessFlag }) => completenessFlag),
    ).toEqual(["R", "R"]);
    expect(Object.isFrozen(sanDiego.stations[0])).toBe(true);
  });

  it("rejects relabeling Representative evidence as Standard", () => {
    const changed = clone(noaaHotDaysSanDiegoRawSnapshot);
    changed.stations[0]!.completenessFlag = "S";

    expect(() => verifyRawMetroClimateSnapshot(changed)).toThrow(
      "NOAA Standard completeness requires at least 24 years.",
    );
  });

  it("rejects source mutations and stale checksums", () => {
    const changed = clone(noaaHotDaysAustinRawSnapshot);
    changed.stations[0]!.annualDaysAbove90F += 0.1;
    changed.sha256 = calculateRawMetroClimateSnapshotChecksum(changed);

    expect(() => verifyRawMetroClimateSnapshot(changed)).toThrow(
      RawMetroClimateSnapshotRegistryMismatchError,
    );
    changed.stations[0]!.annualDaysAbove90F -= 0.1;
    changed.sha256 = "f".repeat(64);
    expect(() => verifyRawMetroClimateSnapshot(changed)).toThrow(
      RawMetroClimateSnapshotChecksumMismatchError,
    );
  });
});
