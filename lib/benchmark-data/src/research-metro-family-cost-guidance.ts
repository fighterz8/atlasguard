import {
  getResearchMetroExpenseGuidance,
  type ResearchMetroExpenseGuidance,
} from "./research-metro-expense-guidance";

export type ResearchMetroFamilyCostGuidance = Readonly<{
  version: "bea-2024-family-cost-context-v1";
  role: "Context only";
  originMonthlyExpensesDollars: number;
  destinationMonthlyExpensesDollars: number;
  monthlyDifferenceDollars: number;
  direction: "lower" | "similar" | "higher";
  summary: string;
  childcareBoundary: string;
  source: ResearchMetroExpenseGuidance["source"];
}>;

const directionFromDifference = (
  monthlyDifferenceDollars: number,
): ResearchMetroFamilyCostGuidance["direction"] => {
  if (Math.abs(monthlyDifferenceDollars) < 25) return "similar";
  return monthlyDifferenceDollars < 0 ? "lower" : "higher";
};

export const getResearchMetroFamilyCostGuidance = (
  originSlug: string,
  destinationSlug: string,
  currentMonthlyExpensesDollars: number,
): ResearchMetroFamilyCostGuidance | null => {
  const expenseGuidance = getResearchMetroExpenseGuidance(
    originSlug,
    destinationSlug,
    currentMonthlyExpensesDollars,
  );
  if (expenseGuidance === null) return null;

  const monthlyDifferenceDollars =
    expenseGuidance.suggestedMonthlyExpensesDollars -
    expenseGuidance.currentMonthlyExpensesDollars;
  const direction = directionFromDifference(monthlyDifferenceDollars);

  return Object.freeze({
    version: "bea-2024-family-cost-context-v1",
    role: "Context only",
    originMonthlyExpensesDollars: expenseGuidance.currentMonthlyExpensesDollars,
    destinationMonthlyExpensesDollars:
      expenseGuidance.suggestedMonthlyExpensesDollars,
    monthlyDifferenceDollars,
    direction,
    summary:
      direction === "similar"
        ? "BEA regional prices suggest broad family operating costs are similar after housing is excluded."
        : `BEA regional prices suggest broad family operating costs are ${direction} after housing is excluded.`,
    childcareBoundary:
      "Childcare, school fit, taxes, and household-specific costs can still move the answer. Keep those needs visible when they matter.",
    source: expenseGuidance.source,
  });
};
