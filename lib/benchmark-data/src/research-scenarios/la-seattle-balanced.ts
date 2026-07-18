import type { ScenarioInput } from "@workspace/contracts";

const confirmed = (monthlyCents: number) => ({
  monthlyCents,
  basis: "confirmed" as const,
  plausibleRangeCents: null,
});

/**
 * Fixed, illustrative assumptions for exercising the research-only benchmark.
 * These values are not claims about either metro and must never be presented
 * as user data or a recommended household budget.
 */
export const losAngelesToSeattleBalancedResearchScenario = {
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
