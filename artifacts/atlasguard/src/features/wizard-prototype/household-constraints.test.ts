import { describe, expect, it } from "vitest";

import {
  createInitialHouseholdConstraint,
  getHouseholdConstraintDefinitions,
  validateHouseholdConstraint,
} from "./household-constraints";

describe("Household constraint contract", () => {
  it("starts every decision-bearing dimension unknown", () => {
    expect(createInitialHouseholdConstraint()).toEqual({
      relevance: "",
      importance: "",
      status: "",
    });
  });

  it("adapts the board by household mode without hiding structural exclusions", () => {
    const individual = getHouseholdConstraintDefinitions("individual");
    expect(
      individual.filter(({ applies }) => applies).map(({ key }) => key),
    ).toEqual(["supportNetwork", "requiredServices", "carFreeAccess"]);
    expect(
      individual
        .filter(({ applies }) => !applies)
        .map(({ key, notApplicableReason }) => ({ key, notApplicableReason })),
    ).toEqual([
      {
        key: "childcare",
        notApplicableReason: "Not asked for an individual move.",
      },
      {
        key: "school",
        notApplicableReason: "Not asked for an individual move.",
      },
    ]);

    expect(
      getHouseholdConstraintDefinitions("family")
        .filter(({ applies }) => applies)
        .map(({ key }) => key),
    ).toEqual([
      "supportNetwork",
      "childcare",
      "school",
      "requiredServices",
      "carFreeAccess",
    ]);
  });

  it("requires importance and status only for a relevant constraint", () => {
    expect(
      validateHouseholdConstraint("supportNetwork", {
        relevance: "yes",
        importance: "",
        status: "",
      }),
    ).toEqual({
      "householdPlan.supportNetwork.importance":
        "Choose whether nearby support is important or could block the move.",
      "householdPlan.supportNetwork.status":
        "Choose whether nearby support works, does not work, or has not been checked.",
    });

    expect(
      validateHouseholdConstraint("supportNetwork", {
        relevance: "no",
        importance: "",
        status: "",
      }),
    ).toEqual({});
  });
});
