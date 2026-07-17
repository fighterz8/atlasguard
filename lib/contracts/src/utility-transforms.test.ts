import { describe, expect, it } from "vitest";

import { applyRegisteredUtilityTransform } from "./utility-transforms";

describe("applyRegisteredUtilityTransform", () => {
  it.each([
    ["climate.annual_hot_days", "climate_heat.utility", "days", 80, 3_000],
    ["climate.annual_hot_days", "climate_heat.utility", "days", 40, 7_000],
    ["commute.mean_minutes", "commute_time.utility", "minutes", 28, 7_200],
    ["commute.mean_minutes", "commute_time.utility", "minutes", 30, 6_900],
  ])(
    "recomputes %s/%s at %s raw=%s",
    (metricId, transformationId, unit, rawValue, utilityBps) => {
      expect(
        applyRegisteredUtilityTransform({
          metricId,
          transformationId,
          transformationVersion: "1.0.0",
          unit,
          preferredDirection: "lower",
          rawValue,
        }),
      ).toEqual({ status: "ok", utilityBps });
    },
  );

  it("reverses climate utility when the user prefers more heat", () => {
    expect(
      applyRegisteredUtilityTransform({
        metricId: "climate.annual_hot_days",
        transformationId: "climate_heat.utility",
        transformationVersion: "1.0.0",
        unit: "days",
        preferredDirection: "higher",
        rawValue: 80,
      }),
    ).toEqual({ status: "ok", utilityBps: 7_000 });
  });

  it("rejects unregistered metric, version, unit, or direction combinations", () => {
    expect(
      applyRegisteredUtilityTransform({
        metricId: "commute.mean_minutes",
        transformationId: "commute_time.utility",
        transformationVersion: "1.0.0",
        unit: "minutes",
        preferredDirection: "higher",
        rawValue: 28,
      }),
    ).toEqual({ status: "unsupported" });
  });

  it("rejects physically invalid raw values", () => {
    expect(
      applyRegisteredUtilityTransform({
        metricId: "climate.annual_hot_days",
        transformationId: "climate_heat.utility",
        transformationVersion: "1.0.0",
        unit: "days",
        preferredDirection: "lower",
        rawValue: 367,
      }),
    ).toEqual({ status: "unsupported" });
  });
});
