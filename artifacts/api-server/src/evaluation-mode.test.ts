import { describe, expect, it } from "vitest";

import { resolveEvaluationMode } from "./evaluation-mode";

describe("MoveWise evaluation mode", () => {
  it.each([undefined, "", "disabled"])(
    "fails closed when configured as %s",
    (rawMode) => {
      expect(resolveEvaluationMode(rawMode, "development")).toBe("disabled");
    },
  );

  it("allows explicit research mode outside production", () => {
    expect(resolveEvaluationMode("research", "development")).toBe("research");
    expect(resolveEvaluationMode("research", "test")).toBe("research");
  });

  it("refuses research mode in production", () => {
    expect(() => resolveEvaluationMode("research", "production")).toThrow(
      "Research evaluation cannot be enabled in a production process.",
    );
  });

  it("rejects ambiguous capability values", () => {
    expect(() => resolveEvaluationMode("true", "development")).toThrow(
      "MOVEWISE_EVALUATION_MODE must be either disabled or research.",
    );
  });
});
