export const expenseCategoryDefinitions = [
  { id: "utilities", label: "Utilities", example: "Power, water, internet" },
  { id: "transport", label: "Transport", example: "Car, fuel, transit" },
  {
    id: "food",
    label: "Food & household",
    example: "Groceries, household supplies",
  },
  {
    id: "childcare",
    label: "Childcare",
    example: "Care, after-school programs",
  },
  { id: "debt", label: "Debt payments", example: "Loans, credit cards" },
  {
    id: "insurance",
    label: "Insurance & health",
    example: "Non-housing premiums, care",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    example: "Phone, streaming, memberships",
  },
  { id: "other", label: "Other", example: "Anything recurring not listed" },
] as const;

export type ExpenseCategoryId =
  (typeof expenseCategoryDefinitions)[number]["id"];

export type ExpenseWorksheetDraft = Readonly<{
  enabled: boolean;
  values: Record<ExpenseCategoryId, string>;
}>;

export const createInitialExpenseWorksheet = (): ExpenseWorksheetDraft => ({
  enabled: false,
  values: Object.fromEntries(
    expenseCategoryDefinitions.map(({ id }) => [id, ""]),
  ) as Record<ExpenseCategoryId, string>,
});

export const enableExpenseWorksheet = (
  currentTotal: string,
): ExpenseWorksheetDraft => ({
  ...createInitialExpenseWorksheet(),
  enabled: true,
  values: {
    ...createInitialExpenseWorksheet().values,
    other: currentTotal,
  },
});

const monthlyWholeDollars = (value: string) => {
  if (value.trim() === "") return 0;
  const amount = Number(value.trim().replace(/,/g, ""));
  return Number.isInteger(amount) && amount >= 0 ? amount : null;
};

export const getExpenseWorksheetTotal = (
  worksheet: ExpenseWorksheetDraft,
): number | null => {
  let total = 0;
  for (const { id } of expenseCategoryDefinitions) {
    const amount = monthlyWholeDollars(worksheet.values[id]);
    if (amount === null) return null;
    total += amount;
  }
  return total;
};

export const getExpenseWorksheetErrors = (
  worksheet: ExpenseWorksheetDraft,
): Record<string, string> =>
  Object.fromEntries(
    expenseCategoryDefinitions.flatMap(({ id, label }) =>
      monthlyWholeDollars(worksheet.values[id]) === null
        ? [
            [
              `finances.expenseWorksheet.${id}`,
              `${label} must be a whole-dollar monthly amount of 0 or more.`,
            ],
          ]
        : [],
    ),
  );
