import { describe, expect, it } from "vitest";

import { isResearchPreviewEnabled } from "./preview-gate";

describe("research preview gate", () => {
  it("is fail-closed", () => {
    expect(isResearchPreviewEnabled(undefined)).toBe(false);
    expect(isResearchPreviewEnabled(false)).toBe(false);
    expect(isResearchPreviewEnabled("TRUE")).toBe(false);
    expect(isResearchPreviewEnabled("1")).toBe(false);
  });

  it("opens only for the explicit true string", () => {
    expect(isResearchPreviewEnabled("true")).toBe(true);
  });
});
