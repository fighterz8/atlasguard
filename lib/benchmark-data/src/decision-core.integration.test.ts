import {
  BenchmarkAdmissionError,
  evaluateMoveDecision,
  evaluateMoveWiseAnalysis,
  evaluateResearchMoveDecision,
} from "@workspace/decision-core";
import { describe, expect, it } from "vitest";

import { loadLosAngelesToSeattleResearchBenchmark } from "./la-seattle-research";
import { getResearchMetroBenchmark } from "./research-metro-benchmark";
import { losAngelesToSeattleBalancedResearchScenario } from "./research-scenarios/la-seattle-balanced";

describe("real-data decision-engine integration", () => {
  it("produces a verified deterministic profile without upgrading confidence", () => {
    const scenario = structuredClone(
      losAngelesToSeattleBalancedResearchScenario,
    );
    const climatePriority = scenario.priorities.find(
      ({ priorityId }) => priorityId === "climate_heat",
    );
    if (climatePriority === undefined)
      throw new Error("Missing climate priority.");
    climatePriority.weight = 2;
    const result = evaluateResearchMoveDecision(
      scenario,
      loadLosAngelesToSeattleResearchBenchmark("lower"),
    );
    const commute = result.decisionProfile.priorityChanges.find(
      ({ priorityId }) => priorityId === "commute_time",
    );
    const climate = result.decisionProfile.priorityChanges.find(
      ({ priorityId }) => priorityId === "climate_heat",
    );

    expect(result.resultMode).toBe("deterministic");
    expect(result.releaseStatus).toBe("research_only");
    expect(result.decisionProfile.scenario.origin.cbsaCode).toBe("31080");
    expect(result.decisionProfile.scenario.destination.cbsaCode).toBe("42660");
    expect(commute).toMatchObject({
      utilityDeltaBps: 99,
      classification: "similar",
    });
    expect(climate).toMatchObject({
      utilityDeltaBps: 1_560,
      classification: "improves",
    });
    expect(result.decisionProfile.confidence.level).toBe("limited");
  });

  it("cannot cross the user-facing evaluation gate", () => {
    expect(() =>
      evaluateMoveDecision(
        losAngelesToSeattleBalancedResearchScenario,
        loadLosAngelesToSeattleResearchBenchmark("lower"),
      ),
    ).toThrow(BenchmarkAdmissionError);
  });

  it("recalculates rather than reuses the score when a real metro pair is reversed", () => {
    const analyze = (originMetroSlug: string, destinationMetroSlug: string) => {
      const scenario = structuredClone(
        losAngelesToSeattleBalancedResearchScenario,
      );
      scenario.originMetroSlug = originMetroSlug;
      scenario.destinationMetroSlug = destinationMetroSlug;
      scenario.priorities.find(
        ({ priorityId }) => priorityId === "climate_heat",
      )!.weight = 5;
      scenario.priorities.find(
        ({ priorityId }) => priorityId === "commute_time",
      )!.weight = 3;
      const benchmark = getResearchMetroBenchmark(
        originMetroSlug,
        destinationMetroSlug,
        "lower",
      );
      if (benchmark === null) throw new Error("Missing research benchmark.");
      return evaluateMoveWiseAnalysis(
        evaluateResearchMoveDecision(scenario, benchmark),
      );
    };

    const austinToSanDiego = analyze("austin-tx", "san-diego-ca");
    const sanDiegoToAustin = analyze("san-diego-ca", "austin-tx");

    expect(austinToSanDiego.score.value).toBeGreaterThan(50);
    expect(sanDiegoToAustin.score.value).toBeLessThan(50);
    expect(austinToSanDiego.score.value + sanDiegoToAustin.score.value).toBe(
      100,
    );
    expect(austinToSanDiego.score.inputFingerprintSha256).not.toBe(
      sanDiegoToAustin.score.inputFingerprintSha256,
    );
    expect(austinToSanDiego.score.benchmarkSha256).not.toBe(
      sanDiegoToAustin.score.benchmarkSha256,
    );
    expect(austinToSanDiego.insights.strongestImprovement?.metricId).toBe(
      "climate_heat",
    );
    expect(sanDiegoToAustin.insights.strongestTradeoff?.metricId).toBe(
      "climate_heat",
    );
  });
});
