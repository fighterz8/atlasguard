import type { ScenarioInput } from "../scenario-input";

export const financialAndClimateUpsideInput = {
  schemaVersion: "1.0.0",
  originMetroSlug: "fixture-river",
  destinationMetroSlug: "fixture-pine",
  finances: {
    origin: {
      takeHomeIncome: {
        monthlyCents: 500_000,
        basis: "confirmed",
        plausibleRangeCents: null,
      },
      grossIncome: {
        monthlyCents: 700_000,
        basis: "confirmed",
        plausibleRangeCents: null,
      },
      housingCost: {
        monthlyCents: 150_000,
        basis: "confirmed",
        plausibleRangeCents: null,
      },
      recurringExpensesExcludingHousing: {
        monthlyCents: 230_000,
        basis: "confirmed",
        plausibleRangeCents: null,
      },
    },
    destination: {
      takeHomeIncome: {
        monthlyCents: 560_000,
        basis: "confirmed",
        plausibleRangeCents: null,
      },
      grossIncome: {
        monthlyCents: 770_000,
        basis: "confirmed",
        plausibleRangeCents: null,
      },
      housingCost: {
        monthlyCents: 170_000,
        basis: "user_estimate",
        plausibleRangeCents: { min: 160_000, max: 180_000 },
      },
      recurringExpensesExcludingHousing: {
        monthlyCents: 240_000,
        basis: "user_estimate",
        plausibleRangeCents: { min: 230_000, max: 250_000 },
      },
      retainedPropertyNet: {
        monthlyCents: 0,
        basis: "confirmed",
        plausibleRangeCents: null,
      },
    },
  },
  priorities: [
    {
      priorityId: "climate_heat",
      preferredDirection: "lower",
      weight: 5,
    },
    {
      priorityId: "commute_time",
      preferredDirection: "lower",
      weight: 3,
    },
  ],
} as const satisfies ScenarioInput;
