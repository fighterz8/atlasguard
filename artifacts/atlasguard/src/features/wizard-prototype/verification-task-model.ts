import { z } from "zod";

import { clonePlainData } from "../../lib/clone-plain-data";
import type { MoveWiseOpenCheck } from "./decision-ledger";
import type { WizardPrototypeDraft } from "./model";

export const MOVEWISE_VERIFICATION_TASK_SCHEMA_VERSION = "1.0.0" as const;

const evidenceUrlSchema = z.string().refine((value) => {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "Evidence must use an http or https link.");

const verificationResolutionSchema = z
  .object({
    kind: z.enum([
      "verified_value",
      "household_status",
      "rent_ceiling_type",
      "not_needed",
    ]),
    resolvedValue: z.string(),
    provenance: z.literal("user_checked"),
    evidenceUrl: evidenceUrlSchema,
    resolvedAt: z.iso.datetime(),
  })
  .strict();

export const moveWiseVerificationTaskSchema = z
  .object({
    schemaVersion: z.literal(MOVEWISE_VERIFICATION_TASK_SCHEMA_VERSION),
    id: z.string().min(1),
    source: z
      .object({
        checkId: z.string().min(1),
        moduleId: z.enum(["budget", "first_home", "household"]),
        fieldId: z.string().min(1),
      })
      .strict(),
    question: z.string().min(1),
    instructions: z.string().min(1),
    affectedClaim: z.string().min(1),
    answerReturnsTo: z.enum(["Budget", "First home", "Household"]),
    status: z.enum(["open", "in_progress", "resolved", "not_needed"]),
    owner: z.string().max(120),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    note: z.string().max(2_000),
    evidenceUrl: evidenceUrlSchema,
    resolution: verificationResolutionSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export type MoveWiseVerificationTask = z.infer<
  typeof moveWiseVerificationTaskSchema
>;
export type MoveWiseVerificationTaskStatus = MoveWiseVerificationTask["status"];

const moduleCopy = {
  budget: {
    affectedClaim: "Destination budget and financial readiness",
    answerReturnsTo: "Budget",
  },
  first_home: {
    affectedClaim: "First-home fit and rent constraint",
    answerReturnsTo: "First home",
  },
  household: {
    affectedClaim: "Household readiness",
    answerReturnsTo: "Household",
  },
} as const;

const createTask = (
  check: MoveWiseOpenCheck,
  now: string,
): MoveWiseVerificationTask => ({
  schemaVersion: MOVEWISE_VERIFICATION_TASK_SCHEMA_VERSION,
  id: check.id,
  source: {
    checkId: check.id,
    moduleId: check.moduleId,
    fieldId: check.fieldId,
  },
  question: check.label,
  instructions: check.action,
  ...moduleCopy[check.moduleId],
  status: "open",
  owner: "",
  dueDate: null,
  note: "",
  evidenceUrl: "",
  resolution: null,
  createdAt: now,
  updatedAt: now,
});

const refreshTaskFromCheck = (
  task: MoveWiseVerificationTask,
  check: MoveWiseOpenCheck,
): MoveWiseVerificationTask => ({
  ...task,
  source: {
    checkId: check.id,
    moduleId: check.moduleId,
    fieldId: check.fieldId,
  },
  question: check.label,
  instructions: check.action,
  ...moduleCopy[check.moduleId],
});

export function createMoveWiseVerificationPlan(
  openChecks: readonly MoveWiseOpenCheck[],
  existingTasks: readonly MoveWiseVerificationTask[],
  now: string,
): readonly MoveWiseVerificationTask[] {
  const existingById = new Map(existingTasks.map((task) => [task.id, task]));
  const active = openChecks.map((check) => {
    const existing = existingById.get(check.id);
    if (!existing) return createTask(check, now);
    const refreshed = refreshTaskFromCheck(existing, check);
    if (existing.status === "resolved" || existing.status === "not_needed") {
      return {
        ...refreshed,
        status: "open" as const,
        resolution: null,
        updatedAt: now,
      };
    }
    return refreshed;
  });
  const activeIds = new Set(openChecks.map((check) => check.id));
  const completedHistory = existingTasks.filter(
    (task) =>
      !activeIds.has(task.id) &&
      (task.status === "resolved" || task.status === "not_needed"),
  );
  return [...active, ...completedHistory];
}

type VerificationTaskUpdate = Partial<
  Pick<
    MoveWiseVerificationTask,
    "status" | "owner" | "dueDate" | "note" | "evidenceUrl"
  >
>;

export type UpdateMoveWiseVerificationTaskResult =
  | Readonly<{ success: true; task: MoveWiseVerificationTask }>
  | Readonly<{ success: false; error: string }>;

export function updateMoveWiseVerificationTask(
  task: MoveWiseVerificationTask,
  patch: VerificationTaskUpdate,
  now: string,
): UpdateMoveWiseVerificationTaskResult {
  if (patch.status === "resolved" || patch.status === "not_needed") {
    return {
      success: false,
      error: "Resolve the originating field before completing this task.",
    };
  }
  if (
    patch.evidenceUrl !== undefined &&
    !evidenceUrlSchema.safeParse(patch.evidenceUrl.trim()).success
  ) {
    return {
      success: false,
      error: "Evidence must use an http or https link.",
    };
  }
  const candidate = {
    ...task,
    ...patch,
    owner: patch.owner?.trim() ?? task.owner,
    note: patch.note?.trim() ?? task.note,
    evidenceUrl: patch.evidenceUrl?.trim() ?? task.evidenceUrl,
    resolution:
      patch.status === "open" || patch.status === "in_progress"
        ? null
        : task.resolution,
    updatedAt: now,
  };
  const parsed = moveWiseVerificationTaskSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Task details are invalid.",
    };
  }
  return { success: true, task: parsed.data };
}

export type MoveWiseVerificationResolutionInput =
  | Readonly<{ kind: "verified_value"; value: string }>
  | Readonly<{
      kind: "household_status";
      value: "works" | "does_not_work";
    }>
  | Readonly<{
      kind: "rent_ceiling_type";
      value: "hard" | "target" | "flexible";
    }>
  | Readonly<{ kind: "not_needed"; reason: string }>;

export type ResolveMoveWiseVerificationTaskResult =
  | Readonly<{
      success: true;
      task: MoveWiseVerificationTask;
      draft: WizardPrototypeDraft;
    }>
  | Readonly<{ success: false; error: string }>;

const parseWholeDollars = (
  value: string,
  allowZero: boolean,
  allowNegative: boolean,
): string | null => {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^-?\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount)) return null;
  if (!allowNegative && amount < 0) return null;
  if (!allowZero && amount === 0) return null;
  return String(amount);
};

const resolveTaskRecord = (
  task: MoveWiseVerificationTask,
  status: "resolved" | "not_needed",
  kind: NonNullable<MoveWiseVerificationTask["resolution"]>["kind"],
  resolvedValue: string,
  now: string,
): MoveWiseVerificationTask => ({
  ...task,
  status,
  resolution: {
    kind,
    resolvedValue,
    provenance: "user_checked",
    evidenceUrl: task.evidenceUrl,
    resolvedAt: now,
  },
  updatedAt: now,
});

const householdFieldPattern =
  /^householdPlan\.(supportNetwork|childcare|school|requiredServices|carFreeAccess)\.status$/;

export function resolveMoveWiseVerificationTask(
  task: MoveWiseVerificationTask,
  sourceDraft: WizardPrototypeDraft,
  resolution: MoveWiseVerificationResolutionInput,
  now: string,
): ResolveMoveWiseVerificationTaskResult {
  const draft = clonePlainData(sourceDraft);

  if (resolution.kind === "not_needed") {
    const reason = resolution.reason.trim();
    if (reason === "") {
      return {
        success: false,
        error: "Explain why this check is no longer needed.",
      };
    }
    const match = householdFieldPattern.exec(task.source.fieldId);
    if (!match) {
      return {
        success: false,
        error: "Only a Household check can be marked not needed here.",
      };
    }
    const key = match[1] as
      | "supportNetwork"
      | "childcare"
      | "school"
      | "requiredServices"
      | "carFreeAccess";
    draft.householdPlan[key].relevance = "no";
    draft.householdPlan[key].importance = "";
    draft.householdPlan[key].status = "";
    return {
      success: true,
      draft,
      task: resolveTaskRecord(task, "not_needed", "not_needed", reason, now),
    };
  }

  if (resolution.kind === "household_status") {
    const match = householdFieldPattern.exec(task.source.fieldId);
    if (!match) {
      return {
        success: false,
        error: "This task does not return to a Household status.",
      };
    }
    const key = match[1] as
      | "supportNetwork"
      | "childcare"
      | "school"
      | "requiredServices"
      | "carFreeAccess";
    draft.householdPlan[key].status = resolution.value;
    return {
      success: true,
      draft,
      task: resolveTaskRecord(
        task,
        "resolved",
        "household_status",
        resolution.value,
        now,
      ),
    };
  }

  if (resolution.kind === "rent_ceiling_type") {
    if (task.source.fieldId !== "householdPlan.housing.ceilingType") {
      return {
        success: false,
        error: "This task does not return to the rent-ceiling type.",
      };
    }
    draft.householdPlan.housing.ceilingType = resolution.value;
    draft.householdPlan.housing.stopsMove =
      resolution.value === "hard" ? "yes" : "no";
    return {
      success: true,
      draft,
      task: resolveTaskRecord(
        task,
        "resolved",
        "rent_ceiling_type",
        resolution.value,
        now,
      ),
    };
  }

  const moneyFields = {
    "finances.targetTakeHome": {
      key: "targetTakeHome",
      basisKey: "targetTakeHomeBasis",
      rangeMinKey: "targetTakeHomeRangeMin",
      rangeMaxKey: "targetTakeHomeRangeMax",
      allowZero: false,
      allowNegative: false,
    },
    "finances.targetHousing": {
      key: "targetHousing",
      basisKey: "targetHousingBasis",
      rangeMinKey: "targetHousingRangeMin",
      rangeMaxKey: "targetHousingRangeMax",
      allowZero: false,
      allowNegative: false,
    },
    "finances.targetGrossIncome": {
      key: "targetGrossIncome",
      basisKey: "targetGrossIncomeBasis",
      rangeMinKey: "targetGrossIncomeRangeMin",
      rangeMaxKey: "targetGrossIncomeRangeMax",
      allowZero: false,
      allowNegative: false,
    },
    "finances.targetExpenses": {
      key: "targetExpenses",
      basisKey: "targetExpensesBasis",
      rangeMinKey: "targetExpensesRangeMin",
      rangeMaxKey: "targetExpensesRangeMax",
      allowZero: true,
      allowNegative: false,
    },
    "finances.retainedPropertyNet": {
      key: "retainedPropertyNet",
      basisKey: "retainedPropertyNetBasis",
      rangeMinKey: "retainedPropertyNetRangeMin",
      rangeMaxKey: "retainedPropertyNetRangeMax",
      allowZero: true,
      allowNegative: true,
    },
  } as const;
  const field = moneyFields[task.source.fieldId as keyof typeof moneyFields];
  if (field) {
    const value = parseWholeDollars(
      resolution.value,
      field.allowZero,
      field.allowNegative,
    );
    if (value === null) {
      return {
        success: false,
        error: "Enter a valid whole-dollar amount for this check.",
      };
    }
    draft.finances[field.key] = value;
    draft.finances[field.basisKey] = "confirmed";
    draft.finances[field.rangeMinKey] = "";
    draft.finances[field.rangeMaxKey] = "";
    if (field.key === "targetGrossIncome") {
      draft.finances.targetGrossIncomeKnown = true;
    }
    return {
      success: true,
      draft,
      task: resolveTaskRecord(task, "resolved", "verified_value", value, now),
    };
  }

  if (task.source.fieldId === "householdPlan.housing.maxMonthlyCost") {
    const value = parseWholeDollars(resolution.value, false, false);
    if (value === null) {
      return {
        success: false,
        error: "Enter a valid whole-dollar rent ceiling.",
      };
    }
    draft.householdPlan.housing.maxMonthlyCost = value;
    return {
      success: true,
      draft,
      task: resolveTaskRecord(task, "resolved", "verified_value", value, now),
    };
  }

  return {
    success: false,
    error: "This task cannot update its originating field yet.",
  };
}
