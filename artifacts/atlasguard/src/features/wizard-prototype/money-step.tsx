import {
  getResearchMetroHousingContext,
  getResearchMetroIncomeGuidance,
} from "@workspace/benchmark-data";
import { Home, Landmark } from "lucide-react";
import React from "react";

import { moneyComparisons } from "./money-comparison-card";
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
  errors: WizardErrors;
  onValueChange: (key: ValueKey, value: string) => void;
  onBasisChange: (key: BasisKey, value: AssumptionBasis) => void;
  onGrossKnownChange: (value: boolean) => void;
  onCurrentHousingTenureChange: (value: "rent" | "own") => void;
};

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatCents = (value: number) => dollars.format(value / 100);
const parseMonthlyDollars = (value: string) =>
  Number(value.trim().replace(/,/g, ""));

export function MoneyStep({
  finances,
  originSlug,
  destinationSlug,
  errors,
  onValueChange,
  onBasisChange,
  onGrossKnownChange,
  onCurrentHousingTenureChange,
}: MoneyStepProps) {
  const taxContext =
    originSlug === "" || destinationSlug === ""
      ? null
      : getStateIncomeTaxContext(originSlug, destinationSlug);
  const housingContext =
    originSlug === "" || destinationSlug === ""
      ? null
      : getResearchMetroHousingContext(originSlug, destinationSlug);
  const incomeGuidance =
    originSlug === "" || destinationSlug === ""
      ? null
      : getResearchMetroIncomeGuidance(
          originSlug,
          destinationSlug,
          parseMonthlyDollars(finances.currentTakeHome),
        );
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
          <p className="eyebrow">Step 2 of 4</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Your current monthly baseline
          </h1>
        </div>
        <Landmark aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Enter the money facts you know today. MoveWise uses public metro income
        data for the destination take-home estimate and visible baselines for
        costs where a personal budget cannot be inferred. Every assumption stays
        editable.
      </p>

      {taxContext ? (
        <aside className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
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
          <details className="mt-3 border-t border-slate-200 pt-3">
            <summary className="min-h-11 cursor-pointer py-2 text-xs font-semibold text-slate-700">
              Official sources · {taxContext.version}
            </summary>
            <ul className="space-y-2 pb-1 text-xs text-slate-600">
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
          </details>
        </aside>
      ) : null}

      <div className="mt-6 space-y-5">
        <section
          aria-labelledby="current-money-heading"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="border-b border-slate-200 pb-4">
            <h2
              id="current-money-heading"
              className="text-base font-semibold text-slate-950"
            >
              Your current monthly baseline
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use normal monthly amounts after tax for income, housing, and
              recurring costs outside housing.
            </p>
          </div>
          <fieldset
            id="currentHousingTenure"
            className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <legend className="px-1 text-sm font-semibold text-slate-950">
              Do you currently rent or own?
            </legend>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
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
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  basis="confirmed"
                  error={errors[`finances.${definition.current.id}`]}
                  onValueChange={(value) =>
                    onValueChange(definition.current.id, value)
                  }
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="benchmark">Editable defaults</StatusBadge>
            <span className="text-xs font-medium text-teal-900/75">
              Destination plan
            </span>
          </div>
          <h2 className="mt-3 text-base font-semibold text-teal-950">
            Your destination starting assumptions
          </h2>
          <p className="mt-2 text-sm leading-6 text-teal-900/80">
            Destination take-home uses the latest supported Census metro
            household-income comparison. Housing and other costs begin at your
            current amounts because regional medians are context, not your
            personal budget. Change any field you expect to be different.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {moneyComparisons.map((definition) => {
              const hasOverride = finances[definition.target.id].trim() !== "";
              const hasPublicIncomeEstimate =
                definition.kind === "take_home" && incomeGuidance !== null;
              return (
                <div
                  key={definition.kind}
                  className="rounded-lg border border-teal-200 bg-white p-4"
                >
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
                          : finances[definition.current.id]
                    }
                    basis={finances[definition.target.basisKey]}
                    basisKey={definition.target.basisKey}
                    sourceLabel={
                      hasOverride
                        ? "You told us"
                        : hasPublicIncomeEstimate
                          ? "MoveWise public-data estimate"
                          : "MoveWise starting assumption"
                    }
                    error={errors[`finances.${definition.target.id}`]}
                    onValueChange={(value) =>
                      onValueChange(definition.target.id, value)
                    }
                    onBasisChange={onBasisChange}
                    onReset={
                      hasOverride
                        ? () => onValueChange(definition.target.id, "")
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
          {incomeGuidance ? (
            <div className="mt-4 rounded-lg border border-teal-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                How the destination income estimate was formed
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                MoveWise adjusted your current take-home by the
                destination-to-origin metro median household-income ratio. The
                editable estimate is{" "}
                {dollars.format(incomeGuidance.suggestedMonthlyTakeHomeDollars)}{" "}
                per month, with a data uncertainty range of{" "}
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
                ACS table {incomeGuidance.source.tableId}. This is a planning
                estimate, not a paycheck or job-offer forecast.
              </p>
              <a
                href={incomeGuidance.source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
              >
                View official Census source
              </a>
            </div>
          ) : null}
          {housingContext ? (
            <div className="mt-4 rounded-lg border border-teal-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                Available metro rent context
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {housingContext.origin.label}:{" "}
                {formatCents(housingContext.metric.originValue)} ·{" "}
                {housingContext.destination.label}:{" "}
                {formatCents(housingContext.metric.destinationValue)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Context-only ACS median gross rent. It is not your housing
                budget and is not substituted into the score.
              </p>
            </div>
          ) : null}
        </section>

        <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-950">
            What would your household’s total monthly income be before taxes in
            the destination?
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
                description="Total monthly household income before taxes. Use an estimate if it is not confirmed yet."
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

        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 marker:hidden">
            <Home aria-hidden="true" className="h-4 w-4 text-slate-500" />
            Keeping a property after the move?
          </summary>
          <div className="border-t border-slate-200 bg-white p-4">
            <MoneyInput
              id="retainedPropertyNet"
              label="Monthly property impact"
              description="Use a positive amount for net income or a negative amount for an ongoing cost. Leave 0 if there is no retained property."
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
        </details>
      </div>
    </div>
  );
}

export type { BasisKey, FinanceKey, ValueKey };
