import type { WizardPrototypeDraft } from "./model";

export type FinanceKey = keyof WizardPrototypeDraft["finances"];
export type ValueKey =
  | "currentTakeHome"
  | "targetTakeHome"
  | "currentHousing"
  | "targetHousing"
  | "targetGrossIncome"
  | "currentExpenses"
  | "targetExpenses"
  | "retainedPropertyNet";
export type BasisKey =
  | "targetTakeHomeBasis"
  | "targetHousingBasis"
  | "targetGrossIncomeBasis"
  | "targetExpensesBasis"
  | "retainedPropertyNetBasis";
