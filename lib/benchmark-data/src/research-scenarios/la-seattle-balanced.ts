import type { ScenarioInput } from "@workspace/contracts";

import { LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON } from "../supported-research-locations";

const confirmed = (monthlyCents: number) => ({
  monthlyCents,
  basis: "confirmed" as const,
  plausibleRangeCents: null,
});

const estimate = (monthlyCents: number, min: number, max: number) => ({
  monthlyCents,
  basis: "user_estimate" as const,
  plausibleRangeCents: { min, max },
});

/**
 * Fixed, illustrative assumptions for exercising the research-only benchmark.
 * These values are not claims about either metro and must never be presented
 * as user data or a recommended household budget.
 */
export const losAngelesToSeattleBalancedResearchScenario = {
  schemaVersion: "1.0.0",
  originMetroSlug: LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON.origin.slug,
  destinationMetroSlug:
    LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON.destination.slug,
  finances: {
    origin: {
      takeHomeIncome: confirmed(500_000),
      grossIncome: confirmed(700_000),
      housingCost: confirmed(200_000),
      recurringExpensesExcludingHousing: confirmed(150_000),
    },
    destination: {
      takeHomeIncome: estimate(500_000, 475_000, 550_000),
      grossIncome: confirmed(700_000),
      housingCost: estimate(200_000, 170_000, 240_000),
      recurringExpensesExcludingHousing: estimate(150_000, 120_000, 180_000),
      retainedPropertyNet: confirmed(0),
    },
  },
  priorities: [
    {
      priorityId: "climate_heat",
      preferredDirection: "lower",
      weight: 0,
    },
    {
      priorityId: "commute_time",
      preferredDirection: "lower",
      weight: 5,
    },
  ],
} satisfies ScenarioInput;
