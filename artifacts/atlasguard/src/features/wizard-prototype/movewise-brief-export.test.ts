import { describe, expect, it } from "vitest";

import { createResearchResultsViewModel } from "../research-results/model";
import type { MoveWiseVerificationTask } from "./verification-task-model";
import {
  createMoveWiseBriefExport,
  createMoveWiseBriefExportFilename,
  MOVEWISE_BRIEF_EXPORT_SCHEMA_VERSION,
  renderMoveWiseBriefExportHtml,
  serializeMoveWiseBriefExport,
} from "./movewise-brief-export";

const generatedAt = "2026-07-22T16:30:00.000Z";

const tasks: readonly MoveWiseVerificationTask[] = [
  {
    schemaVersion: "1.0.0",
    id: "destination_housing",
    source: {
      checkId: "destination_housing",
      moduleId: "first_home",
      fieldId: "householdPlan.housing.maxMonthlyCost",
    },
    question: "Check current listings for a suitable first home.",
    instructions: "Compare three current listings with the rent estimate.",
    affectedClaim: "First-home fit and rent constraint",
    answerReturnsTo: "First home",
    status: "in_progress",
    owner: "Nick",
    dueDate: "2026-08-01",
    note: "Private family timing and landlord details.",
    evidenceUrl: "https://example.com/private-listing",
    resolution: null,
    createdAt: "2026-07-22T15:00:00.000Z",
    updatedAt: "2026-07-22T16:00:00.000Z",
  },
  {
    schemaVersion: "1.0.0",
    id: "household_service",
    source: {
      checkId: "household_service",
      moduleId: "household",
      fieldId: "householdPlan.requiredServices.status",
    },
    question: "Confirm required services work.",
    instructions: "Resolve the originating Household field.",
    affectedClaim: "Household readiness",
    answerReturnsTo: "Household",
    status: "resolved",
    owner: "Sam",
    dueDate: null,
    note: "Contains a private medical detail.",
    evidenceUrl: "https://example.com/provider",
    resolution: {
      kind: "household_status",
      resolvedValue: "works",
      provenance: "user_checked",
      evidenceUrl: "https://example.com/provider",
      resolvedAt: "2026-07-22T16:15:00.000Z",
    },
    createdAt: "2026-07-22T15:00:00.000Z",
    updatedAt: "2026-07-22T16:15:00.000Z",
  },
];

describe("MoveWise brief export", () => {
  it("freezes the decision, freshness, open checks, and non-claims in schema 1.0.0", () => {
    const model = createResearchResultsViewModel();
    const exported = createMoveWiseBriefExport(model, tasks, {
      generatedAt,
      scenarioName: "Current brief",
    });

    expect(exported).toMatchObject({
      schemaVersion: MOVEWISE_BRIEF_EXPORT_SCHEMA_VERSION,
      kind: "movewise_relocation_brief",
      generatedAt,
      scenario: {
        name: "Current brief",
        origin: "Los Angeles",
        destination: "Seattle",
      },
      decision: {
        judgment: model.brief.judgment,
        outlook: model.brief.outlook.label,
        readiness: model.brief.readiness.label,
        evidenceConfidence: model.brief.evidenceConfidence.label,
        scoreRuleVersion: model.score.scoreVersion,
      },
      privacy: {
        generatedLocally: true,
        uploadedByMoveWise: false,
        includesTaskNotes: false,
        includesEvidenceLinks: false,
      },
    });
    expect(exported.financialPicture.rows).toEqual(
      model.comparison.financialRows.map((row) => ({
        label: row.label,
        origin: row.originValue,
        destination: row.destinationValue,
        change: row.deltaValue,
        destinationSource: row.sourceLabel ?? null,
      })),
    );
    expect(exported.verification.open).toHaveLength(1);
    expect(exported.verification.completed).toHaveLength(1);
    expect(exported.dataFreshness.length).toBeGreaterThanOrEqual(2);
    expect(exported.dataFreshness[0]).toEqual(
      expect.objectContaining({
        publisher: expect.any(String),
        observationPeriod: expect.any(String),
        releasedOn: expect.any(String),
        verifiedOn: expect.any(String),
      }),
    );
    expect(exported.nonClaims).toEqual(
      expect.arrayContaining([
        expect.stringContaining("planning aid"),
        expect.stringContaining("not a quote"),
      ]),
    );
    expect(exported.audit).toEqual(
      expect.objectContaining({
        scoreRuleVersion: model.score.scoreVersion,
        benchmarkSnapshotSha256: model.evidence.snapshotSha256,
      }),
    );
  });

  it("excludes private notes and all evidence links by default", () => {
    const serialized = serializeMoveWiseBriefExport(
      createMoveWiseBriefExport(createResearchResultsViewModel(), tasks, {
        generatedAt,
        scenarioName: "Current brief",
      }),
    );

    expect(serialized).not.toContain("Private family timing");
    expect(serialized).not.toContain("private medical detail");
    expect(serialized).not.toContain("https://example.com");
    expect(serialized).not.toContain('"note"');
    expect(serialized).not.toContain('"evidenceUrl"');
  });

  it("includes private task notes and evidence links only after explicit opt-in", () => {
    const exported = createMoveWiseBriefExport(
      createResearchResultsViewModel(),
      tasks,
      {
        generatedAt,
        scenarioName: "Family move v2",
        includeTaskNotes: true,
        includeEvidenceLinks: true,
      },
    );

    expect(exported.privacy).toMatchObject({
      includesTaskNotes: true,
      includesEvidenceLinks: true,
    });
    expect(exported.verification.open[0]).toMatchObject({
      note: "Private family timing and landlord details.",
      evidenceUrl: "https://example.com/private-listing",
    });
    expect(exported.verification.completed[0]).toMatchObject({
      note: "Contains a private medical detail.",
      evidenceUrl: "https://example.com/provider",
    });
  });

  it("creates a filesystem-safe, versioned filename", () => {
    const exported = createMoveWiseBriefExport(
      createResearchResultsViewModel(),
      tasks,
      {
        generatedAt,
        scenarioName: "Family move / final?!",
      },
    );

    expect(createMoveWiseBriefExportFilename(exported, "json")).toBe(
      "movewise-family-move-final-los-angeles-to-seattle-2026-07-22-v1-0-0.json",
    );
    expect(createMoveWiseBriefExportFilename(exported, "html")).toBe(
      "movewise-family-move-final-los-angeles-to-seattle-2026-07-22-v1-0-0.html",
    );
  });

  it("renders standalone, print-friendly HTML and escapes user-controlled text", () => {
    const exported = createMoveWiseBriefExport(
      createResearchResultsViewModel(),
      [
        {
          ...tasks[0],
          owner: '<img src=x onerror="alert(1)">',
          note: "<script>alert('private')</script>",
        },
      ],
      {
        generatedAt,
        scenarioName: "Current <brief>",
        includeTaskNotes: true,
      },
    );
    const html = renderMoveWiseBriefExportHtml(exported);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("@media print");
    expect(html).toContain("Export version 1.0.0");
    expect(html).toContain("Generated July 22, 2026");
    expect(html).toContain("Current &lt;brief&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain(
      "&lt;script&gt;alert(&#39;private&#39;)&lt;/script&gt;",
    );
    expect(html).not.toContain("<script>alert");
  });
});
