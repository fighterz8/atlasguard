import {
  BenchmarkComparisonSchema,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import {
  loadLosAngelesToSeattleResearchBenchmark,
  LOS_ANGELES_SEATTLE_RESEARCH_RAW_SHA256,
} from "./la-seattle-research";

describe("combined LA to Seattle research benchmark", () => {
  it("binds commute and fewer-hot-days evidence into one research snapshot", () => {
    const benchmark = loadLosAngelesToSeattleResearchBenchmark("lower");
    const climate = benchmark.priorities.find(
      ({ priorityId }) => priorityId === "climate_heat",
    );
    expect(benchmark.snapshot.rawSnapshot.sha256).toBe(
      LOS_ANGELES_SEATTLE_RESEARCH_RAW_SHA256,
    );
    expect(benchmark.priorities).toHaveLength(2);
    expect(climate).toMatchObject({
      originUtilityBps: 8_440,
      destinationUtilityBps: 10_000,
      evidence: {
        originValue: 25.6,
        destinationValue: 2.1,
        deltaValue: -23.5,
        geographies: {
          origin: { code: "USW00093134", matchQuality: "mapped_proxy" },
          destination: { code: "USW00094290", matchQuality: "mapped_proxy" },
        },
        transformation: {
          preferredDirection: "lower",
          outputs: {
            originUncertaintyBps: 1_560,
            destinationUncertaintyBps: 0,
          },
        },
        quality: {
          coverageBps: null,
          grade: { value: "limited" },
          selectionUncertainty: {
            origin: { min: 4.8, max: 25.6 },
            destination: { min: 2.1, max: 3.8 },
          },
        },
      },
    });
  });

  it("reverses the same evidence for a more-hot-days preference", () => {
    const climate = loadLosAngelesToSeattleResearchBenchmark(
      "higher",
    ).priorities.find(({ priorityId }) => priorityId === "climate_heat");
    expect(climate).toMatchObject({
      originUtilityBps: 1_560,
      destinationUtilityBps: 0,
      evidence: { transformation: { preferredDirection: "higher" } },
    });
  });

  it("rejects fabricated selection ranges even under a re-signed comparison", () => {
    const mutated = structuredClone(
      loadLosAngelesToSeattleResearchBenchmark("lower"),
    );
    const climate = mutated.priorities.find(
      ({ priorityId }) => priorityId === "climate_heat",
    );
    if (climate === undefined) throw new Error("Missing climate evidence.");
    const selection = climate.evidence.quality.selectionUncertainty;
    if (selection === undefined) throw new Error("Missing selection range.");
    selection.origin.min = 25.6;
    expect(BenchmarkComparisonSchema.safeParse(mutated).success).toBe(false);
    expect(() => verifyBenchmarkComparison(mutated)).toThrow();
  });

  it("loads without request-time network access", () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (() => {
      calls += 1;
      throw new Error("Research benchmark must remain offline.");
    }) as typeof fetch;
    try {
      expect(
        loadLosAngelesToSeattleResearchBenchmark("lower").priorities,
      ).toHaveLength(2);
      expect(calls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
