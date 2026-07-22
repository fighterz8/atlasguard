import { describe, expect, it } from "vitest";

import {
  createInitialExpenseWorksheet,
  enableExpenseWorksheet,
  getExpenseWorksheetErrors,
  getExpenseWorksheetTotal,
} from "./expense-worksheet";

describe("Budget expense worksheet", () => {
  it("starts as an optional helper and preserves an existing total when enabled", () => {
    expect(createInitialExpenseWorksheet()).toMatchObject({ enabled: false });
    const worksheet = enableExpenseWorksheet("2,300");
    expect(worksheet.values.other).toBe("2,300");
    expect(getExpenseWorksheetTotal(worksheet)).toBe(2300);
  });

  it("emits one canonical non-housing total", () => {
    const worksheet = enableExpenseWorksheet("");
    worksheet.values.utilities = "300";
    worksheet.values.transport = "650";
    worksheet.values.food = "900";
    worksheet.values.childcare = "450";

    expect(getExpenseWorksheetTotal(worksheet)).toBe(2300);
  });

  it("fails closed for negative or non-whole-dollar category values", () => {
    const worksheet = enableExpenseWorksheet("");
    worksheet.values.debt = "-25";
    worksheet.values.other = "12.50";

    expect(getExpenseWorksheetTotal(worksheet)).toBeNull();
    expect(getExpenseWorksheetErrors(worksheet)).toEqual({
      "finances.expenseWorksheet.debt":
        "Debt payments must be a whole-dollar monthly amount of 0 or more.",
      "finances.expenseWorksheet.other":
        "Other must be a whole-dollar monthly amount of 0 or more.",
    });
  });
});
