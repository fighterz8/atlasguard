import { describe, expect, it } from "vitest";

import { noaa1991To2020HotDaysLaSeattleRawSnapshot } from "./raw/noaa-1991-2020-hot-days-la-seattle";
import {
  calculateRawClimateSnapshotChecksum,
  RawClimateSnapshotChecksumMismatchError,
  RawClimateSnapshotRegistryMismatchError,
  verifyRawClimateSnapshot,
} from "./raw-climate-snapshot";

const clone = () => structuredClone(noaa1991To2020HotDaysLaSeattleRawSnapshot);

describe("frozen NOAA hot-day source snapshot", () => {
  it("matches its canonical checksum and freezes every nested value", () => {
    expect(
      calculateRawClimateSnapshotChecksum(
        noaa1991To2020HotDaysLaSeattleRawSnapshot,
      ),
    ).toBe("81685716052413640b9808048e200de0e2ad4aa9483a41bfca4c7c3c29ff5083");
    const verified = verifyRawClimateSnapshot(
      noaa1991To2020HotDaysLaSeattleRawSnapshot,
    );
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.stations)).toBe(true);
    expect(Object.isFrozen(verified.places[0].envelopeStationIds)).toBe(true);
  });

  it("rejects source-value mutation under the pinned checksum", () => {
    const mutated = clone();
    mutated.stations[0].annualDaysAbove90F += 0.1;
    expect(() => verifyRawClimateSnapshot(mutated)).toThrow(
      RawClimateSnapshotChecksumMismatchError,
    );
  });

  it("rejects re-signed source and selection mutations", () => {
    const artifactMutation = clone();
    artifactMutation.artifacts.losAngelesUrban.sourceUrl =
      "https://www.ncei.noaa.gov/unapproved.csv";
    artifactMutation.sha256 =
      calculateRawClimateSnapshotChecksum(artifactMutation);
    expect(() => verifyRawClimateSnapshot(artifactMutation)).toThrow(
      RawClimateSnapshotRegistryMismatchError,
    );

    const selectionMutation = clone();
    selectionMutation.places[0].referenceStationId = "USW00023174";
    selectionMutation.sha256 =
      calculateRawClimateSnapshotChecksum(selectionMutation);
    expect(() => verifyRawClimateSnapshot(selectionMutation)).toThrow(
      RawClimateSnapshotRegistryMismatchError,
    );
  });

  it("rejects a re-signed extracted-value mutation", () => {
    const mutated = clone();
    mutated.stations[2].annualDaysAbove90F = 3.8;
    mutated.sha256 = calculateRawClimateSnapshotChecksum(mutated);
    expect(() => verifyRawClimateSnapshot(mutated)).toThrow(
      RawClimateSnapshotRegistryMismatchError,
    );
  });
});
