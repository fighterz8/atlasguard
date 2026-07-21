import {
  RESEARCH_METRO_RENT_SOURCE,
  getResearchMetroRentGuidance,
  getSupportedResearchPlace,
} from "@workspace/benchmark-data";
import { Home, Users } from "lucide-react";
import React from "react";
import type { MoveWiseHouseholdMode } from "@workspace/contracts";

import type {
  HouseholdPlanDraft,
  SupportedPlaceSlug,
  WizardErrors,
} from "./model";

type HouseholdStepProps = {
  mode: MoveWiseHouseholdMode | "";
  originSlug: SupportedPlaceSlug | "";
  destinationSlug: SupportedPlaceSlug | "";
  plan: HouseholdPlanDraft;
  errors: WizardErrors;
  onPlanChange: (plan: HouseholdPlanDraft) => void;
};

type SelectOption = { value: string; label: string };

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = (basisPoints: number) => `${(basisPoints / 100).toFixed(1)}%`;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-2 text-sm font-medium text-risk">
      {message}
    </p>
  ) : null;
}

function SelectField({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      <select
        id={id}
        value={value}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="control-input mt-2"
      >
        <option value="">Choose one</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function YesNoQuestion({
  id,
  legend,
  value,
  error,
  onChange,
}: {
  id: string;
  legend: string;
  value: "" | "yes" | "no";
  error?: string;
  onChange: (value: "yes" | "no") => void;
}) {
  return (
    <fieldset
      id={id}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="text-sm font-semibold text-slate-800">{legend}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {[
          { value: "yes" as const, label: "Yes" },
          { value: "no" as const, label: "No" },
        ].map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"
          >
            <input
              id={`${id}-${option.value}`}
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-teal-700"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

const tenureOptions = [
  { value: "rent", label: "Rent first" },
  { value: "rent_then_buy", label: "Rent first, with ownership later" },
] as const;

const bedroomOptions = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 bedroom" },
  { value: "2", label: "2 bedrooms" },
  { value: "3", label: "3 bedrooms" },
  { value: "4_plus", label: "4 or more bedrooms" },
] as const;

export function HouseholdStep({
  mode,
  originSlug,
  destinationSlug,
  plan,
  errors,
  onPlanChange,
}: HouseholdStepProps) {
  const updateHousing = (
    key: keyof HouseholdPlanDraft["housing"],
    value: string,
  ) =>
    onPlanChange({
      ...plan,
      housing: { ...plan.housing, [key]: value },
    } as HouseholdPlanDraft);

  const guidance =
    originSlug === "" || destinationSlug === ""
      ? null
      : getResearchMetroRentGuidance(
          originSlug,
          destinationSlug,
          plan.housing.bedrooms,
        );
  const origin =
    originSlug === "" ? null : getSupportedResearchPlace(originSlug);
  const destination =
    destinationSlug === "" ? null : getSupportedResearchPlace(destinationSlug);
  const normalizedBudget = plan.housing.maxMonthlyCost.trim().replace(/,/g, "");
  const budget = /^\d+$/.test(normalizedBudget)
    ? Number(normalizedBudget)
    : null;
  const destinationRent = guidance?.destination.monthlyGrossRentDollars;
  const budgetDifference =
    budget === null || destinationRent === undefined
      ? null
      : budget - destinationRent;
  const rentDifference = guidance?.monthlyDifferenceDollars ?? 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 4 of 5</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Your first rental plan
          </h1>
        </div>
        <Users aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Tell MoveWise what the first home needs to support. We will price the
        requested bedroom count with public metro evidence and compare it with
        your rent ceiling—no opinion score required.
      </p>

      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
            <Home aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">
              Rent-first v1 scope
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              V1 evaluates the immediate rental stage. Ownership later is saved
              as context, but buying later does not change the first-stage
              score.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SelectField
            id="householdPlan-housing-tenure"
            label="First housing stage"
            value={plan.housing.tenure}
            options={tenureOptions}
            error={errors["householdPlan.housing.tenure"]}
            onChange={(value) => updateHousing("tenure", value)}
          />
          <SelectField
            id="householdPlan-housing-bedrooms"
            label="Minimum bedrooms"
            value={plan.housing.bedrooms}
            options={bedroomOptions}
            error={errors["householdPlan.housing.bedrooms"]}
            onChange={(value) => updateHousing("bedrooms", value)}
          />
          <div>
            <label
              htmlFor="householdPlan-housing-maxMonthlyCost"
              className="text-sm font-semibold text-slate-800"
            >
              Maximum monthly rent
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                $
              </span>
              <input
                id="householdPlan-housing-maxMonthlyCost"
                inputMode="numeric"
                value={plan.housing.maxMonthlyCost}
                aria-invalid={
                  errors["householdPlan.housing.maxMonthlyCost"]
                    ? "true"
                    : undefined
                }
                aria-describedby={
                  errors["householdPlan.housing.maxMonthlyCost"]
                    ? "householdPlan-housing-maxMonthlyCost-error"
                    : undefined
                }
                onChange={(event) =>
                  updateHousing("maxMonthlyCost", event.currentTarget.value)
                }
                className="control-input pl-7"
              />
            </div>
            <FieldError
              id="householdPlan-housing-maxMonthlyCost-error"
              message={errors["householdPlan.housing.maxMonthlyCost"]}
            />
          </div>
          <YesNoQuestion
            id="householdPlan-housing-stopsMove"
            legend="Is this rent ceiling non-negotiable?"
            value={plan.housing.stopsMove}
            error={errors["householdPlan.housing.stopsMove"]}
            onChange={(value) => updateHousing("stopsMove", value)}
          />
        </div>

        {guidance && origin && destination ? (
          <aside className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-800">
              MoveWise rent estimate
            </p>
            <p className="mt-2 text-base font-semibold text-teal-950">
              {destination.city}: {dollars.format(destinationRent!)} per month
            </p>
            <p className="mt-2 text-sm leading-6 text-teal-950/80">
              That is {dollars.format(Math.abs(rentDifference))}{" "}
              {rentDifference <= 0 ? "less" : "more"} than the same bedroom
              category in {origin.city}.{" "}
              {guidance.stockCategoryLabel.replace(/^./, (letter) =>
                letter.toUpperCase(),
              )}{" "}
              make up {percent(guidance.destination.renterStockShareBps)} of{" "}
              {destination.city} renter-occupied homes versus{" "}
              {percent(guidance.origin.renterStockShareBps)} in {origin.city}.
            </p>
            {budgetDifference !== null ? (
              <p
                className={`mt-3 text-sm font-semibold ${budgetDifference >= 0 ? "text-teal-950" : "text-risk"}`}
              >
                {budgetDifference >= 0
                  ? `${dollars.format(destinationRent!)} is ${dollars.format(budgetDifference)} under your ceiling.`
                  : `${dollars.format(destinationRent!)} is ${dollars.format(Math.abs(budgetDifference))} over your ceiling.`}
              </p>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-teal-900/70">
              U.S. Census Bureau ·{" "}
              {RESEARCH_METRO_RENT_SOURCE.observationPeriod} · tables B25031 and
              B25042. Occupied rental stock is a market proxy, not live listing
              availability or a guarantee of a matching home.
            </p>
          </aside>
        ) : null}
      </section>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {mode === "family" ? "Family" : "Individual"} childcare, schools,
        services, support-network, bathroom, home-type, and ownership analysis
        will enter later evidence modules only when MoveWise can supply the
        comparison rather than ask you to guess.
      </p>
    </div>
  );
}
