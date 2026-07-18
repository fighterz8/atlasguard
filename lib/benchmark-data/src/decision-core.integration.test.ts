import {
  BenchmarkAdmissionError,
  evaluateMoveDecision,
  evaluateResearchMoveDecision,
} from "@workspace/decision-core";
import { describe, expect, it } from "vitest";

import { loadLosAngelesToSeattleResearchBenchmark } from "./la-seattle-research";
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
});
