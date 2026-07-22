import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createResearchResultsViewModel } from "../research-results/model";
import { BriefExportPanel } from "./brief-export-panel";

describe("BriefExportPanel", () => {
  it("previews what leaves the browser and keeps sensitive fields off by default", () => {
    const html = renderToStaticMarkup(
      <BriefExportPanel model={createResearchResultsViewModel()} tasks={[]} />,
    );

    expect(html).toContain("Export or share");
    expect(html).toContain("Generated only in this browser");
    expect(html).toContain("MoveWise does not upload it");
    expect(html).toContain("Included in both files");
    expect(html).toContain("Decision picture and monthly numbers");
    expect(html).toContain("Open and completed verification checks");
    expect(html).toContain("Data freshness and important non-claims");
    expect(html).toContain("Excluded unless you choose otherwise");
    expect(html).toContain("Include private task notes");
    expect(html).toContain("Include evidence links");
    expect(html).toContain("Download JSON");
    expect(html).toContain("Download readable HTML");
    expect(html).toContain("Current brief");
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).not.toContain('checked=""');
  });
});
