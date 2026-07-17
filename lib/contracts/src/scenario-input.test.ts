import { describe, expect, it } from "vitest";

import { financialAndClimateUpsideInput } from "./fixtures/financial-and-climate-upside-v1";
import { MAX_MONTHLY_CENTS } from "./primitives";
import { ScenarioInputSchema } from "./scenario-input";

const cloneFixture = () =>
  ScenarioInputSchema.parse(financialAndClimateUpsideInput);

const issuePaths = (input: unknown): string[] => {
  const result = ScenarioInputSchema.safeParse(input);
  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected ScenarioInput validation to fail.");
  }

  return result.error.issues.map((issue) => issue.path.join("."));
};

describe("ScenarioInputSchema", () => {
  it("accepts the locked financial and climate fixture", () => {
    expect(ScenarioInputSchema.parse(financialAndClimateUpsideInput)).toEqual(
      financialAndClimateUpsideInput,
    );
  });

  it("accepts same-metro, financial-only scenarios with unknown gross income", () => {
    const input = cloneFixture();
    input.destinationMetroSlug = input.originMetroSlug;
    input.finances.destination.grossIncome = null;
    input.priorities = [];

    expect(ScenarioInputSchema.safeParse(input).success).toBe(true);
  });

  it("rejects unnecessary identity fields", () => {
    const input = { ...cloneFixture(), email: "person@example.com" };

    expect(ScenarioInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects fractional cents at the correct field path", () => {
    const input = cloneFixture();
    input.finances.origin.takeHomeIncome.monthlyCents = 500_000.5;

    expect(issuePaths(input)).toContain(
      "finances.origin.takeHomeIncome.monthlyCents",
    );
  });

  it("caps monthly fields so aggregate arithmetic stays safely integral", () => {
    const input = cloneFixture();
    input.finances.origin.takeHomeIncome.monthlyCents = MAX_MONTHLY_CENTS + 1;

    expect(issuePaths(input)).toContain(
      "finances.origin.takeHomeIncome.monthlyCents",
    );
  });

  it("rejects a confirmed amount with a plausible range", () => {
    const input = cloneFixture();
    input.finances.origin.takeHomeIncome.plausibleRangeCents = {
      min: 450_000,
      max: 550_000,
    };

    expect(issuePaths(input)).toContain(
      "finances.origin.takeHomeIncome.plausibleRangeCents",
    );
  });

  it("rejects a range that excludes the entered amount", () => {
    const input = cloneFixture();
    input.finances.destination.housingCost.plausibleRangeCents = {
      min: 180_000,
      max: 190_000,
    };

    expect(issuePaths(input)).toContain(
      "finances.destination.housingCost.plausibleRangeCents",
    );
  });

  it("rejects reversed unsigned and signed plausible ranges", () => {
    const input = cloneFixture();
    input.finances.destination.housingCost.plausibleRangeCents = {
      min: 180_000,
      max: 160_000,
    };
    input.finances.destination.retainedPropertyNet = {
      monthlyCents: -10_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 0, max: -20_000 },
    };

    expect(issuePaths(input)).toEqual(
      expect.arrayContaining([
        "finances.destination.housingCost.plausibleRangeCents.max",
        "finances.destination.retainedPropertyNet.plausibleRangeCents.max",
      ]),
    );
  });

  it("applies integer and domain bounds to signed retained-property values", () => {
    const fractional = cloneFixture();
    fractional.finances.destination.retainedPropertyNet.monthlyCents = -0.5;
    expect(issuePaths(fractional)).toContain(
      "finances.destination.retainedPropertyNet.monthlyCents",
    );

    const outsideDomain = cloneFixture();
    outsideDomain.finances.destination.retainedPropertyNet.monthlyCents =
      -MAX_MONTHLY_CENTS - 1;
    expect(issuePaths(outsideDomain)).toContain(
      "finances.destination.retainedPropertyNet.monthlyCents",
    );
  });

  it("rejects duplicate priority IDs at the duplicate", () => {
    const input = cloneFixture();
    input.priorities[1] = {
      priorityId: "climate_heat",
      preferredDirection: "higher",
      weight: 3,
    };

    expect(issuePaths(input)).toContain("priorities.1.priorityId");
  });

  it("rejects a preference for longer commutes", () => {
    const input = cloneFixture();
    input.priorities[1].preferredDirection = "higher";

    expect(issuePaths(input)).toContain("priorities.1.preferredDirection");
  });

  it("rejects an origin value marked as assumed from the origin", () => {
    const input = cloneFixture();
    input.finances.origin.housingCost.basis = "assumed_same_as_origin";

    expect(issuePaths(input)).toContain("finances.origin.housingCost.basis");
  });

  it("requires assumed destination values to equal their origin counterparts", () => {
    const input = cloneFixture();
    input.finances.destination.housingCost = {
      monthlyCents: 160_000,
      basis: "assumed_same_as_origin",
      plausibleRangeCents: null,
    };

    expect(issuePaths(input)).toContain(
      "finances.destination.housingCost.monthlyCents",
    );

    input.finances.destination.housingCost.monthlyCents = 150_000;
    expect(ScenarioInputSchema.safeParse(input).success).toBe(true);
  });

  it("preserves an estimated origin range when the destination copies it", () => {
    const input = cloneFixture();
    input.finances.origin.housingCost = {
      monthlyCents: 150_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 140_000, max: 160_000 },
    };
    input.finances.destination.housingCost = {
      monthlyCents: 150_000,
      basis: "assumed_same_as_origin",
      plausibleRangeCents: null,
    };

    expect(issuePaths(input)).toContain(
      "finances.destination.housingCost.plausibleRangeCents",
    );

    input.finances.destination.housingCost.plausibleRangeCents = {
      min: 140_000,
      max: 160_000,
    };
    expect(ScenarioInputSchema.safeParse(input).success).toBe(true);
  });

  it("keeps zero-weight priorities without redistributing them", () => {
    const input = cloneFixture();
    input.priorities[0].weight = 0;

    const parsed = ScenarioInputSchema.parse(input);
    expect(parsed.priorities[0].weight).toBe(0);
  });
});
