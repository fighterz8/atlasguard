import { z } from "zod/v4";

import {
  AssumptionBasisSchema,
  MetroSlugSchema,
  MonthlyCentsSchema,
  PreferredDirectionSchema,
  PriorityIdSchema,
  PriorityWeightSchema,
  SCENARIO_SCHEMA_VERSION,
  SignedAssumptionBasisSchema,
  SignedMonthlyCentsSchema,
} from "./primitives";

const MoneyRangeSchema = z
  .object({
    min: MonthlyCentsSchema,
    max: MonthlyCentsSchema,
  })
  .strict()
  .superRefine((range, context) => {
    if (range.min > range.max) {
      context.addIssue({
        code: "custom",
        message: "Plausible range minimum must not exceed its maximum.",
        path: ["max"],
      });
    }
  });

const SignedMoneyRangeSchema = z
  .object({
    min: SignedMonthlyCentsSchema,
    max: SignedMonthlyCentsSchema,
  })
  .strict()
  .superRefine((range, context) => {
    if (range.min > range.max) {
      context.addIssue({
        code: "custom",
        message: "Plausible range minimum must not exceed its maximum.",
        path: ["max"],
      });
    }
  });

export const MoneyAssumptionSchema = z
  .object({
    monthlyCents: MonthlyCentsSchema,
    basis: AssumptionBasisSchema,
    plausibleRangeCents: MoneyRangeSchema.nullable(),
  })
  .strict()
  .superRefine((assumption, context) => {
    const range = assumption.plausibleRangeCents;

    if (assumption.basis === "confirmed" && range !== null) {
      context.addIssue({
        code: "custom",
        message: "A confirmed amount cannot include a plausible range.",
        path: ["plausibleRangeCents"],
      });
    }

    if (
      range !== null &&
      (assumption.monthlyCents < range.min ||
        assumption.monthlyCents > range.max)
    ) {
      context.addIssue({
        code: "custom",
        message: "Plausible range must contain the entered monthly amount.",
        path: ["plausibleRangeCents"],
      });
    }
  });

export const SignedMoneyAssumptionSchema = z
  .object({
    monthlyCents: SignedMonthlyCentsSchema,
    basis: SignedAssumptionBasisSchema,
    plausibleRangeCents: SignedMoneyRangeSchema.nullable(),
  })
  .strict()
  .superRefine((assumption, context) => {
    const range = assumption.plausibleRangeCents;

    if (assumption.basis === "confirmed" && range !== null) {
      context.addIssue({
        code: "custom",
        message: "A confirmed amount cannot include a plausible range.",
        path: ["plausibleRangeCents"],
      });
    }

    if (
      range !== null &&
      (assumption.monthlyCents < range.min ||
        assumption.monthlyCents > range.max)
    ) {
      context.addIssue({
        code: "custom",
        message: "Plausible range must contain the entered monthly amount.",
        path: ["plausibleRangeCents"],
      });
    }
  });

export const BudgetInputSchema = z
  .object({
    takeHomeIncome: MoneyAssumptionSchema,
    grossIncome: MoneyAssumptionSchema.nullable(),
    housingCost: MoneyAssumptionSchema,
    recurringExpensesExcludingHousing: MoneyAssumptionSchema,
  })
  .strict();

export const DestinationBudgetInputSchema = BudgetInputSchema.extend({
  retainedPropertyNet: SignedMoneyAssumptionSchema,
}).strict();

export const PriorityInputSchema = z
  .object({
    priorityId: PriorityIdSchema,
    preferredDirection: PreferredDirectionSchema,
    weight: PriorityWeightSchema,
  })
  .strict();

export const ScenarioInputSchema = z
  .object({
    schemaVersion: z.literal(SCENARIO_SCHEMA_VERSION),
    originMetroSlug: MetroSlugSchema,
    destinationMetroSlug: MetroSlugSchema,
    finances: z
      .object({
        origin: BudgetInputSchema,
        destination: DestinationBudgetInputSchema,
      })
      .strict(),
    priorities: z
      .array(PriorityInputSchema)
      .max(PriorityIdSchema.options.length),
  })
  .strict()
  .superRefine((scenario, context) => {
    const seenPriorityIds = new Set<string>();

    scenario.priorities.forEach((priority, index) => {
      if (seenPriorityIds.has(priority.priorityId)) {
        context.addIssue({
          code: "custom",
          message: "Priority IDs must be unique.",
          path: ["priorities", index, "priorityId"],
        });
      }
      seenPriorityIds.add(priority.priorityId);

      if (
        priority.priorityId === "commute_time" &&
        priority.preferredDirection !== "lower"
      ) {
        context.addIssue({
          code: "custom",
          message: "Commute time can only prefer lower values.",
          path: ["priorities", index, "preferredDirection"],
        });
      }
    });

    const originAssumptions = [
      ["takeHomeIncome", scenario.finances.origin.takeHomeIncome],
      ["grossIncome", scenario.finances.origin.grossIncome],
      ["housingCost", scenario.finances.origin.housingCost],
      [
        "recurringExpensesExcludingHousing",
        scenario.finances.origin.recurringExpensesExcludingHousing,
      ],
    ] as const;

    originAssumptions.forEach(([field, assumption]) => {
      if (assumption?.basis === "assumed_same_as_origin") {
        context.addIssue({
          code: "custom",
          message: "Origin amounts cannot be assumed from the origin.",
          path: ["finances", "origin", field, "basis"],
        });
      }
    });

    const pairedAssumptions = [
      [
        "takeHomeIncome",
        scenario.finances.origin.takeHomeIncome,
        scenario.finances.destination.takeHomeIncome,
      ],
      [
        "grossIncome",
        scenario.finances.origin.grossIncome,
        scenario.finances.destination.grossIncome,
      ],
      [
        "housingCost",
        scenario.finances.origin.housingCost,
        scenario.finances.destination.housingCost,
      ],
      [
        "recurringExpensesExcludingHousing",
        scenario.finances.origin.recurringExpensesExcludingHousing,
        scenario.finances.destination.recurringExpensesExcludingHousing,
      ],
    ] as const;

    pairedAssumptions.forEach(([field, origin, destination]) => {
      if (destination?.basis !== "assumed_same_as_origin") {
        return;
      }

      if (origin === null || destination.monthlyCents !== origin.monthlyCents) {
        context.addIssue({
          code: "custom",
          message:
            "An amount assumed from the origin must equal the corresponding origin amount.",
          path: ["finances", "destination", field, "monthlyCents"],
        });
      }

      const originRange = origin?.plausibleRangeCents ?? null;
      const destinationRange = destination.plausibleRangeCents;
      const rangesMatch =
        originRange === null
          ? destinationRange === null
          : destinationRange !== null &&
            originRange.min === destinationRange.min &&
            originRange.max === destinationRange.max;

      if (!rangesMatch) {
        context.addIssue({
          code: "custom",
          message:
            "An amount assumed from the origin must preserve the origin's plausible range.",
          path: ["finances", "destination", field, "plausibleRangeCents"],
        });
      }
    });
  });

export type MoneyAssumption = z.infer<typeof MoneyAssumptionSchema>;
export type SignedMoneyAssumption = z.infer<typeof SignedMoneyAssumptionSchema>;
export type BudgetInput = z.infer<typeof BudgetInputSchema>;
export type DestinationBudgetInput = z.infer<
  typeof DestinationBudgetInputSchema
>;
export type PriorityInput = z.infer<typeof PriorityInputSchema>;
export type ScenarioInput = z.infer<typeof ScenarioInputSchema>;
