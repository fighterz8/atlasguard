import {
  calculateBenchmarkComparisonChecksum,
  type VerifiedBenchmarkComparison,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { composeProfileArtifactUnion } from "./metro-profile-comparison";
import { getSupportedResearchMetroProfile } from "./research-metro-profiles";
import {
  getResearchMetroBenchmark,
  RESEARCH_METRO_BENCHMARK_SHA256,
  researchMetroBenchmarkPairs,
} from "./research-metro-benchmark";
import { loadLosAngelesToSeattleResearchBenchmark } from "./la-seattle-research";

const metric = (
  comparison: VerifiedBenchmarkComparison,
  priorityId: "commute_time" | "climate_heat",
) => {
  const priority = comparison.priorities.find(
    (candidate) => candidate.priorityId === priorityId,
  );
  expect(priority).toBeDefined();
  if (priority === undefined) throw new Error(`Missing ${priorityId}.`);
  return priority.evidence;
};

describe("generated research metro benchmarks", () => {
  it("preserves the exact legacy Los Angeles to Seattle benchmarks", () => {
    for (const direction of ["lower", "higher"] as const) {
      const generated = getResearchMetroBenchmark(
        "los-angeles-ca",
        "seattle-wa",
        direction,
      );
      const legacy = loadLosAngelesToSeattleResearchBenchmark(direction);

      expect(generated).not.toBeNull();
      expect(generated?.snapshot.sha256).toBe(legacy.snapshot.sha256);
      expect(generated).toEqual(legacy);
    }
  });

  it("composes a checksum-bound Austin to San Diego benchmark", () => {
    const comparison = getResearchMetroBenchmark(
      "austin-tx",
      "san-diego-ca",
      "lower",
    );
    expect(comparison).not.toBeNull();
    if (comparison === null) return;

    expect(comparison.origin.slug).toBe("austin-tx");
    expect(comparison.destination.slug).toBe("san-diego-ca");
    expect(comparison.snapshot.admissionStatus).toBe("research_only");
    expect(calculateBenchmarkComparisonChecksum(comparison)).toBe(
      comparison.snapshot.sha256,
    );
    expect(metric(comparison, "commute_time").originValue).toBeCloseTo(
      28.2097375862,
      10,
    );
    expect(metric(comparison, "commute_time").destinationValue).toBeCloseTo(
      26.0618486909,
      10,
    );
    expect(metric(comparison, "climate_heat")).toMatchObject({
      originValue: 122.8,
      destinationValue: 16,
      transformation: { preferredDirection: "lower" },
    });
    expect(comparison.snapshot.sourceArtifacts.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "acs1.2024.geographies",
        "acs1.2024.b08013",
        "noaa.normals.1991-2020.annual-documentation",
        "noaa.normals.usw00013904",
        "noaa.normals.usw00023188",
      ]),
    );
    expect(Object.isFrozen(comparison)).toBe(true);
  });

  it("keeps reverse raw deltas symmetric and climate direction explicit", () => {
    const forward = getResearchMetroBenchmark(
      "seattle-wa",
      "austin-tx",
      "lower",
    );
    const reverse = getResearchMetroBenchmark(
      "austin-tx",
      "seattle-wa",
      "lower",
    );
    const hotter = getResearchMetroBenchmark(
      "seattle-wa",
      "austin-tx",
      "higher",
    );
    expect(forward).not.toBeNull();
    expect(reverse).not.toBeNull();
    expect(hotter).not.toBeNull();
    if (forward === null || reverse === null || hotter === null) return;

    expect(metric(forward, "commute_time").deltaValue).toBeCloseTo(
      -metric(reverse, "commute_time").deltaValue!,
      12,
    );
    expect(metric(forward, "climate_heat").deltaValue).toBeCloseTo(
      -metric(reverse, "climate_heat").deltaValue!,
      12,
    );
    expect(
      metric(forward, "climate_heat").transformation.preferredDirection,
    ).toBe("lower");
    expect(
      metric(hotter, "climate_heat").transformation.preferredDirection,
    ).toBe("higher");
    expect(hotter.snapshot.sha256).not.toBe(forward.snapshot.sha256);
  });

  it("generates 12 directed pairs for each climate direction and fails closed", () => {
    expect(researchMetroBenchmarkPairs).toHaveLength(24);
    expect(
      new Set(
        researchMetroBenchmarkPairs.map(
          ({ originSlug, destinationSlug, climateDirection }) =>
            `${originSlug}:${destinationSlug}:${climateDirection}`,
        ),
      ).size,
    ).toBe(24);
    researchMetroBenchmarkPairs.forEach((pair) => {
      const key =
        `${pair.originSlug}:${pair.destinationSlug}:${pair.climateDirection}` as keyof typeof RESEARCH_METRO_BENCHMARK_SHA256;
      expect(pair.benchmark.snapshot.sha256).toBe(
        RESEARCH_METRO_BENCHMARK_SHA256[key],
      );
    });
    expect(
      new Set(
        researchMetroBenchmarkPairs.map(
          ({ benchmark }) => benchmark.snapshot.sha256,
        ),
      ).size,
    ).toBe(24);
    expect(
      getResearchMetroBenchmark("austin-tx", "austin-tx", "lower"),
    ).toBeNull();
    expect(
      getResearchMetroBenchmark("portland-or", "seattle-wa", "lower"),
    ).toBeNull();
  });

  it("rejects conflicting source lineage instead of selecting one profile", () => {
    const origin = getSupportedResearchMetroProfile("los-angeles-ca")!;
    const destination = structuredClone(
      getSupportedResearchMetroProfile("austin-tx")!,
    );
    const artifact = destination.snapshot.sourceArtifacts.find(
      ({ id }) => id === "acs1.2024.b08013",
    )!;
    artifact.sha256 = "f".repeat(64);

    expect(() => composeProfileArtifactUnion([origin, destination])).toThrow(
      /disagree on artifact acs1\.2024\.b08013/,
    );
  });
});
