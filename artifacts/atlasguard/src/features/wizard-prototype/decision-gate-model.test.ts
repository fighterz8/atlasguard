import { describe, expect, it } from "vitest";

import type { MoveWiseOpenCheck } from "./decision-ledger";
import { createMoveWiseDecisionGateModel } from "./decision-gate-model";

const check = (
  overrides: Partial<MoveWiseOpenCheck> & Pick<MoveWiseOpenCheck, "id">,
): MoveWiseOpenCheck => ({
  id: overrides.id,
  moduleId: "budget",
  fieldId: "finances.targetHousing",
  knowledge: "known",
  origin: "movewise",
  evidenceStatus: "estimated",
  role: "constraint",
  severity: "check",
  label: "Verify destination rent",
  action: "Check current matching listings.",
  ...overrides,
});

describe("MoveWise Decision gate model", () => {
  it("classifies one canonical unresolved set without hiding blockers", () => {
    const gate = createMoveWiseDecisionGateModel([
      check({ id: "estimated" }),
      check({
        id: "unknown",
        knowledge: "unknown",
        origin: null,
        evidenceStatus: null,
        severity: "major",
      }),
      check({
        id: "conflict",
        moduleId: "first_home",
        fieldId: "householdPlan.housing.maxMonthlyCost",
        origin: "user",
        evidenceStatus: "verified",
        severity: "major",
      }),
      check({
        id: "blocked",
        moduleId: "household",
        fieldId: "householdPlan.supportNetwork.status",
        origin: "user",
        evidenceStatus: "verified",
        role: "blocker",
        severity: "blocker",
      }),
    ]);

    expect(gate.unresolvedIds).toEqual([
      "estimated",
      "unknown",
      "conflict",
      "blocked",
    ]);
    expect(gate.counts).toEqual({
      known: 3,
      estimated: 1,
      unknown: 1,
      conflict: 1,
      blocked: 1,
    });
    expect(
      gate.items.map(({ id, status, editRoute }) => ({
        id,
        status,
        editRoute,
      })),
    ).toEqual([
      { id: "estimated", status: "estimated", editRoute: "budget" },
      { id: "unknown", status: "unknown", editRoute: "budget" },
      { id: "conflict", status: "conflict", editRoute: "first_home" },
      { id: "blocked", status: "blocked", editRoute: "household" },
    ]);
    expect(gate.readiness).toMatchObject({
      state: "blocked",
      label: "Blocked",
      eligibility: "preliminary",
    });
    expect(gate.evidenceConfidence).toMatchObject({
      level: "limited",
      label: "Limited",
    });
  });

  it("keeps estimates preliminary even when every value is known", () => {
    const gate = createMoveWiseDecisionGateModel([
      check({ id: "income" }),
      check({ id: "housing" }),
    ]);

    expect(gate.readiness).toMatchObject({
      state: "preliminary",
      label: "Preliminary",
      eligibility: "preliminary",
    });
    expect(gate.evidenceConfidence).toMatchObject({
      level: "planning",
      label: "Planning-level",
    });
  });

  it("becomes comparable only when the canonical unresolved set is empty", () => {
    const gate = createMoveWiseDecisionGateModel([]);

    expect(gate.counts).toEqual({
      known: 0,
      estimated: 0,
      unknown: 0,
      conflict: 0,
      blocked: 0,
    });
    expect(gate.readiness).toMatchObject({
      state: "comparable",
      label: "Ready to compare",
      eligibility: "comparable",
    });
    expect(gate.evidenceConfidence).toMatchObject({
      level: "strong",
      label: "Strong",
    });
  });
});
