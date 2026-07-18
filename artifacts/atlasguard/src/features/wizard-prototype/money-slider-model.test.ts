import { describe, expect, it } from "vitest";

import { createMoneySliderModel } from "./money-slider-model";

describe("Money slider model", () => {
  it("uses category-specific bounds and useful exploration steps", () => {
    expect(
      createMoneySliderModel({
        kind: "take_home",
        currentValue: "5000",
        destinationValue: "5250",
      }),
    ).toMatchObject({ minimum: 0, maximum: 12_000, step: 100 });

    expect(
      createMoneySliderModel({
        kind: "housing",
        currentValue: "2000",
        destinationValue: "1750",
      }),
    ).toMatchObject({ minimum: 0, maximum: 6_000, step: 50 });
  });

  it("expands its maximum around unusually large direct entries", () => {
    const model = createMoneySliderModel({
      kind: "expenses",
      currentValue: "12000",
      destinationValue: "15000",
    });

    expect(model.maximum).toBe(18_750);
    expect(model.sliderValue).toBe(15_000);
  });

  it("describes signed current-to-destination changes", () => {
    expect(
      createMoneySliderModel({
        kind: "take_home",
        currentValue: "5,000",
        destinationValue: "5250",
      }),
    ).toMatchObject({
      delta: 250,
      deltaText: "+$250 per month",
      deltaDirection: "up",
      valueText: "$5,250 per month",
    });

    expect(
      createMoneySliderModel({
        kind: "housing",
        currentValue: "2000",
        destinationValue: "1750",
      }),
    ).toMatchObject({
      delta: -250,
      deltaText: "−$250 per month",
      deltaDirection: "down",
    });
  });

  it("keeps incomplete or invalid direct entry honest", () => {
    expect(
      createMoneySliderModel({
        kind: "housing",
        currentValue: "",
        destinationValue: "nope",
      }),
    ).toMatchObject({
      sliderValue: 0,
      delta: null,
      deltaText: "Enter both amounts to compare",
      deltaDirection: "unknown",
      valueText: "No destination amount entered",
    });
  });
});
