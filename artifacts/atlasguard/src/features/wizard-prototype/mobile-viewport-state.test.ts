import { describe, expect, it } from "vitest";

import { isLikelySoftKeyboardOpen } from "./mobile-viewport-state";

describe("mobile viewport state", () => {
  it("detects a material visual-viewport reduction", () => {
    expect(isLikelySoftKeyboardOpen(844, 510)).toBe(true);
  });

  it("ignores normal browser chrome and small viewport changes", () => {
    expect(isLikelySoftKeyboardOpen(844, 760)).toBe(false);
    expect(isLikelySoftKeyboardOpen(1000, 880)).toBe(false);
  });

  it("fails closed for unavailable or invalid viewport dimensions", () => {
    expect(isLikelySoftKeyboardOpen(0, 500)).toBe(false);
    expect(isLikelySoftKeyboardOpen(844, 0)).toBe(false);
    expect(isLikelySoftKeyboardOpen(Number.NaN, 500)).toBe(false);
  });
});
