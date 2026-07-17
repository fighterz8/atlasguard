import { describe, expect, it } from "vitest";

import {
  BenchmarkChecksumMismatchError,
  BenchmarkComparisonSchema,
  calculateBenchmarkComparisonChecksum,
  deriveMetricQualityGrade,
  PartialBenchmarkEvidenceError,
  serializeBenchmarkComparisonForChecksum,
  verifyBenchmarkComparison,
} from "./benchmark";
import { sha256Hex } from "./canonical-json";
import { financialAndClimateUpsideBenchmark } from "./fixtures/financial-and-climate-upside-benchmark-v1";

const cloneBenchmark = () =>
  BenchmarkComparisonSchema.parse(financialAndClimateUpsideBenchmark);

const issuePaths = (input: unknown): string[] => {
  const result = BenchmarkComparisonSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
};

describe("BenchmarkComparisonSchema", () => {
  it("accepts the locked synthetic benchmark with complete provenance", () => {
    expect(
      BenchmarkComparisonSchema.parse(financialAndClimateUpsideBenchmark),
    ).toEqual(financialAndClimateUpsideBenchmark);
  });

  it("binds transformed utility outputs to each priority", () => {
    const comparison = cloneBenchmark();
    comparison.priorities[0].originUtilityBps = 3_001;

    expect(issuePaths(comparison)).toContain(
      "priorities.0.evidence.transformation.outputs",
    );
  });

  it("recomputes utilities from raw metric values and direction", () => {
    const comparison = cloneBenchmark();
    comparison.priorities[0].evidence.transformation.preferredDirection =
      "higher";

    expect(issuePaths(comparison)).toContain(
      "priorities.0.evidence.transformation.outputs",
    );
  });

  it("binds the registered metric and transformation to its priority", () => {
    const comparison = cloneBenchmark();
    const commute = comparison.priorities.find(
      (priority) => priority.priorityId === "commute_time",
    );
    expect(commute).toBeDefined();
    if (commute === undefined) return;

    commute.transformationId = "climate_heat.utility";
    commute.evidence.metricId = "climate.annual_hot_days";
    commute.evidence.unit = "days";
    commute.evidence.originValue = 38;
    commute.evidence.destinationValue = 41;
    commute.evidence.deltaValue = 3;
    commute.evidence.transformation.id = "climate_heat.utility";

    expect(issuePaths(comparison)).toContain(
      "priorities.1.evidence.transformation",
    );
  });

  it("binds materiality thresholds to the registered metric policy", () => {
    const comparison = cloneBenchmark();
    const commute = comparison.priorities.find(
      (priority) => priority.priorityId === "commute_time",
    );
    expect(commute).toBeDefined();
    if (commute === undefined) return;

    commute.materialityThresholdBps = 1;
    commute.evidence.materialityPolicy.utilityDeltaBps = 1;

    expect(issuePaths(comparison)).toContain(
      "priorities.1.evidence.transformation",
    );
  });

  it("binds raw missingness to transformed utility availability", () => {
    const comparison = cloneBenchmark();
    const evidence = comparison.priorities[0].evidence;
    evidence.originValue = null;
    evidence.deltaValue = null;
    evidence.quality.missingness = "partial";

    expect(issuePaths(comparison)).toContain(
      "priorities.0.evidence.transformation.outputs.originUtilityBps",
    );
  });

  it("derives the versioned quality grade from evidence quality", () => {
    const comparison = cloneBenchmark();
    comparison.priorities[0].evidence.quality.coverageBps = 9_000;

    expect(issuePaths(comparison)).toContain(
      "priorities.0.evidence.quality.grade.value",
    );
  });

  it.each([
    {
      label: "current exact high-coverage evidence",
      overrides: {},
      expected: "high",
    },
    {
      label: "stale evidence",
      overrides: { freshness: "stale" as const },
      expected: "limited",
    },
    {
      label: "proxy geography",
      overrides: { destinationGeographyMatch: "mapped_proxy" as const },
      expected: "moderate",
    },
    {
      label: "sub-95% coverage",
      overrides: { coverageBps: 9_000 },
      expected: "moderate",
    },
    {
      label: "more than 5% transformed uncertainty",
      overrides: { destinationUncertaintyBps: 501 },
      expected: "moderate",
    },
  ])("grades $label as $expected", ({ overrides, expected }) => {
    expect(
      deriveMetricQualityGrade({
        freshness: "current",
        missingness: "complete",
        coverageBps: 10_000,
        originGeographyMatch: "exact",
        destinationGeographyMatch: "exact",
        originUncertaintyBps: 0,
        destinationUncertaintyBps: 0,
        ...overrides,
      }),
    ).toBe(expected);
  });

  it("rejects evidence from a different snapshot", () => {
    const comparison = cloneBenchmark();
    comparison.priorities[0].evidence.snapshotVersion = "2.0.0";

    expect(issuePaths(comparison)).toContain(
      "priorities.0.evidence.snapshotVersion",
    );
  });

  it("reserves the benchmark evidence namespace", () => {
    const comparison = cloneBenchmark();
    comparison.priorities[0].evidence.id = "input.destination.housing";

    expect(issuePaths(comparison)).toContain("priorities.0.evidence.id");
  });

  it("rejects an exact geography that does not match the resolved CBSA", () => {
    const comparison = cloneBenchmark();
    comparison.priorities[0].evidence.geographies.destination.code = "99999";

    expect(issuePaths(comparison)).toContain(
      "priorities.0.evidence.geographies.destination",
    );
  });

  it("rejects changed place metrics for a same-metro comparison", () => {
    const comparison = cloneBenchmark();
    comparison.destination = BenchmarkComparisonSchema.parse(
      financialAndClimateUpsideBenchmark,
    ).origin;
    comparison.priorities.forEach((priority) => {
      priority.evidence.geographies.destination = {
        ...priority.evidence.geographies.origin,
      };
    });

    expect(issuePaths(comparison)).toContain(
      "priorities.0.evidence.deltaValue",
    );
  });
});

describe("verifyBenchmarkComparison", () => {
  it("uses the browser-safe SHA-256 implementation", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("returns a checksum-verified, deeply frozen benchmark", () => {
    const verified = verifyBenchmarkComparison(
      financialAndClimateUpsideBenchmark,
    );

    expect(calculateBenchmarkComparisonChecksum(verified)).toBe(
      verified.snapshot.sha256,
    );
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.priorities[0].evidence)).toBe(true);
    expect(() => {
      const mutableView = verified as unknown as {
        snapshot: { version: string };
      };
      mutableView.snapshot.version = "2.0.0";
    }).toThrow(TypeError);
  });

  it("rejects a schema-valid mutation whose declared checksum is stale", () => {
    const comparison = cloneBenchmark();
    comparison.priorities[0].evidence.definition += " Mutated.";

    expect(() => verifyBenchmarkComparison(comparison)).toThrow(
      BenchmarkChecksumMismatchError,
    );
  });

  it("treats priority reordering as checksum-equivalent", () => {
    const comparison = cloneBenchmark();
    comparison.priorities.reverse();

    expect(serializeBenchmarkComparisonForChecksum(comparison)).toBe(
      serializeBenchmarkComparisonForChecksum(
        financialAndClimateUpsideBenchmark,
      ),
    );
    expect(() => verifyBenchmarkComparison(comparison)).not.toThrow();
    expect(
      verifyBenchmarkComparison(comparison).priorities.map(
        (priority) => priority.priorityId,
      ),
    ).toEqual(["climate_heat", "commute_time"]);
  });

  it("rejects checksum-valid partial evidence at promotion", () => {
    const comparison = cloneBenchmark();
    const priority = comparison.priorities[0];
    priority.destinationUtilityBps = null;
    priority.evidence.destinationValue = null;
    priority.evidence.deltaValue = null;
    priority.evidence.transformation.outputs.destinationUtilityBps = null;
    priority.evidence.transformation.outputs.destinationUncertaintyBps = null;
    priority.evidence.quality.missingness = "partial";
    priority.evidence.quality.grade.value = "limited";
    const checksum = calculateBenchmarkComparisonChecksum(comparison);
    comparison.snapshot.sha256 = checksum;
    comparison.priorities.forEach((entry) => {
      entry.evidence.snapshotSha256 = checksum;
    });

    expect(() => verifyBenchmarkComparison(comparison)).toThrow(
      PartialBenchmarkEvidenceError,
    );
  });
});
