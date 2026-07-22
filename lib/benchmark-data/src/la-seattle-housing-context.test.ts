import { describe, expect, it } from "vitest";

import { calculateContextMetricComparisonChecksum } from "@workspace/contracts";

import {
  loadLosAngelesToSeattleHousingContext,
  LOS_ANGELES_SEATTLE_HOUSING_CONTEXT_SHA256,
  promoteLosAngelesToSeattleHousingContext,
} from "./la-seattle-housing-context";
import { acs2024RentLaSeattleRawSnapshot } from "./raw/acs1-2024-rent-la-seattle";
import { verifyRawHousingSnapshot } from "./raw-housing-snapshot";

describe("LA to Seattle housing context", () => {
  it("promotes exact ACS values as context-only evidence", () => {
    const comparison = loadLosAngelesToSeattleHousingContext();

    expect(comparison.decisionUse).toBe("context_only");
    expect(comparison.interpretationBoundary).toBe(
      "descriptive_not_user_budget",
    );
    expect(comparison.metric.originValue).toBe(211_400);
    expect(comparison.metric.destinationValue).toBe(205_000);
    expect(comparison.metric.deltaValue).toBe(-6_400);
    expect(comparison.metric.marginOfError90).toEqual({
      origin: 1_300,
      destination: 2_500,
    });
  });

  it("keeps the promoted checksum locked", () => {
    const comparison = loadLosAngelesToSeattleHousingContext();

    expect(calculateContextMetricComparisonChecksum(comparison)).toBe(
      LOS_ANGELES_SEATTLE_HOUSING_CONTEXT_SHA256,
    );
    expect(comparison.snapshot.sha256).toBe(
      LOS_ANGELES_SEATTLE_HOUSING_CONTEXT_SHA256,
    );
  });

  it("retains source-row and raw-snapshot lineage", () => {
    const comparison = loadLosAngelesToSeattleHousingContext();

    expect(comparison.metric.sourceRows).toEqual({
      origin: "GEO_ID=310M700US31080",
      destination: "GEO_ID=310M700US42660",
    });
    expect(comparison.snapshot.rawSnapshot.sha256).toBe(
      "a281fd6f24152a9908bf51d62119a701b653adec91d5633fc5f70c8e683608c1",
    );
  });

  it("preserves the original raw-snapshot promotion API", () => {
    const snapshot = verifyRawHousingSnapshot(acs2024RentLaSeattleRawSnapshot);

    expect(promoteLosAngelesToSeattleHousingContext(snapshot)).toEqual(
      loadLosAngelesToSeattleHousingContext(),
    );
  });
});
