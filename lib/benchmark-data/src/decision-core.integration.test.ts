import {
  BenchmarkAdmissionError,
  evaluateMoveDecision,
  evaluateResearchMoveDecision,
} from "@workspace/decision-core";
import { describe, expect, it } from "vitest";

import { loadLosAngelesToSeattleCommuteBenchmark } from "./la-seattle-commute";
import { losAngelesToSeattleBalancedResearchScenario } from "./research-scenarios/la-seattle-balanced";

describe("real-data decision-engine integration", () => {
  it("produces a verified deterministic profile without upgrading confidence", () => {
    const result = evaluateResearchMoveDecision(
      losAngelesToSeattleBalancedResearchScenario,
      loadLosAngelesToSeattleCommuteBenchmark(),
    );
    const change = result.decisionProfile.priorityChanges[0];

    expect(result.resultMode).toBe("deterministic");
    expect(result.releaseStatus).toBe("research_only");
    expect(result.decisionProfile.scenario.origin.cbsaCode).toBe("31080");
    expect(result.decisionProfile.scenario.destination.cbsaCode).toBe("42660");
    expect(change.priorityId).toBe("commute_time");
    expect(change.utilityDeltaBps).toBe(99);
    expect(change.classification).toBe("similar");
    expect(result.decisionProfile.confidence.level).toBe("limited");
  });

  it("cannot cross the user-facing evaluation gate", () => {
    expect(() =>
      evaluateMoveDecision(
        losAngelesToSeattleBalancedResearchScenario,
        loadLosAngelesToSeattleCommuteBenchmark(),
      ),
    ).toThrow(BenchmarkAdmissionError);
  });
});
