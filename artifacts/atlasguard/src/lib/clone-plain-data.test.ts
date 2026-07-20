import { describe, expect, it } from "vitest";

import { clonePlainData } from "./clone-plain-data";

describe("clonePlainData", () => {
  it("deeply clones Wizard-shaped plain data without browser clone APIs", () => {
    const source = {
      originSlug: "los-angeles-ca",
      finances: { targetHousing: "2200", range: ["2000", "2400"] },
      optional: undefined,
    };

    const clone = clonePlainData(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.finances).not.toBe(source.finances);
    expect(clone.finances.range).not.toBe(source.finances.range);
  });

  it("fails closed for values outside the plain-data boundary", () => {
    expect(() => clonePlainData(new Date())).toThrow(
      "MoveWise can clone only plain data values.",
    );
  });
});
