import { DeterministicModelInputSchema } from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { evaluateDeterministicModel } from "./deterministic-model-0-2";

const runtimeInput = () => ({
  originMetroSlug: "origin-metro",
  destinationMetroSlug: "destination-metro",
  monthlyCushionDeltaCents: 80_000,
  destinationMonthlyCushionCents: 160_000,
  destinationMonthlyCushionRangeCents: null,
  financialMaterialityThresholdCents: 25_000,
  lowCushionCautionThresholdCents: 50_000,
  destinationHousingBurdenBps: null,
  commuteImpact: "neutral" as const,
  climateImpact: "excluded" as const,
  householdMode: "individual" as const,
  householdSignals: [
    { signalId: "space_fit", impact: "excluded" as const },
    { signalId: "support_network", impact: "strong_negative" as const },
    {
      signalId: "required_services_continuity",
      impact: "unavailable" as const,
    },
    { signalId: "car_free_access", impact: "unavailable" as const },
  ],
  essentialRequirements: [
    { requirementId: "car_free_access", status: "unconfirmed" as const },
  ],
});

describe("MoveWise deterministic runtime input", () => {
  it("preserves available, excluded, and unavailable household states", () => {
    const parsed = DeterministicModelInputSchema.parse(runtimeInput());
    const result = evaluateDeterministicModel(parsed);

    expect(result).toMatchObject({
      value: 59,
      condition: "promising_if",
      conditionalRequirementIds: ["car_free_access"],
      metricContributions: {
        household: {
          status: "partial",
          contribution: -15,
          signals: [
            {
              signalId: "space_fit",
              status: "excluded",
              contribution: 0,
            },
            {
              signalId: "support_network",
              status: "available",
              contribution: -15,
            },
            {
              signalId: "required_services_continuity",
              status: "unavailable",
              contribution: 0,
            },
            {
              signalId: "car_free_access",
              status: "unavailable",
              contribution: 0,
            },
          ],
        },
      },
    });
  });

  it("keeps an explicitly excluded household component distinct", () => {
    const input = runtimeInput();
    input.householdSignals = input.householdSignals.map((signal) => ({
      ...signal,
      impact: "excluded" as const,
    }));
    input.essentialRequirements = [];

    expect(
      evaluateDeterministicModel(DeterministicModelInputSchema.parse(input)),
    ).toMatchObject({
      metricContributions: {
        household: { status: "excluded", contribution: 0 },
      },
    });
  });

  it("rejects missing, reordered, and mode-inapplicable household factors", () => {
    const invalidInputs = [
      {
        ...runtimeInput(),
        householdSignals: runtimeInput().householdSignals.slice(1),
      },
      {
        ...runtimeInput(),
        householdSignals: [...runtimeInput().householdSignals].reverse(),
      },
      {
        ...runtimeInput(),
        householdSignals: [
          ...runtimeInput().householdSignals.slice(0, 2),
          { signalId: "childcare_continuity", impact: "neutral" as const },
          ...runtimeInput().householdSignals.slice(2),
        ],
      },
    ];

    for (const input of invalidInputs) {
      expect(DeterministicModelInputSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  it("rejects essential requirements that are absent, excluded, or mode-inapplicable", () => {
    for (const requirementId of [
      "space_fit",
      "childcare_continuity",
      "unknown_factor",
    ]) {
      expect(
        DeterministicModelInputSchema.safeParse({
          ...runtimeInput(),
          essentialRequirements: [
            { requirementId, status: "unconfirmed" as const },
          ],
        }).success,
      ).toBe(false);
    }
  });
});
