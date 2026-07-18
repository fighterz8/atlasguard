import {
  BenchmarkAdmissionError,
  evaluateMoveDecision,
  evaluateResearchMoveDecision,
} from "@workspace/decision-core";
import type { ScenarioInput } from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { loadLosAngelesToSeattleCommuteBenchmark } from "./la-seattle-commute";

const confirmed = (monthlyCents: number) => ({
  monthlyCents,
  basis: "confirmed" as const,
  plausibleRangeCents: null,
});

const researchScenario = {
  schemaVersion: "1.0.0",
  originMetroSlug: "los-angeles-ca",
  destinationMetroSlug: "seattle-wa",
  finances: {
    origin: {
      takeHomeIncome: confirmed(500_000),
      grossIncome: confirmed(700_000),
      housingCost: confirmed(200_000),
      recurringExpensesExcludingHousing: confirmed(150_000),
    },
    destination: {
      takeHomeIncome: confirmed(500_000),
      grossIncome: confirmed(700_000),
      housingCost: confirmed(200_000),
      recurringExpensesExcludingHousing: confirmed(150_000),
      retainedPropertyNet: confirmed(0),
    },
  },
  priorities: [
    {
      priorityId: "commute_time",
      preferredDirection: "lower",
      weight: 5,
    },
  ],
} satisfies ScenarioInput;

describe("real-data decision-engine integration", () => {
  it("produces a verified deterministic profile without upgrading confidence", () => {
    const result = evaluateResearchMoveDecision(
      researchScenario,
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
        researchScenario,
        loadLosAngelesToSeattleCommuteBenchmark(),
      ),
    ).toThrow(BenchmarkAdmissionError);
  });
});
