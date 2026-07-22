import type { MoveWiseOpenCheck } from "./decision-ledger";

export type MoveWiseDecisionGateStatus =
  | "estimated"
  | "unknown"
  | "conflict"
  | "blocked";

export type MoveWiseDecisionGateModule = MoveWiseOpenCheck["moduleId"];

export type MoveWiseDecisionGateItem = MoveWiseOpenCheck &
  Readonly<{
    status: MoveWiseDecisionGateStatus;
    statusLabel: "Estimated" | "Unknown" | "Conflict" | "Blocked";
    editRoute: MoveWiseDecisionGateModule;
  }>;

export type MoveWiseDecisionGateModel = Readonly<{
  counts: Readonly<{
    known: number;
    estimated: number;
    unknown: number;
    conflict: number;
    blocked: number;
  }>;
  items: readonly MoveWiseDecisionGateItem[];
  unresolvedIds: readonly string[];
  readiness: Readonly<{
    state: "blocked" | "preliminary" | "comparable";
    label: "Blocked" | "Preliminary" | "Ready to compare";
    tone: "risk" | "caution" | "favorable";
    eligibility: "preliminary" | "comparable";
    explanation: string;
  }>;
  evidenceConfidence: Readonly<{
    level: "limited" | "planning" | "strong";
    label: "Limited" | "Planning-level" | "Strong";
    tone: "caution" | "benchmark" | "favorable";
    explanation: string;
  }>;
}>;

const statusForCheck = (
  check: MoveWiseOpenCheck,
): MoveWiseDecisionGateStatus => {
  if (check.severity === "blocker") return "blocked";
  if (check.knowledge === "unknown") return "unknown";
  if (check.evidenceStatus === "estimated") return "estimated";
  return "conflict";
};

const statusLabels: Record<
  MoveWiseDecisionGateStatus,
  MoveWiseDecisionGateItem["statusLabel"]
> = {
  estimated: "Estimated",
  unknown: "Unknown",
  conflict: "Conflict",
  blocked: "Blocked",
};

export function createMoveWiseDecisionGateModel(
  openChecks: readonly MoveWiseOpenCheck[],
): MoveWiseDecisionGateModel {
  const items = openChecks.map((check) => {
    const status = statusForCheck(check);
    return {
      ...check,
      status,
      statusLabel: statusLabels[status],
      editRoute: check.moduleId,
    };
  });
  const counts = {
    known: openChecks.filter(({ knowledge }) => knowledge === "known").length,
    estimated: items.filter(({ status }) => status === "estimated").length,
    unknown: items.filter(({ status }) => status === "unknown").length,
    conflict: items.filter(({ status }) => status === "conflict").length,
    blocked: items.filter(({ status }) => status === "blocked").length,
  };

  const readiness: MoveWiseDecisionGateModel["readiness"] =
    counts.blocked > 0
      ? {
          state: "blocked",
          label: "Blocked",
          tone: "risk",
          eligibility: "preliminary",
          explanation:
            "At least one must-have or safety condition is not met at the current plan.",
        }
      : items.length > 0
        ? {
            state: "preliminary",
            label: "Preliminary",
            tone: "caution",
            eligibility: "preliminary",
            explanation:
              "MoveWise can show a conditional result, but open checks still affect how much you should rely on it.",
          }
        : {
            state: "comparable",
            label: "Ready to compare",
            tone: "favorable",
            eligibility: "comparable",
            explanation:
              "No blocking incompleteness remains for this supported screening comparison.",
          };

  const evidenceConfidence: MoveWiseDecisionGateModel["evidenceConfidence"] =
    counts.unknown > 0
      ? {
          level: "limited",
          label: "Limited",
          tone: "caution",
          explanation:
            "One or more consequential facts have not been checked yet.",
        }
      : counts.estimated > 0
        ? {
            level: "planning",
            label: "Planning-level",
            tone: "benchmark",
            explanation:
              "The brief is usable for planning, but it still relies on estimates.",
          }
        : {
            level: "strong",
            label: "Strong",
            tone: "favorable",
            explanation:
              "The decisive facts in this supported comparison are verified or explicitly resolved.",
          };

  return {
    counts,
    items,
    unresolvedIds: items.map(({ id }) => id),
    readiness,
    evidenceConfidence,
  };
}
