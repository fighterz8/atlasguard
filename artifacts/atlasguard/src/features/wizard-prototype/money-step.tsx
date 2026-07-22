import { Home, Landmark } from "lucide-react";
import React from "react";

import { BudgetConsequenceStrip, BudgetRoomLeft } from "./budget-equation";
import { createBudgetEquationModel } from "./budget-equation-model";
import { moneyComparisons } from "./money-comparison-card";
import { ExpenseWorksheetFields } from "./expense-worksheet-fields";
import type { ExpenseCategoryId } from "./expense-worksheet";
import type { BasisKey, FinanceKey, ValueKey } from "./money-control-types";
import { MoneyInput } from "./money-input";
import type {
  AssumptionBasis,
  SupportedPlaceSlug,
  WizardErrors,
  WizardPrototypeDraft,
} from "./model";
import { getStateIncomeTaxContext } from "./state-income-tax-context";
import { StatusBadge } from "../ux-system/status-badge";

type MoneyStepProps = {
  finances: WizardPrototypeDraft["finances"];
  originSlug: SupportedPlaceSlug | "";
  destinationSlug: SupportedPlaceSlug | "";
  firstHomeRentEstimate?: number | null;
  errors: WizardErrors;
  onValueChange: (key: ValueKey, value: string) => void;
  onBasisChange: (key: BasisKey, value: AssumptionBasis) => void;
  onGrossKnownChange: (value: boolean) => void;
  onCurrentHousingTenureChange: (value: "rent" | "own") => void;
  onExpenseWorksheetEnabledChange: (enabled: boolean) => void;
  onExpenseCategoryChange: (key: ExpenseCategoryId, value: string) => void;
};

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function MoneyStep({
  finances,
  originSlug,
  destinationSlug,
  firstHomeRentEstimate = null,
  errors,
  onValueChange,
  onBasisChange,
  onGrossKnownChange,
  onCurrentHousingTenureChange,
  onExpenseWorksheetEnabledChange,
  onExpenseCategoryChange,
}: MoneyStepProps) {
  const taxContext =
    originSlug === "" || destinationSlug === ""
      ? null
      : getStateIncomeTaxContext(originSlug, destinationSlug);
  const budgetEquation = createBudgetEquationModel(
    finances,
    originSlug,
    destinationSlug,
    firstHomeRentEstimate,
  );
  const expenseGuidance = budgetEquation.expenseGuidance;
  const incomeGuidance = budgetEquation.incomeGuidance;
  const taxTone =
    taxContext?.direction === "destination_may_increase_take_home"
      ? ("favorable" as const)
      : taxContext?.direction === "destination_may_reduce_take_home"
        ? ("caution" as const)
        : ("neutral" as const);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 2 of 6</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Build a normal month, not a perfect one
          </h1>
        </div>
        <Landmark aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Start with three monthly numbers you can recognize. MoveWise will use
        them to estimate a first month in your destination; every estimate stays
        editable.
      </p>

      <div className="mt-4 space-y-5 sm:mt-6">
        <section
          aria-labelledby="current-money-heading"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="border-b border-slate-200 pb-3 sm:pb-4">
            <h2
              id="current-money-heading"
              className="text-base font-semibold text-slate-950"
            >
              Your month now
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use whole-dollar amounts for one normal month. USD/month.
            </p>
          </div>
          <fieldset
            id="currentHousingTenure"
            className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:mt-5 sm:p-4"
          >
            <legend className="px-1 text-sm font-semibold text-slate-950">
              Do you currently rent or own?
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:gap-6">
              {(["rent", "own"] as const).map((tenure) => (
                <label
                  key={tenure}
                  className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium capitalize text-slate-800"
                >
                  <input
                    type="radio"
                    name="currentHousingTenure"
                    checked={finances.currentHousingTenure === tenure}
                    onChange={() => onCurrentHousingTenureChange(tenure)}
                    className="h-4 w-4 accent-teal-800"
                  />
                  {tenure}
                </label>
              ))}
            </div>
            {errors["finances.currentHousingTenure"] ? (
              <p className="mt-2 text-sm font-medium text-risk" role="alert">
                {errors["finances.currentHousingTenure"]}
              </p>
            ) : null}
          </fieldset>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {moneyComparisons.map((definition) => (
              <div
                key={definition.kind}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <MoneyInput
                  id={definition.current.id}
                  label={definition.title}
                  accessibleLabel={`Current ${definition.title.toLowerCase()}`}
                  description={definition.current.description}
                  value={finances[definition.current.id]}
                  readOnly={
                    definition.kind === "expenses" &&
                    finances.expenseWorksheet.enabled
                  }
                  basis="confirmed"
                  error={errors[`finances.${definition.current.id}`]}
                  onValueChange={(value) =>
                    onValueChange(definition.current.id, value)
                  }
                />
              </div>
            ))}
          </div>
          <ExpenseWorksheetFields
            worksheet={finances.expenseWorksheet}
            currentTotal={finances.currentExpenses}
            errors={errors}
            onEnabledChange={onExpenseWorksheetEnabledChange}
            onCategoryChange={onExpenseCategoryChange}
          />
          <BudgetRoomLeft model={budgetEquation} side="current" />
        </section>

        <section className="rounded-xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="benchmark">Editable defaults</StatusBadge>
            <span className="text-xs font-medium text-teal-900/75">
              Destination plan
            </span>
          </div>
          <h2 className="mt-3 text-base font-semibold text-teal-950">
            First month there
          </h2>
          <p className="mt-2 text-sm leading-6 text-teal-900/80">
            MoveWise estimates income after tax and everything else from public
            metro data. Home waits for your First home plan. Edit any number
            when you know something better.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {moneyComparisons.map((definition) => {
              const hasOverride = finances[definition.target.id].trim() !== "";
              const hasPublicIncomeEstimate =
                definition.kind === "take_home" && incomeGuidance !== null;
              const hasPublicExpenseEstimate =
                definition.kind === "expenses" && expenseGuidance !== null;
              const isDeferredHousing =
                definition.kind === "housing" &&
                !hasOverride &&
                firstHomeRentEstimate === null;
              return (
                <div
                  key={definition.kind}
                  className="rounded-lg border border-teal-200 bg-white p-4"
                >
                  {isDeferredHousing ? (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {definition.title}
                        </p>
                        <StatusBadge tone="unavailable">
                          Waiting on plan
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Complete First home to calculate a requirement-aware
                        rent estimate.
                      </p>
                      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                        Not calculated yet
                      </p>
                    </div>
                  ) : (
                    <MoneyInput
                      id={definition.target.id}
                      label={definition.title}
                      accessibleLabel={`Destination ${definition.title.toLowerCase()}`}
                      description={definition.target.description}
                      value={
                        hasOverride
                          ? finances[definition.target.id]
                          : hasPublicIncomeEstimate
                            ? String(
                                incomeGuidance.suggestedMonthlyTakeHomeDollars,
                              )
                            : hasPublicExpenseEstimate
                              ? String(
                                  expenseGuidance.suggestedMonthlyExpensesDollars,
                                )
                              : definition.kind === "housing" &&
                                  firstHomeRentEstimate !== null
                                ? String(firstHomeRentEstimate)
                                : ""
                      }
                      basis={finances[definition.target.basisKey]}
                      basisKey={
                        isDeferredHousing
                          ? undefined
                          : definition.target.basisKey
                      }
                      sourceLabel={
                        hasOverride
                          ? "You told us"
                          : hasPublicIncomeEstimate ||
                              hasPublicExpenseEstimate ||
                              (definition.kind === "housing" &&
                                firstHomeRentEstimate !== null)
                            ? "MoveWise estimate"
                            : "Calculated after your rental plan"
                      }
                      error={errors[`finances.${definition.target.id}`]}
                      onValueChange={(value) =>
                        onValueChange(definition.target.id, value)
                      }
                      onBasisChange={
                        isDeferredHousing ? undefined : onBasisChange
                      }
                      onReset={
                        hasOverride
                          ? () => onValueChange(definition.target.id, "")
                          : undefined
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
          <BudgetRoomLeft model={budgetEquation} side="destination" />
          {incomeGuidance ? (
            <details className="mt-4 rounded-lg border border-teal-200 bg-white p-4">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-950">
                Why this income estimate?
              </summary>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                MoveWise adjusts your current take-home using the income
                difference between the two metros. The editable starting number
                is{" "}
                {dollars.format(incomeGuidance.suggestedMonthlyTakeHomeDollars)}{" "}
                per month. A reasonable low-high planning range is{" "}
                {dollars.format(
                  incomeGuidance.plausibleMonthlyTakeHomeRangeDollars.low,
                )}
                –
                {dollars.format(
                  incomeGuidance.plausibleMonthlyTakeHomeRangeDollars.high,
                )}
                .
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                U.S. Census Bureau · {incomeGuidance.source.observationPeriod} ·
                ACS table {incomeGuidance.source.tableId}. Treat this as a
                starting point to edit.
              </p>
              <a
                href={incomeGuidance.source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
              >
                View official Census source
              </a>
            </details>
          ) : null}
          {expenseGuidance ? (
            <details className="mt-3 rounded-lg border border-teal-200 bg-white p-4">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-950">
                Why this everything-else estimate?
              </summary>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                MoveWise applied the destination-to-origin BEA regional price
                level ratio to your current non-housing recurring expenses. The
                editable estimate is{" "}
                {dollars.format(
                  expenseGuidance.suggestedMonthlyExpensesDollars,
                )}{" "}
                per month.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                U.S. Bureau of Economic Analysis ·{" "}
                {expenseGuidance.source.observationPeriod} · table{" "}
                {expenseGuidance.source.tableId}. {expenseGuidance.boundary}
              </p>
              <a
                href={expenseGuidance.source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
              >
                View official BEA source
              </a>
            </details>
          ) : null}
        </section>

        <BudgetConsequenceStrip model={budgetEquation} />

        {budgetEquation.destination.housing !== null ? (
          <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-950">
              What would your household’s total monthly income be before taxes
              in the destination?
            </legend>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              This is used only for the housing-burden check. MoveWise will not
              guess gross income from your take-home pay.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-5">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="radio"
                  name="targetGrossIncomeKnown"
                  checked={finances.targetGrossIncomeKnown}
                  onChange={() => onGrossKnownChange(true)}
                  className="h-4 w-4 accent-teal-800"
                />
                Enter monthly gross income
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="radio"
                  name="targetGrossIncomeKnown"
                  checked={!finances.targetGrossIncomeKnown}
                  onChange={() => onGrossKnownChange(false)}
                  className="h-4 w-4 accent-teal-800"
                />
                I don’t know
              </label>
            </div>
            {finances.targetGrossIncomeKnown ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <MoneyInput
                  id="targetGrossIncome"
                  label="Destination gross income"
                  description="Total monthly household income before taxes. Use an estimate if it is not verified yet."
                  value={finances.targetGrossIncome}
                  basis={finances.targetGrossIncomeBasis}
                  basisKey="targetGrossIncomeBasis"
                  error={errors["finances.targetGrossIncome"]}
                  onValueChange={(value) =>
                    onValueChange("targetGrossIncome", value)
                  }
                  onBasisChange={onBasisChange}
                />
              </div>
            ) : null}
          </fieldset>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-950">Housing-burden check</p>
            <p className="mt-1">
              MoveWise will ask about gross income only after your First home
              plan provides a destination housing amount.
            </p>
          </div>
        )}

        {taxContext ? (
          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-950">
              State wage-tax context
            </summary>
            <div className="pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={taxTone}>Official state context</StatusBadge>
                <span className="text-xs font-medium text-slate-500">
                  State wage taxes only
                </span>
              </div>
              <h2 className="mt-3 text-base font-semibold text-slate-950">
                {taxContext.headline}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {taxContext.explanation}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {taxContext.boundary}
              </p>
              <ul className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                {taxContext.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
                    >
                      {source.publisher} · {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}

        {finances.currentHousingTenure === "own" ? (
          <section className="rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex min-h-11 items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800">
              <Home aria-hidden="true" className="h-4 w-4 text-slate-500" />
              Keeping a property after the move?
            </div>
            <div className="border-t border-slate-200 bg-white p-4">
              <MoneyInput
                id="retainedPropertyNet"
                label="Monthly property impact"
                description="Use a positive amount for net income or a negative amount for an ongoing cost. Enter 0 if the property will not continue after the move."
                value={finances.retainedPropertyNet}
                basis={finances.retainedPropertyNetBasis}
                basisKey="retainedPropertyNetBasis"
                error={errors["finances.retainedPropertyNet"]}
                onValueChange={(value) =>
                  onValueChange("retainedPropertyNet", value)
                }
                onBasisChange={onBasisChange}
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export type { BasisKey, FinanceKey, ValueKey };
