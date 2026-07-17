import { z } from "zod/v4";

export const SCENARIO_SCHEMA_VERSION = "1.0.0" as const;

// $100M per month is deliberately far above plausible household values while
// keeping every ScenarioInput financial aggregate well inside safe-integer math.
export const MAX_MONTHLY_CENTS = 10_000_000_000;

export const SignedMonthlyCentsSchema = z
  .number()
  .int()
  .min(-MAX_MONTHLY_CENTS)
  .max(MAX_MONTHLY_CENTS)
  .describe("A signed monthly amount in integer US-dollar cents.");

export const MonthlyCentsSchema =
  SignedMonthlyCentsSchema.nonnegative().describe(
    "A non-negative monthly amount in integer US-dollar cents.",
  );

export const MetroSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Metro slug must use lowercase letters, numbers, and single hyphens.",
  });

export const AssumptionBasisSchema = z.enum([
  "confirmed",
  "user_estimate",
  "assumed_same_as_origin",
]);

export const SignedAssumptionBasisSchema = z.enum([
  "confirmed",
  "user_estimate",
]);

export const PriorityIdSchema = z.enum([
  "climate_heat",
  "climate_cold",
  "climate_precipitation",
  "climate_snow",
  "climate_seasonality",
  "commute_time",
]);

export const PreferredDirectionSchema = z.enum(["lower", "higher"]);

export const PriorityWeightSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export type AssumptionBasis = z.infer<typeof AssumptionBasisSchema>;
export type PriorityId = z.infer<typeof PriorityIdSchema>;
export type PriorityWeight = z.infer<typeof PriorityWeightSchema>;
