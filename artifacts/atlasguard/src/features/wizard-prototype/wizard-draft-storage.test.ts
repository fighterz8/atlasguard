import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import type { MoveWiseOpenCheck } from "./decision-ledger";
import { createMoveWiseVerificationPlan } from "./verification-task-model";
import {
  MOVEWISE_DRAFT_SCHEMA_VERSION,
  MOVEWISE_DRAFT_STORAGE_KEY,
  clearMoveWiseDraft,
  loadMoveWiseDraft,
  saveMoveWiseDraft,
} from "./wizard-draft-storage";

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    value: (key: string) => values.get(key) ?? null,
  };
};

describe("MoveWise local draft storage", () => {
  it("round-trips an exact versioned draft and current view", () => {
    const storage = memoryStorage();
    const draft = createInitialWizardDraft();
    draft.originSlug = "los-angeles-ca";
    draft.destinationSlug = "seattle-wa";
    draft.householdMode = "family";

    const [verificationTask] = createMoveWiseVerificationPlan(
      [
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
          action: "Replace the estimate with a paycheck-specific amount.",
        } satisfies MoveWiseOpenCheck,
      ],
      [],
      "2026-07-22T04:09:00.000Z",
    );
    const verificationTasks = [verificationTask!];
    const result = saveMoveWiseDraft(storage, {
      draft,
      verificationTasks,
      view: "household",
      savedAt: "2026-07-22T04:10:00.000Z",
    });

    expect(result).toEqual({
      success: true,
      savedAt: "2026-07-22T04:10:00.000Z",
    });
    expect(JSON.parse(storage.value(MOVEWISE_DRAFT_STORAGE_KEY))).toMatchObject(
      {
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        view: "household",
        savedAt: "2026-07-22T04:10:00.000Z",
      },
    );
    expect(loadMoveWiseDraft(storage)).toEqual({
      status: "restored",
      envelope: {
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        draft,
        verificationTasks,
        view: "household",
        savedAt: "2026-07-22T04:10:00.000Z",
      },
    });
  });

  it("fails closed for malformed, incompatible, or invalid saved state", () => {
    const storage = memoryStorage();
    storage.setItem(MOVEWISE_DRAFT_STORAGE_KEY, "not-json");
    expect(loadMoveWiseDraft(storage)).toMatchObject({
      status: "invalid",
      reason: "corrupt",
    });

    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "99.0.0",
        savedAt: "2026-07-22T04:10:00.000Z",
        view: "money",
        draft: createInitialWizardDraft(),
      }),
    );
    expect(loadMoveWiseDraft(storage)).toEqual({
      status: "invalid",
      reason: "incompatible_version",
    });

    const invalidDraft = createInitialWizardDraft() as Record<string, unknown>;
    invalidDraft.householdMode = "silently-invented-mode";
    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        savedAt: "2026-07-22T04:10:00.000Z",
        view: "money",
        draft: invalidDraft,
      }),
    );
    expect(loadMoveWiseDraft(storage)).toEqual({
      status: "invalid",
      reason: "invalid_shape",
    });
    expect(storage.value(MOVEWISE_DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  it("migrates the prior draft schema only through its explicit safe default", () => {
    const storage = memoryStorage();
    const draft = createInitialWizardDraft();
    const { expenseWorksheet: _removed, ...legacyFinances } = draft.finances;
    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "1.0.0",
        savedAt: "2026-07-22T04:10:00.000Z",
        view: "money",
        draft: { ...draft, finances: legacyFinances },
      }),
    );

    expect(loadMoveWiseDraft(storage)).toMatchObject({
      status: "restored",
      envelope: {
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        verificationTasks: [],
        draft: {
          finances: {
            expenseWorksheet: { enabled: false },
          },
        },
      },
    });
  });

  it("migrates the prior binary ceiling into an explicit ceiling meaning", () => {
    const storage = memoryStorage();
    const draft = createInitialWizardDraft();
    const { ceilingType: _removed, ...legacyHousing } =
      draft.householdPlan.housing;
    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "1.1.0",
        savedAt: "2026-07-22T04:10:00.000Z",
        view: "household",
        draft: {
          ...draft,
          householdPlan: {
            ...draft.householdPlan,
            housing: { ...legacyHousing, stopsMove: "yes" },
          },
        },
      }),
    );

    expect(loadMoveWiseDraft(storage)).toMatchObject({
      status: "restored",
      envelope: {
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        verificationTasks: [],
        draft: {
          householdPlan: { housing: { ceilingType: "hard" } },
        },
      },
    });
  });

  it("migrates the prior household pairs into explicit status-board dimensions", () => {
    const storage = memoryStorage();
    const draft = createInitialWizardDraft();
    const legacyPlan = {
      ...draft.householdPlan,
      version: "1.0.0",
      supportNetwork: {
        needed: "yes",
        stopsMove: "yes",
        assessment: "unavailable",
      },
      requiredServices: {
        needed: "yes",
        stopsMove: "no",
        assessment: "negative",
      },
      carFreeAccess: {
        needed: "no",
        stopsMove: "",
        assessment: "unavailable",
      },
    };
    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "1.2.0",
        savedAt: "2026-07-22T04:10:00.000Z",
        view: "household",
        draft: { ...draft, householdPlan: legacyPlan },
      }),
    );

    expect(loadMoveWiseDraft(storage)).toMatchObject({
      status: "restored",
      envelope: {
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        verificationTasks: [],
        draft: {
          householdPlan: {
            version: "2.0.0",
            supportNetwork: {
              relevance: "yes",
              importance: "blocker",
              status: "not_checked",
            },
            requiredServices: {
              relevance: "yes",
              importance: "important",
              status: "does_not_work",
            },
            carFreeAccess: {
              relevance: "no",
              importance: "",
              status: "",
            },
          },
        },
      },
    });
  });

  it("migrates the prior 1.3 draft to an empty task plan and rejects malformed tasks", () => {
    const storage = memoryStorage();
    const draft = createInitialWizardDraft();
    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "1.3.0",
        savedAt: "2026-07-22T04:10:00.000Z",
        view: "move",
        draft,
      }),
    );
    expect(loadMoveWiseDraft(storage)).toMatchObject({
      status: "restored",
      envelope: {
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        verificationTasks: [],
      },
    });

    storage.setItem(
      MOVEWISE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: MOVEWISE_DRAFT_SCHEMA_VERSION,
        savedAt: "2026-07-22T04:10:00.000Z",
        view: "move",
        draft,
        verificationTasks: [{ id: "silently-trusted" }],
      }),
    );
    expect(loadMoveWiseDraft(storage)).toEqual({
      status: "invalid",
      reason: "invalid_shape",
    });
  });

  it("reports storage failures and clears only the MoveWise draft key", () => {
    const draft = createInitialWizardDraft();
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => undefined,
    };
    expect(
      saveMoveWiseDraft(failingStorage, {
        draft,
        verificationTasks: [],
        view: "move",
        savedAt: "2026-07-22T04:10:00.000Z",
      }),
    ).toEqual({ success: false, reason: "write_failed" });

    const storage = memoryStorage();
    storage.setItem(MOVEWISE_DRAFT_STORAGE_KEY, "saved");
    storage.setItem("unrelated", "preserve me");
    expect(clearMoveWiseDraft(storage)).toEqual({ success: true });
    expect(storage.value(MOVEWISE_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.value("unrelated")).toBe("preserve me");
  });
});
