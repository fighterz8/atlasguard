import { describe, expect, it } from "vitest";

import { deriveCommuteMetric } from "./commute-derivation";
import {
  acs2024AustinRawSnapshot,
  acs2024SanDiegoRawSnapshot,
} from "./raw/acs1-2024-austin-san-diego";
import {
  calculateRawMetroAcsSnapshotChecksum,
  RawMetroAcsSnapshotChecksumMismatchError,
  RawMetroAcsSnapshotRegistryMismatchError,
  verifyRawMetroAcsSnapshot,
} from "./raw-metro-acs-snapshot";

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

describe("independent ACS metro snapshots", () => {
  it("locks Austin and San Diego to independent checksums", () => {
    expect(calculateRawMetroAcsSnapshotChecksum(acs2024AustinRawSnapshot)).toBe(
      "bfd7be4f42f6e41efebc26974544e7f1fec12ab2ae9131010e7eb1a766ff6a98",
    );
    expect(
      calculateRawMetroAcsSnapshotChecksum(acs2024SanDiegoRawSnapshot),
    ).toBe("0a4480e64d834d9dfa7fdadaf539d3d4c6d0747bf52837156f3249383a66926d");
  });

  it("verifies exact ACS values and derived commute metrics", () => {
    const austin = verifyRawMetroAcsSnapshot(acs2024AustinRawSnapshot);
    const sanDiego = verifyRawMetroAcsSnapshot(acs2024SanDiegoRawSnapshot);

    expect(deriveCommuteMetric(austin.metro).meanMinutes).toBeCloseTo(
      28.2097375862,
      10,
    );
    expect(deriveCommuteMetric(austin.metro).marginOfError90Minutes).toBe(
      0.7344681732764602,
    );
    expect(deriveCommuteMetric(sanDiego.metro).meanMinutes).toBeCloseTo(
      26.0618486909,
      10,
    );
    expect(austin.metro.medianGrossRentDollars).toBe(1_784);
    expect(sanDiego.metro.medianGrossRentDollars).toBe(2_336);
    expect(Object.isFrozen(austin.metro.aggregateTravelTimeMinutes)).toBe(true);
  });

  it("rejects a source mutation and a stale checksum", () => {
    const changed = clone(acs2024AustinRawSnapshot);
    changed.metro.aggregateTravelTimeMinutes.estimate += 1;

    expect(() => verifyRawMetroAcsSnapshot(changed)).toThrow(
      RawMetroAcsSnapshotRegistryMismatchError,
    );
    changed.metro.aggregateTravelTimeMinutes.estimate -= 1;
    changed.sha256 = "f".repeat(64);
    expect(() => verifyRawMetroAcsSnapshot(changed)).toThrow(
      RawMetroAcsSnapshotChecksumMismatchError,
    );
  });

  it("rejects unapproved geography even with a recomputed checksum", () => {
    const changed = clone(acs2024SanDiegoRawSnapshot);
    changed.metro.cbsaCode = "99999";
    changed.metro.acsGeoId = "310M700US99999";
    changed.sha256 = calculateRawMetroAcsSnapshotChecksum(changed);

    expect(() => verifyRawMetroAcsSnapshot(changed)).toThrow(
      RawMetroAcsSnapshotRegistryMismatchError,
    );
  });
});
