import { describe, expect, it } from "vitest";

import type { DecisionProfile, ScenarioInput } from "./index";
import { deriveFinancialSensitivity } from "./sensitivity";

const confirmed = (monthlyCents: number) => ({
  monthlyCents,
  basis: "confirmed" as const,
  plausibleRangeCents: null,
});

const createScenario = (): ScenarioInput => ({
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
  priorities: [],
});

const noPriorityChanges: DecisionProfile["priorityChanges"] = [];

const breakpointFor = (
  result: ReturnType<typeof deriveFinancialSensitivity>,
  inputPath: string,
  condition: string,
) =>
  result.breakpoints.find(
    (breakpoint) =>
      breakpoint.kind === "money" &&
      breakpoint.inputPath === inputPath &&
      breakpoint.changesConditionTo === condition,
  );

describe("deriveFinancialSensitivity", () => {
  it("finds exact favorable rent, income, and expense thresholds", () => {
    const result = deriveFinancialSensitivity(
      createScenario(),
      noPriorityChanges,
    );

    expect(
      breakpointFor(
        result,
        "finances.destination.takeHomeIncome.monthlyCents",
        "worth_a_closer_look",
      ),
    ).toMatchObject({ operator: "at_or_above", thresholdCents: 525_000 });
    expect(
      breakpointFor(
        result,
        "finances.destination.housingCost.monthlyCents",
        "worth_a_closer_look",
      ),
    ).toMatchObject({ operator: "at_or_below", thresholdCents: 175_000 });
    expect(
      breakpointFor(
        result,
        "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
        "worth_a_closer_look",
      ),
    ).toMatchObject({ operator: "at_or_below", thresholdCents: 125_000 });
  });

  it("finds the first cent that creates high financial risk", () => {
    const result = deriveFinancialSensitivity(
      createScenario(),
      noPriorityChanges,
    );

    expect(
      breakpointFor(
        result,
        "finances.destination.takeHomeIncome.monthlyCents",
        "high_financial_risk_under_assumptions",
      ),
    ).toMatchObject({ operator: "at_or_below", thresholdCents: 349_999 });
    expect(
      breakpointFor(
        result,
        "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
        "high_financial_risk_under_assumptions",
      ),
    ).toMatchObject({ operator: "at_or_above", thresholdCents: 300_001 });
  });

  it("marks the result assumption-sensitive when a threshold is in range", () => {
    const scenario = createScenario();
    scenario.finances.destination.takeHomeIncome = {
      monthlyCents: 500_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 475_000, max: 550_000 },
    };
    scenario.finances.destination.housingCost = {
      monthlyCents: 200_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 170_000, max: 240_000 },
    };

    const result = deriveFinancialSensitivity(scenario, noPriorityChanges);

    expect(result.stability.level).toBe("assumption_sensitive");
    expect(result.stability.breakpointIds).toEqual(
      expect.arrayContaining([
        expect.stringContaining("take_home.worth_a_closer_look.525000"),
        expect.stringContaining("housing.worth_a_closer_look.175000"),
      ]),
    );
  });

  it("marks bounded assumptions stable when no threshold is in range", () => {
    const scenario = createScenario();
    scenario.finances.destination.housingCost = {
      monthlyCents: 200_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 190_000, max: 210_000 },
    };

    const result = deriveFinancialSensitivity(scenario, noPriorityChanges);

    expect(result.stability).toEqual({
      level: "stable",
      breakpointIds: [],
      reasonCodes: ["stability.no_in_range_condition_change"],
    });
  });

  it("does not overclaim stability when no plausible range exists", () => {
    const result = deriveFinancialSensitivity(
      createScenario(),
      noPriorityChanges,
    );

    expect(result.stability).toEqual({
      level: "not_evaluated",
      breakpointIds: [],
      reasonCodes: ["stability.no_plausible_ranges"],
    });
    expect(result.breakpoints.length).toBeGreaterThan(0);
  });
});
