import { clonePlainData } from "../../lib/clone-plain-data";

import { createBudgetEquationModel } from "./budget-equation-model";
import { createFirstHomeModel } from "./first-home-model";
import type { WizardPrototypeDraft } from "./model";

export type BudgetEditOrigin = "review" | "results";

export type BudgetEditSummary = Readonly<{
  hasChanges: boolean;
  count: number;
  headline: string;
  detail: string;
  items: ReadonlyArray<
    Readonly<{
      key: string;
      label: string;
      before: string;
      after: string;
    }>
  >;
}>;

type FinanceValue = string | boolean;
type FinanceField = Readonly<{
  key: keyof WizardPrototypeDraft["finances"];
  label: string;
  format: (value: FinanceValue) => string;
}>;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatMoney = (value: FinanceValue, blankLabel = "Not entered") => {
  if (typeof value !== "string" || value.trim() === "") return blankLabel;
  const amount = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(amount) ? currency.format(amount) : value;
};

const fields: readonly FinanceField[] = [
  {
    key: "currentHousingTenure",
    label: "Current housing",
    format: (value) =>
      typeof value === "string" && value !== ""
        ? value === "rent"
          ? "Rent"
          : "Own"
        : "Not answered",
  },
  {
    key: "currentTakeHome",
    label: "Current income after tax",
    format: formatMoney,
  },
  { key: "currentHousing", label: "Current home", format: formatMoney },
  {
    key: "currentExpenses",
    label: "Current everything else",
    format: formatMoney,
  },
  {
    key: "targetTakeHome",
    label: "Destination income after tax",
    format: (value) => formatMoney(value, "MoveWise estimate"),
  },
  {
    key: "targetHousing",
    label: "Destination home",
    format: (value) => formatMoney(value, "Waiting on First home"),
  },
  {
    key: "targetExpenses",
    label: "Destination everything else",
    format: (value) => formatMoney(value, "MoveWise estimate"),
  },
  {
    key: "targetGrossIncomeKnown",
    label: "Destination gross income status",
    format: (value) => (value === true ? "Known" : "Not provided"),
  },
  {
    key: "targetGrossIncome",
    label: "Destination gross income",
    format: formatMoney,
  },
  {
    key: "retainedPropertyNet",
    label: "Retained-property impact",
    format: formatMoney,
  },
] as const;

export function createBudgetEditSession(
  origin: BudgetEditOrigin,
  draft: WizardPrototypeDraft,
) {
  return {
    origin,
    baselineDraft: clonePlainData(draft),
    workingDraft: clonePlainData(draft),
  };
}

export function createBudgetEditSummary(
  before: WizardPrototypeDraft,
  after: WizardPrototypeDraft,
): BudgetEditSummary {
  const items = fields.flatMap((field) => {
    const beforeValue = before.finances[field.key];
    const afterValue = after.finances[field.key];
    if (typeof beforeValue !== "string" && typeof beforeValue !== "boolean") {
      return [];
    }
    if (typeof afterValue !== "string" && typeof afterValue !== "boolean") {
      return [];
    }
    return beforeValue === afterValue
      ? []
      : [
          {
            key: field.key,
            label: field.label,
            before: field.format(beforeValue),
            after: field.format(afterValue),
          },
        ];
  });
  const worksheetChanged =
    JSON.stringify(before.finances.expenseWorksheet) !==
    JSON.stringify(after.finances.expenseWorksheet);
  if (
    worksheetChanged &&
    before.finances.currentExpenses === after.finances.currentExpenses
  ) {
    items.push({
      key: "expenseWorksheet",
      label: "Everything-else breakdown",
      before: before.finances.expenseWorksheet.enabled
        ? "Breakdown saved"
        : "Total only",
      after: after.finances.expenseWorksheet.enabled
        ? "Breakdown saved"
        : "Total only",
    });
  }

  if (items.length === 0) {
    return {
      hasChanges: false,
      count: 0,
      headline: "No Budget changes yet",
      detail: "Your evaluated brief is unchanged.",
      items: [],
    };
  }

  const beforeEquation = createBudgetEquationModel(
    before.finances,
    before.originSlug,
    before.destinationSlug,
    createFirstHomeModel(before).estimate?.monthlyDollars ?? null,
  );
  const afterEquation = createBudgetEquationModel(
    after.finances,
    after.originSlug,
    after.destinationSlug,
    createFirstHomeModel(after).estimate?.monthlyDollars ?? null,
  );
  const detail =
    beforeEquation.current.roomLeft !== null &&
    afterEquation.current.roomLeft !== null &&
    beforeEquation.current.roomLeft !== afterEquation.current.roomLeft
      ? `Current room left changed from ${beforeEquation.current.roomLeftText} to ${afterEquation.current.roomLeftText}.`
      : beforeEquation.destination.roomLeft !== null &&
          afterEquation.destination.roomLeft !== null &&
          beforeEquation.destination.roomLeft !==
            afterEquation.destination.roomLeft
        ? `Destination room left changed from ${beforeEquation.destination.roomLeftText} to ${afterEquation.destination.roomLeftText}.`
        : afterEquation.destination.roomLeft === null
          ? "Budget assumptions changed. Destination room left still waits on First home."
          : "Budget assumptions changed; monthly room is unchanged.";

  return {
    hasChanges: true,
    count: items.length,
    headline: `${items.length} Budget ${items.length === 1 ? "assumption" : "assumptions"} updated`,
    detail,
    items,
  };
}
