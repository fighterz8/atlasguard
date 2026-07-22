import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PrioritiesStep } from "./priorities-step";

describe("PrioritiesStep", () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
  });

  it("does not preselect decision-bearing daily-life answers", () => {
    const html = renderToStaticMarkup(
      <PrioritiesStep
        commuteImportance=""
        climateHeatPreference=""
        climateHeatImportance=""
        onCommuteChange={vi.fn()}
        onClimatePreferenceChange={vi.fn()}
        onClimateImportanceChange={vi.fn()}
      />,
    );

    expect(html).not.toContain('checked=""');
    expect(html).not.toContain("How much should this heat preference count?");
  });

  it("shows heat importance only after a deliberate direction choice", () => {
    const html = renderToStaticMarkup(
      <PrioritiesStep
        commuteImportance="important"
        climateHeatPreference="fewer_hot_days"
        climateHeatImportance="important"
        onCommuteChange={vi.fn()}
        onClimatePreferenceChange={vi.fn()}
        onClimateImportanceChange={vi.fn()}
      />,
    );

    expect(html).toContain("How much should this heat preference count?");
    expect(html.match(/checked=""/g)).toHaveLength(3);
  });
});
