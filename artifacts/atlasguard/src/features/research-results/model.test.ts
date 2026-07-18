import { describe, expect, it } from "vitest";

import { createResearchResultsViewModel } from "./model";

describe("research results view model", () => {
  it("renders only the canonical research evaluation", () => {
    const model = createResearchResultsViewModel();

    expect(model.releaseStatus).toBe("research_only");
    expect(model.route.originCity).toBe("Los Angeles");
    expect(model.route.destinationCity).toBe("Seattle");
    expect(model.condition.label).toBe("No clear advantage yet");
    expect(model.confidence.level).toBe("limited");
    expect(model.stability.level).toBe("not_evaluated");
  });

  it("keeps illustrative finances separate from the benchmark metric", () => {
    const model = createResearchResultsViewModel();

    expect(model.finances.origin.cushion).toBe("$1,500");
    expect(model.finances.destination.cushion).toBe("$1,500");
    expect(model.finances.cushionDelta).toBe("$0");
    expect(model.priority.originValue).toBe("30.7 min");
    expect(model.priority.destinationValue).toBe("30.0 min");
    expect(model.priority.classification).toBe("similar");
    expect(model.housingContext.decisionUse).toBe("context_only");
    expect(model.housingContext.boundary).toBe("Area context—not your budget");
    expect(model.housingContext.originValue).toBe("$2,114");
    expect(model.housingContext.destinationValue).toBe("$2,050");
    expect(model.housingContext.delta).toBe("-$64");
    expect(model.condition.label).toBe("No clear advantage yet");
    expect(model.finances.origin.housing).toBe("$2,000");
    expect(model.finances.destination.housing).toBe("$2,000");
  });

  it("exposes verifiable source lineage", () => {
    const model = createResearchResultsViewModel();

    expect(model.evidence.publisher).toBe("U.S. Census Bureau");
    expect(model.evidence.observationPeriod).toBe("2024 ACS 1-year estimates");
    expect(model.evidence.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.evidence.rawSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.nextSteps).toHaveLength(1);
    expect(model.housingContext.evidence.tableId).toBe("B25064");
    expect(model.housingContext.evidence.snapshotSha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });
});
