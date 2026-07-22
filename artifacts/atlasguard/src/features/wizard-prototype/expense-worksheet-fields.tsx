import React from "react";

import {
  expenseCategoryDefinitions,
  getExpenseWorksheetTotal,
  type ExpenseCategoryId,
  type ExpenseWorksheetDraft,
} from "./expense-worksheet";
import type { WizardErrors } from "./model";

type ExpenseWorksheetFieldsProps = {
  worksheet: ExpenseWorksheetDraft;
  currentTotal: string;
  errors: WizardErrors;
  onEnabledChange: (enabled: boolean) => void;
  onCategoryChange: (key: ExpenseCategoryId, value: string) => void;
};

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ExpenseWorksheetFields({
  worksheet,
  currentTotal,
  errors,
  onEnabledChange,
  onCategoryChange,
}: ExpenseWorksheetFieldsProps) {
  const total = getExpenseWorksheetTotal(worksheet);

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="text-xs leading-5 text-slate-600">
        Include utilities, transport, food, childcare, debt, non-housing
        insurance and health costs, subscriptions, and other normal monthly
        spending. Do not include rent or mortgage here.
      </p>
      <button
        type="button"
        aria-expanded={worksheet.enabled}
        onClick={() => onEnabledChange(!worksheet.enabled)}
        className="mt-2 min-h-11 text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950"
      >
        {worksheet.enabled ? "Use one total instead" : "Break this total down"}
      </button>

      {worksheet.enabled ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-3">
            <p className="text-sm font-semibold text-slate-950">
              Everything else total
            </p>
            <p className="text-sm font-semibold tabular-nums text-slate-950">
              {total === null
                ? "Fix a category"
                : dollars.format(total || Number(currentTotal) || 0)}
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {expenseCategoryDefinitions.map(({ id, label, example }) => {
              const error = errors[`finances.expenseWorksheet.${id}`];
              return (
                <div key={id}>
                  <label
                    htmlFor={`expense-${id}`}
                    className="text-xs font-semibold text-slate-900"
                  >
                    {label}
                  </label>
                  <p className="mt-0.5 text-[0.6875rem] leading-4 text-slate-500">
                    {example}
                  </p>
                  <div className="relative mt-1.5">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500"
                    >
                      $
                    </span>
                    <input
                      id={`expense-${id}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={worksheet.values[id]}
                      aria-invalid={error ? "true" : undefined}
                      aria-describedby={
                        error ? `expense-${id}-error` : undefined
                      }
                      onChange={(event) =>
                        onCategoryChange(id, event.currentTarget.value)
                      }
                      className="control-input min-h-11 pl-7 text-sm tabular-nums"
                      placeholder="0"
                    />
                  </div>
                  {error ? (
                    <p
                      id={`expense-${id}-error`}
                      role="alert"
                      className="mt-1 text-xs font-medium leading-5 text-risk"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
