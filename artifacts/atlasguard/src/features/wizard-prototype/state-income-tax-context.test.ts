import { describe, expect, it } from "vitest";

import { getStateIncomeTaxContext } from "./state-income-tax-context";

describe("MoveWise state income-tax context", () => {
  it("explains why copying California take-home to Texas is unsafe", () => {
    expect(getStateIncomeTaxContext("san-diego-ca", "austin-tx")).toMatchObject(
      {
        version: "state-wage-income-tax-context-2026-07-19",
        direction: "destination_may_increase_take_home",
        headline: "State wage taxes may improve destination take-home",
        origin: { stateCode: "CA", treatment: "state_income_tax_applies" },
        destination: {
          stateCode: "TX",
          treatment: "no_individual_state_income_tax",
        },
        boundary: expect.stringContaining("does not calculate your paycheck"),
      },
    );
  });

  it("reverses the caution for a move into California", () => {
    expect(
      getStateIncomeTaxContext("austin-tx", "los-angeles-ca"),
    ).toMatchObject({
      direction: "destination_may_reduce_take_home",
      headline: "California state income tax may reduce destination take-home",
    });
  });

  it("does not manufacture a tax advantage between Washington and Texas", () => {
    expect(getStateIncomeTaxContext("seattle-wa", "austin-tx")).toMatchObject({
      direction: "no_state_income_tax_difference",
      headline: "No state individual-income-tax difference identified",
    });
  });
});
