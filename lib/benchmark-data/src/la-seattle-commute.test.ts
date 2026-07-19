import {
  BenchmarkComparisonSchema,
  BenchmarkChecksumMismatchError,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { deriveCommuteMetric } from "./commute-derivation";
import {
  loadLosAngelesToSeattleCommuteBenchmark,
  LOS_ANGELES_SEATTLE_COMMUTE_COMPARISON_SHA256,
  promoteLosAngelesToSeattleCommuteBenchmark,
} from "./la-seattle-commute";
import { acs2024CommuteLaSeattleRawSnapshot } from "./raw/acs1-2024-commute-la-seattle";
import { verifyRawCommuteSnapshot } from "./raw-snapshot";

describe("Los Angeles to Seattle ACS commute benchmark", () => {
  it("reproduces the means, approximate MOEs, and full-precision utilities", () => {
    const snapshot = verifyRawCommuteSnapshot(
      acs2024CommuteLaSeattleRawSnapshot,
    );
    const origin = deriveCommuteMetric(snapshot.metros[0]);
    const destination = deriveCommuteMetric(snapshot.metros[1]);

    expect(origin.meanMinutes).toBeCloseTo(30.6554308347, 10);
    expect(origin.marginOfError90Minutes).toBeCloseTo(0.3242903717, 10);
    expect(origin.displayMeanMinutes).toBe(30.7);
    expect(origin.displayMarginOfError90Minutes).toBe(0.3);
    expect(origin.utilityBps).toBe(6_802);
    expect(origin.utilityUncertaintyBps).toBe(49);
    expect(destination.meanMinutes).toBeCloseTo(29.9946334214, 10);
    expect(destination.marginOfError90Minutes).toBeCloseTo(0.535085883, 9);
    expect(destination.displayMeanMinutes).toBe(30);
    expect(destination.displayMarginOfError90Minutes).toBe(0.5);
    expect(destination.utilityBps).toBe(6_901);
    expect(destination.utilityUncertaintyBps).toBe(80);
  });

  it("promotes one exact-CBSA, checksum-verified, research-only comparison", () => {
    const benchmark = loadLosAngelesToSeattleCommuteBenchmark();
    const evidence = benchmark.priorities[0].evidence;

    expect(benchmark.origin.cbsaCode).toBe("31080");
    expect(benchmark.destination.cbsaCode).toBe("42660");
    expect(benchmark.snapshot.sha256).toBe(
      LOS_ANGELES_SEATTLE_COMMUTE_COMPARISON_SHA256,
    );
    expect(benchmark.priorities).toHaveLength(1);
    expect(benchmark.snapshot.rawSnapshot).toEqual({
      id: "acs1.2024.commute.la-seattle",
      sha256:
        "eca676ec38e93ffc771aade9125aa58d2978bee7df157b9120dd42c52a3aa9a9",
    });
    expect(
      benchmark.snapshot.sourceArtifacts.map((artifact) => artifact.id),
    ).toEqual([
      "census.cbsa-delineation.2023-07",
      "acs1.2024.geographies",
      "acs1.2024.b08013",
      "acs1.2024.b08006",
    ]);
    expect(evidence.originValue).toBeCloseTo(30.6554308347, 10);
    expect(evidence.destinationValue).toBeCloseTo(29.9946334214, 10);
    expect(evidence.deltaValue).toBeCloseTo(-0.6607974133, 10);
    expect(evidence.quality.marginOfError?.origin).toBeCloseTo(
      0.3242903717,
      10,
    );
    expect(evidence.quality.marginOfError?.destination).toBeCloseTo(
      0.535085883,
      9,
    );
    expect(evidence.quality.coverageBps).toBeNull();
    expect(evidence.quality.grade.value).toBe("limited");
    expect(benchmark.origin.selectedPlaceMapping).toMatchObject({
      method: "official_cbsa_title_match",
      sourceArtifactId: "acs1.2024.geographies",
    });
    expect(Object.isFrozen(benchmark)).toBe(true);
  });

  it("preserves the original raw-snapshot promotion API", () => {
    const snapshot = verifyRawCommuteSnapshot(
      acs2024CommuteLaSeattleRawSnapshot,
    );

    expect(promoteLosAngelesToSeattleCommuteBenchmark(snapshot)).toEqual(
      loadLosAngelesToSeattleCommuteBenchmark(),
    );
  });

  it("rejects a promoted-evidence mutation under the snapshot checksum", () => {
    const mutated = structuredClone(loadLosAngelesToSeattleCommuteBenchmark());
    mutated.priorities[0].evidence.definition = "Mutated definition.";

    expect(() => verifyBenchmarkComparison(mutated)).toThrow(
      BenchmarkChecksumMismatchError,
    );
  });

  it("rejects evidence and place mappings outside snapshot lineage", () => {
    const badEvidence = structuredClone(
      loadLosAngelesToSeattleCommuteBenchmark(),
    );
    badEvidence.priorities[0].evidence.source.sourceUrl =
      "https://www.census.gov/mutated";
    expect(BenchmarkComparisonSchema.safeParse(badEvidence).success).toBe(
      false,
    );

    const badMapping = structuredClone(
      loadLosAngelesToSeattleCommuteBenchmark(),
    );
    badMapping.origin.selectedPlaceMapping.sourceArtifactId =
      "acs1.2024.b08006";
    expect(BenchmarkComparisonSchema.safeParse(badMapping).success).toBe(false);
  });

  it("loads and promotes without request-time network access", () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (() => {
      fetchCalls += 1;
      throw new Error("Benchmark loading must remain offline.");
    }) as typeof fetch;

    try {
      expect(loadLosAngelesToSeattleCommuteBenchmark().priorities).toHaveLength(
        1,
      );
      expect(fetchCalls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
