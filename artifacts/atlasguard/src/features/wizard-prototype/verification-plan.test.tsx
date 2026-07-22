import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { MoveWiseOpenCheck } from "./decision-ledger";
import { createMoveWiseVerificationPlan } from "./verification-task-model";
import { VerificationPlan } from "./verification-plan";

const checks = [
  {
    id: "budget.destination.take-home",
    moduleId: "budget",
    fieldId: "finances.targetTakeHome",
    knowledge: "known",
    origin: "movewise",
    evidenceStatus: "estimated",
    role: "constraint",
    severity: "check",
    label: "Verify destination take-home",
    action: "Replace the planning estimate with a paycheck-specific amount.",
  },
  {
    id: "first-home.rent-ceiling-meaning",
    moduleId: "first_home",
    fieldId: "householdPlan.housing.ceilingType",
    knowledge: "unknown",
    origin: "user",
    evidenceStatus: null,
    role: "constraint",
    severity: "major",
    label: "Decide how firm the rent ceiling is",
    action: "Choose whether the amount is a hard limit, target, or flexible.",
  },
  {
    id: "household.support_network",
    moduleId: "household",
    fieldId: "householdPlan.supportNetwork.status",
    knowledge: "unknown",
    origin: "user",
    evidenceStatus: null,
    role: "blocker",
    severity: "major",
    label: "Check nearby support",
    action: "Confirm whether nearby support will work.",
  },
] as const satisfies readonly MoveWiseOpenCheck[];

describe("VerificationPlan", () => {
  it("renders actionable task ownership, evidence, source return, and explicit resolution", () => {
    const tasks = createMoveWiseVerificationPlan(
      checks,
      [],
      "2026-07-22T10:00:00.000Z",
    );
    const html = renderToStaticMarkup(
      <VerificationPlan
        tasks={tasks}
        onUpdateTask={vi.fn()}
        onResolveTask={vi.fn()}
        onEditModule={vi.fn()}
      />,
    );

    expect(html).toContain("Verification plan");
    expect(html).toContain("3 open checks");
    expect(html).toContain("Affected claim");
    expect(html).toContain("Destination budget and financial readiness");
    expect(html).toContain("Answer returns to Budget");
    expect(html).toContain("Owner");
    expect(html).toContain("Due date");
    expect(html).toContain("Notes");
    expect(html).toContain("Optional evidence link");
    expect(html).toContain(
      "An evidence link does not verify the answer by itself",
    );
    expect(html).toContain("Verified monthly amount");
    expect(html).toContain("Rent ceiling meaning");
    expect(html).toContain("Works");
    expect(html).toContain("Does not work");
    expect(html).toContain("Mark not needed");
    expect(html).not.toContain("Have MoveWise check this");
  });
});
