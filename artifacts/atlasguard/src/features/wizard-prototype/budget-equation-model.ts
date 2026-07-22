import {
  getResearchMetroExpenseGuidance,
  getResearchMetroIncomeGuidance,
  type ResearchMetroExpenseGuidance,
  type ResearchMetroIncomeGuidance,
} from "@workspace/benchmark-data";
import { calculateMonthlyCushion } from "@workspace/contracts";

import type { SupportedPlaceSlug, WizardPrototypeDraft } from "./model";

export type BudgetValueSource =
  | "user_value"
  | "movewise_estimate"
  | "waiting_on_first_home"
  | "unavailable";

export type BudgetChangeTone = "favorable" | "caution" | "neutral" | "open";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const wholeDollars = (value: string, allowNegative = false) => {
  if (value.trim() === "") return null;
  const amount = Number(value.trim().replace(/,/g, ""));
  return Number.isSafeInteger(amount) && (allowNegative || amount >= 0)
    ? amount
    : null;
};

const targetValue = (
  rawValue: string,
  estimate: number | null,
): Readonly<{ amount: number | null; source: BudgetValueSource }> => {
  if (rawValue.trim() !== "") {
    return { amount: wholeDollars(rawValue), source: "user_value" };
  }
  return estimate === null
    ? { amount: null, source: "unavailable" }
    : { amount: estimate, source: "movewise_estimate" };
};

const formatSigned = (amount: number) =>
  amount === 0
    ? currency.format(0)
    : `${amount > 0 ? "+" : "−"}${currency.format(Math.abs(amount))}`;

export type BudgetEquationModel = Readonly<{
  current: Readonly<{
    takeHome: number | null;
    housing: number | null;
    expenses: number | null;
    roomLeft: number | null;
    roomLeftText: string;
  }>;
  destination: Readonly<{
    takeHome: number | null;
    takeHomeSource: BudgetValueSource;
    housing: number | null;
    housingSource: BudgetValueSource;
    expenses: number | null;
    expensesSource: BudgetValueSource;
    retainedPropertyNet: number | null;
    retainedPropertySource: BudgetValueSource;
    roomLeft: number | null;
    roomLeftText: string;
  }>;
  change: Readonly<{
    amount: number | null;
    text: string;
    tone: BudgetChangeTone;
  }>;
  consequence: Readonly<{
    headline: string;
    detail: string;
    compact: string;
    estimateCount: number;
    openCount: number;
    tone: BudgetChangeTone;
  }>;
  incomeGuidance: ResearchMetroIncomeGuidance | null;
  expenseGuidance: ResearchMetroExpenseGuidance | null;
}>;

export function createBudgetEquationModel(
  finances: WizardPrototypeDraft["finances"],
  originSlug: SupportedPlaceSlug | "",
  destinationSlug: SupportedPlaceSlug | "",
  firstHomeRentEstimate: number | null = null,
): BudgetEquationModel {
  const currentTakeHome = wholeDollars(finances.currentTakeHome);
  const currentHousing = wholeDollars(finances.currentHousing);
  const currentExpenses = wholeDollars(finances.currentExpenses);
  const hasRoute = originSlug !== "" && destinationSlug !== "";
  const incomeGuidance =
    hasRoute && currentTakeHome !== null
      ? getResearchMetroIncomeGuidance(
          originSlug,
          destinationSlug,
          currentTakeHome,
        )
      : null;
  const expenseGuidance =
    hasRoute && currentExpenses !== null
      ? getResearchMetroExpenseGuidance(
          originSlug,
          destinationSlug,
          currentExpenses,
        )
      : null;
  const destinationTakeHome = targetValue(
    finances.targetTakeHome,
    incomeGuidance?.suggestedMonthlyTakeHomeDollars ?? null,
  );
  const destinationHousing =
    finances.targetHousing.trim() === ""
      ? firstHomeRentEstimate === null
        ? ({
            amount: null,
            source: "waiting_on_first_home",
          } as const)
        : ({
            amount: firstHomeRentEstimate,
            source: "movewise_estimate",
          } as const)
      : ({
          amount: wholeDollars(finances.targetHousing),
          source: "user_value",
        } as const);
  const destinationExpenses = targetValue(
    finances.targetExpenses,
    expenseGuidance?.suggestedMonthlyExpensesDollars ?? null,
  );
  const retainedPropertyApplies = finances.currentHousingTenure === "own";
  const destinationRetainedProperty = retainedPropertyApplies
    ? ({
        amount: wholeDollars(finances.retainedPropertyNet, true),
        source:
          finances.retainedPropertyNet.trim() === ""
            ? ("unavailable" as const)
            : ("user_value" as const),
      } as const)
    : ({ amount: 0, source: "unavailable" } as const);
  const currentRoomLeft =
    currentTakeHome !== null &&
    currentHousing !== null &&
    currentExpenses !== null
      ? calculateMonthlyCushion(
          currentTakeHome,
          currentHousing,
          currentExpenses,
          0,
        )
      : null;
  const destinationRoomLeft =
    destinationTakeHome.amount !== null &&
    destinationHousing.amount !== null &&
    destinationExpenses.amount !== null &&
    destinationRetainedProperty.amount !== null
      ? calculateMonthlyCushion(
          destinationTakeHome.amount,
          destinationHousing.amount,
          destinationExpenses.amount,
          destinationRetainedProperty.amount,
        )
      : null;
  const change =
    currentRoomLeft !== null && destinationRoomLeft !== null
      ? destinationRoomLeft - currentRoomLeft
      : null;
  const changeTone: BudgetChangeTone =
    change === null
      ? "open"
      : change > 0
        ? "favorable"
        : change < 0
          ? "caution"
          : "neutral";
  const estimateCount = [
    destinationTakeHome.source,
    destinationHousing.source,
    destinationExpenses.source,
  ].filter((source) => source === "movewise_estimate").length;
  const openCount = [
    destinationTakeHome.amount,
    destinationHousing.amount,
    destinationExpenses.amount,
    ...(retainedPropertyApplies ? [destinationRetainedProperty.amount] : []),
  ].filter((amount) => amount === null).length;

  const consequence = (() => {
    if (currentRoomLeft === null) {
      return {
        headline: "Complete your month now",
        detail:
          "Add valid income, home, and everything-else amounts to calculate room left.",
        compact: "Budget summary needs your current numbers",
      };
    }
    if (destinationRoomLeft === null) {
      return {
        headline: `${currency.format(currentRoomLeft)} left in your current month`,
        detail:
          destinationHousing.amount === null
            ? "Destination room left waits on your First home plan."
            : "Complete the open destination amount to compare monthly room.",
        compact:
          destinationHousing.amount === null
            ? `${currency.format(currentRoomLeft)} now · Home plan needed`
            : `${currency.format(currentRoomLeft)} now · ${openCount} destination ${openCount === 1 ? "answer" : "answers"} open`,
      };
    }
    if (change === null) {
      throw new Error("A complete destination equation requires a change.");
    }
    return {
      headline:
        change === 0
          ? "About the same room each month"
          : `${currency.format(Math.abs(change))} ${change > 0 ? "more" : "less"} room each month`,
      detail: `The destination plan leaves ${currency.format(destinationRoomLeft)} after monthly costs.`,
      compact: `${formatSigned(change)} room · ${estimateCount} ${estimateCount === 1 ? "estimate" : "estimates"}`,
    };
  })();

  return {
    current: {
      takeHome: currentTakeHome,
      housing: currentHousing,
      expenses: currentExpenses,
      roomLeft: currentRoomLeft,
      roomLeftText:
        currentRoomLeft === null
          ? "Complete your month now"
          : currency.format(currentRoomLeft),
    },
    destination: {
      takeHome: destinationTakeHome.amount,
      takeHomeSource: destinationTakeHome.source,
      housing: destinationHousing.amount,
      housingSource: destinationHousing.source,
      expenses: destinationExpenses.amount,
      expensesSource: destinationExpenses.source,
      retainedPropertyNet: destinationRetainedProperty.amount,
      retainedPropertySource: destinationRetainedProperty.source,
      roomLeft: destinationRoomLeft,
      roomLeftText:
        destinationRoomLeft !== null
          ? currency.format(destinationRoomLeft)
          : destinationHousing.amount === null
            ? "Waiting on First home"
            : "Complete open destination amounts",
    },
    change: {
      amount: change,
      text: change === null ? "Waiting on open answers" : formatSigned(change),
      tone: changeTone,
    },
    consequence: {
      ...consequence,
      estimateCount,
      openCount,
      tone: changeTone,
    },
    incomeGuidance,
    expenseGuidance,
  };
}
