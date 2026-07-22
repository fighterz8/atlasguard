import { calculateContextMetricComparisonChecksum } from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { loadLosAngelesToSeattleHousingContext } from "./la-seattle-housing-context";
import { getResearchMetroHousingContext } from "./research-metro-housing-context";

describe("generated research metro housing context", () => {
  it("preserves the exact legacy Los Angeles to Seattle context", () => {
    const generated = getResearchMetroHousingContext(
      "los-angeles-ca",
      "seattle-wa",
    );
    const legacy = loadLosAngelesToSeattleHousingContext();

    expect(generated).not.toBeNull();
    expect(generated?.snapshot.sha256).toBe(legacy.snapshot.sha256);
    expect(generated).toEqual(legacy);
  });

  it("composes exact Austin and San Diego context without entering the decision", () => {
    const context = getResearchMetroHousingContext("austin-tx", "san-diego-ca");
    expect(context).not.toBeNull();
    if (context === null) return;

    expect(context).toMatchObject({
      decisionUse: "context_only",
      interpretationBoundary: "descriptive_not_user_budget",
      origin: { slug: "austin-tx", cbsaCode: "12420" },
      destination: { slug: "san-diego-ca", cbsaCode: "41740" },
      metric: {
        originValue: 178_400,
        destinationValue: 233_600,
        deltaValue: 55_200,
        marginOfError90: { origin: 2_000, destination: 2_000 },
      },
    });
    expect(calculateContextMetricComparisonChecksum(context)).toBe(
      context.snapshot.sha256,
    );
    expect(Object.isFrozen(context)).toBe(true);
  });

  it("keeps reverse deltas symmetric and fails closed", () => {
    const forward = getResearchMetroHousingContext(
      "los-angeles-ca",
      "austin-tx",
    );
    const reverse = getResearchMetroHousingContext(
      "austin-tx",
      "los-angeles-ca",
    );
    expect(forward).not.toBeNull();
    expect(reverse).not.toBeNull();
    expect(forward?.metric.deltaValue).toBe(-reverse!.metric.deltaValue);
    expect(
      getResearchMetroHousingContext("seattle-wa", "seattle-wa"),
    ).toBeNull();
    expect(getResearchMetroHousingContext("unknown", "seattle-wa")).toBeNull();
  });
});
