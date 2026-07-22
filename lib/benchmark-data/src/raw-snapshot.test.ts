import { describe, expect, it } from "vitest";

import { acs2024CommuteLaSeattleRawSnapshot } from "./raw/acs1-2024-commute-la-seattle";
import {
  calculateRawCommuteSnapshotChecksum,
  RawSnapshotChecksumMismatchError,
  RawSnapshotRegistryMismatchError,
  verifyRawCommuteSnapshot,
} from "./raw-snapshot";

const cloneRawSnapshot = () =>
  structuredClone(acs2024CommuteLaSeattleRawSnapshot);

describe("frozen ACS commute source snapshot", () => {
  it("matches its pinned canonical checksum and is deeply frozen", () => {
    expect(
      calculateRawCommuteSnapshotChecksum(acs2024CommuteLaSeattleRawSnapshot),
    ).toBe("eca676ec38e93ffc771aade9125aa58d2978bee7df157b9120dd42c52a3aa9a9");

    const verified = verifyRawCommuteSnapshot(
      acs2024CommuteLaSeattleRawSnapshot,
    );
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.metros)).toBe(true);
    expect(Object.isFrozen(verified.metros[0])).toBe(true);
  });

  it("rejects a source-row mutation under the pinned checksum", () => {
    const mutated = cloneRawSnapshot();
    mutated.metros[0].aggregateTravelTimeMinutes.estimate += 1;

    expect(() => verifyRawCommuteSnapshot(mutated)).toThrow(
      RawSnapshotChecksumMismatchError,
    );
  });

  it("rejects an unapproved artifact even if its raw checksum is recomputed", () => {
    const mutated = cloneRawSnapshot();
    mutated.artifacts.b08013.sourceUrl =
      "https://www2.census.gov/unapproved.dat";
    mutated.sha256 = calculateRawCommuteSnapshotChecksum(mutated);

    expect(() => verifyRawCommuteSnapshot(mutated)).toThrow(
      RawSnapshotRegistryMismatchError,
    );
  });

  it("rejects a geography remap even if its raw checksum is recomputed", () => {
    const mutated = cloneRawSnapshot();
    mutated.metros[1].cbsaCode = "00000";
    mutated.metros[1].acsGeoId = "310M700US00000";
    mutated.sha256 = calculateRawCommuteSnapshotChecksum(mutated);

    expect(() => verifyRawCommuteSnapshot(mutated)).toThrow(
      RawSnapshotRegistryMismatchError,
    );
  });

  it("rejects changed extracted values even if the raw checksum is recomputed", () => {
    const mutated = cloneRawSnapshot();
    mutated.metros[0].aggregateTravelTimeMinutes.estimate += 1;
    mutated.sha256 = calculateRawCommuteSnapshotChecksum(mutated);

    expect(() => verifyRawCommuteSnapshot(mutated)).toThrow(
      RawSnapshotRegistryMismatchError,
    );
  });
});
