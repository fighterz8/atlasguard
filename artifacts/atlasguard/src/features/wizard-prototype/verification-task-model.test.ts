import { describe, expect, it } from "vitest";

import type { MoveWiseOpenCheck } from "./decision-ledger";
import { createInitialWizardDraft } from "./model";
import {
  MOVEWISE_VERIFICATION_TASK_SCHEMA_VERSION,
  createMoveWiseVerificationPlan,
  resolveMoveWiseVerificationTask,
  updateMoveWiseVerificationTask,
} from "./verification-task-model";

const now = "2026-07-22T10:00:00.000Z";

const budgetCheck: MoveWiseOpenCheck = {
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
};

const householdCheck: MoveWiseOpenCheck = {
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
};

describe("MoveWise verification task model", () => {
  it("turns each canonical open check into a versioned actionable task", () => {
    const plan = createMoveWiseVerificationPlan(
      [budgetCheck, householdCheck],
      [],
      now,
    );

    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({
      schemaVersion: MOVEWISE_VERIFICATION_TASK_SCHEMA_VERSION,
      id: budgetCheck.id,
      source: {
        checkId: budgetCheck.id,
        moduleId: "budget",
        fieldId: "finances.targetTakeHome",
      },
      question: "Verify destination take-home",
      instructions:
        "Replace the planning estimate with a paycheck-specific amount.",
      affectedClaim: "Destination budget and financial readiness",
      answerReturnsTo: "Budget",
      status: "open",
      owner: "",
      dueDate: null,
      note: "",
      evidenceUrl: "",
      resolution: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  it("preserves task work, retains completed history, and reopens stale completion fail-closed", () => {
    const [task] = createMoveWiseVerificationPlan([budgetCheck], [], now);
    const inProgress = updateMoveWiseVerificationTask(
      task!,
      {
        status: "in_progress",
        owner: "Nick",
        dueDate: "2026-07-30",
        note: "Waiting for the written offer.",
        evidenceUrl: "https://example.com/offer",
      },
      "2026-07-22T10:05:00.000Z",
    );
    expect(inProgress.success).toBe(true);
    if (!inProgress.success) return;

    expect(
      createMoveWiseVerificationPlan(
        [budgetCheck],
        [inProgress.task],
        "2026-07-22T10:10:00.000Z",
      )[0],
    ).toMatchObject({
      status: "in_progress",
      owner: "Nick",
      dueDate: "2026-07-30",
      note: "Waiting for the written offer.",
      evidenceUrl: "https://example.com/offer",
    });

    const resolved = {
      ...inProgress.task,
      status: "resolved" as const,
      resolution: {
        kind: "verified_value" as const,
        resolvedValue: "6500",
        provenance: "user_checked" as const,
        evidenceUrl: "https://example.com/offer",
        resolvedAt: "2026-07-22T10:15:00.000Z",
      },
    };
    expect(
      createMoveWiseVerificationPlan(
        [],
        [resolved],
        "2026-07-22T10:20:00.000Z",
      ),
    ).toEqual([resolved]);
    expect(
      createMoveWiseVerificationPlan(
        [budgetCheck],
        [resolved],
        "2026-07-22T10:20:00.000Z",
      )[0],
    ).toMatchObject({ status: "open", resolution: null });
  });

  it("allows progress metadata but refuses generic completion and invalid evidence", () => {
    const [task] = createMoveWiseVerificationPlan([budgetCheck], [], now);

    expect(
      updateMoveWiseVerificationTask(task!, { status: "resolved" }, now),
    ).toEqual({
      success: false,
      error: "Resolve the originating field before completing this task.",
    });
    expect(
      updateMoveWiseVerificationTask(
        task!,
        { evidenceUrl: "javascript:alert(1)" },
        now,
      ),
    ).toEqual({
      success: false,
      error: "Evidence must use an http or https link.",
    });
  });

  it("resolves a checked Budget value by updating the source field and provenance together", () => {
    const draft = createInitialWizardDraft();
    const original = structuredClone(draft);
    const [task] = createMoveWiseVerificationPlan([budgetCheck], [], now);

    const resolved = resolveMoveWiseVerificationTask(
      task!,
      draft,
      { kind: "verified_value", value: "6500" },
      "2026-07-22T10:15:00.000Z",
    );

    expect(resolved.success).toBe(true);
    if (!resolved.success) return;
    expect(resolved.draft.finances).toMatchObject({
      targetTakeHome: "6500",
      targetTakeHomeBasis: "confirmed",
      targetTakeHomeRangeMin: "",
      targetTakeHomeRangeMax: "",
    });
    expect(resolved.task).toMatchObject({
      status: "resolved",
      resolution: {
        kind: "verified_value",
        resolvedValue: "6500",
        provenance: "user_checked",
        resolvedAt: "2026-07-22T10:15:00.000Z",
      },
    });
    expect(draft).toEqual(original);
  });

  it("resolves a Household check only by writing the actual status", () => {
    const draft = createInitialWizardDraft();
    draft.householdPlan.supportNetwork = {
      relevance: "yes",
      importance: "blocker",
      status: "not_checked",
    };
    const [task] = createMoveWiseVerificationPlan([householdCheck], [], now);

    const resolved = resolveMoveWiseVerificationTask(
      task!,
      draft,
      { kind: "household_status", value: "works" },
      "2026-07-22T10:15:00.000Z",
    );

    expect(resolved.success).toBe(true);
    if (!resolved.success) return;
    expect(resolved.draft.householdPlan.supportNetwork.status).toBe("works");
    expect(resolved.task).toMatchObject({
      status: "resolved",
      resolution: {
        kind: "household_status",
        resolvedValue: "works",
        provenance: "user_checked",
      },
    });
  });

  it("requires an explicit reason before a Household task becomes Not needed", () => {
    const draft = createInitialWizardDraft();
    draft.householdPlan.supportNetwork = {
      relevance: "yes",
      importance: "important",
      status: "not_checked",
    };
    const [task] = createMoveWiseVerificationPlan([householdCheck], [], now);

    expect(
      resolveMoveWiseVerificationTask(
        task!,
        draft,
        { kind: "not_needed", reason: "  " },
        now,
      ),
    ).toEqual({
      success: false,
      error: "Explain why this check is no longer needed.",
    });

    const resolved = resolveMoveWiseVerificationTask(
      task!,
      draft,
      { kind: "not_needed", reason: "We no longer need nearby support." },
      now,
    );
    expect(resolved.success).toBe(true);
    if (!resolved.success) return;
    expect(resolved.draft.householdPlan.supportNetwork).toMatchObject({
      relevance: "no",
      importance: "",
      status: "",
    });
    expect(resolved.task).toMatchObject({
      status: "not_needed",
      resolution: {
        kind: "not_needed",
        resolvedValue: "We no longer need nearby support.",
        provenance: "user_checked",
      },
    });
  });
});
