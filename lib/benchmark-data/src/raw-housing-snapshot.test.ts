import { describe, expect, it } from "vitest";

import { acs2024RentLaSeattleRawSnapshot } from "./raw/acs1-2024-rent-la-seattle";
import {
  RawHousingSnapshotChecksumMismatchError,
  verifyRawHousingSnapshot,
} from "./raw-housing-snapshot";

const clone = () =>
  JSON.parse(
    JSON.stringify(acs2024RentLaSeattleRawSnapshot),
  ) as typeof acs2024RentLaSeattleRawSnapshot;

describe("verifyRawHousingSnapshot", () => {
  it("verifies and freezes the approved Census extraction", () => {
    const verified = verifyRawHousingSnapshot(acs2024RentLaSeattleRawSnapshot);

    expect(verified.metros[0]?.medianGrossRentDollars).toBe(2_114);
    expect(Object.isFrozen(verified.metros)).toBe(true);
  });

  it("rejects a stale checksum after an extracted value changes", () => {
    const changed = clone();
    changed.metros[0]!.medianGrossRentDollars += 1;

    expect(() => verifyRawHousingSnapshot(changed)).toThrow(
      "record is not approved",
    );
  });

  it("rejects an unapproved source artifact even with valid shape", () => {
    const changed = clone();
    changed.artifacts.b25064.sha256 = "f".repeat(64);

    expect(() => verifyRawHousingSnapshot(changed)).toThrow(
      "artifact b25064 is not approved",
    );
  });

  it("rejects a stale raw-snapshot checksum", () => {
    const changed = clone();
    changed.sha256 = "f".repeat(64);

    expect(() => verifyRawHousingSnapshot(changed)).toThrow(
      RawHousingSnapshotChecksumMismatchError,
    );
  });
});
