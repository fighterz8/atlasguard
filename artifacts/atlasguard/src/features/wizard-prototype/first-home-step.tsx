import { RESEARCH_METRO_RENT_SOURCE } from "@workspace/benchmark-data";
import { AlertTriangle, Home } from "lucide-react";
import React from "react";

import { createFirstHomeModel } from "./first-home-model";
import type {
  HouseholdPlanDraft,
  RentCeilingType,
  SupportedPlaceSlug,
  WizardErrors,
} from "./model";
import { createInitialHouseholdPlan, isHardRentCeiling } from "./model";

type FirstHomeStepProps = {
  originSlug: SupportedPlaceSlug | "";
  destinationSlug: SupportedPlaceSlug | "";
  housing: HouseholdPlanDraft["housing"];
  errors: WizardErrors;
  onHousingChange: (housing: HouseholdPlanDraft["housing"]) => void;
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

const tenureOptions = [
  { value: "rent", label: "Rent first" },
  { value: "rent_then_buy", label: "Rent first, with ownership later" },
] as const;

const homeTypeOptions = [
  { value: "apartment_or_condo", label: "Apartment or condo" },
  { value: "townhome", label: "Townhome" },
  { value: "detached", label: "Detached home" },
  { value: "flexible", label: "Flexible" },
] as const;

const bedroomOptions = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 bedroom" },
  { value: "2", label: "2 bedrooms" },
  { value: "3", label: "3 bedrooms" },
  { value: "4_plus", label: "4 or more bedrooms" },
] as const;

const bathroomOptions = [
  { value: "1", label: "1 bathroom" },
  { value: "1_5", label: "1.5 bathrooms" },
  { value: "2", label: "2 bathrooms" },
  { value: "3_plus", label: "3 or more bathrooms" },
] as const;

const ceilingOptions = [
  {
    value: "hard",
    label: "Hard limit",
    detail: "Going over can stop the move.",
  },
  {
    value: "target",
    label: "Target",
    detail: "Aim for this amount; a tradeoff is possible.",
  },
  {
    value: "flexible",
    label: "Flexible",
    detail: "Use this as a planning reference.",
  },
  {
    value: "not_sure",
    label: "Not sure",
    detail: "Keep the ceiling meaning open for review.",
  },
] as const satisfies readonly {
  value: RentCeilingType;
  label: string;
  detail: string;
}[];

export function FirstHomeStep({
  originSlug,
  destinationSlug,
  housing,
  errors,
  onHousingChange,
}: FirstHomeStepProps) {
  const update = (key: keyof HouseholdPlanDraft["housing"], value: string) =>
    onHousingChange({
      ...housing,
      [key]: value,
    } as HouseholdPlanDraft["housing"]);

  const updateCeilingType = (value: RentCeilingType) =>
    onHousingChange({
      ...housing,
      ceilingType: value,
      stopsMove: isHardRentCeiling({ ceilingType: value, stopsMove: "" })
        ? "yes"
        : "no",
    });

  const model = createFirstHomeModel({
    originSlug,
    destinationSlug,
    householdPlan: {
      ...createInitialHouseholdPlan(),
      housing,
    },
  });
  const estimate = model.estimate;
  const ceiling = model.ceiling;
  const ceilingLabel =
    ceiling?.type === "hard"
      ? "hard limit"
      : ceiling?.type === "target"
        ? "target"
        : ceiling?.type === "flexible"
          ? "flexible reference"
          : "ceiling";

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 3 of 6</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Plan the first home
          </h1>
        </div>
        <Home aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Define the first rental that has to work. MoveWise will price the
        bedroom need with public metro evidence, then keep that estimate beside
        your ceiling instead of quietly substituting one for the other.
      </p>

      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
            <Home aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">Home requirements</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              V1 evaluates the immediate rental stage. Ownership later remains
              visible context, not a second home-buying calculation.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SelectField
            id="householdPlan-housing-tenure"
            label="First housing stage"
            value={housing.tenure}
            options={tenureOptions}
            error={errors["householdPlan.housing.tenure"]}
            onChange={(value) => update("tenure", value)}
          />
          <SelectField
            id="householdPlan-housing-type"
            label="Home type"
            value={housing.type}
            options={homeTypeOptions}
            error={errors["householdPlan.housing.type"]}
            onChange={(value) => update("type", value)}
          />
          <SelectField
            id="householdPlan-housing-bedrooms"
            label="Minimum bedrooms"
            value={housing.bedrooms}
            options={bedroomOptions}
            error={errors["householdPlan.housing.bedrooms"]}
            onChange={(value) => update("bedrooms", value)}
          />
          <SelectField
            id="householdPlan-housing-bathrooms"
            label="Minimum bathrooms"
            value={housing.bathrooms}
            options={bathroomOptions}
            error={errors["householdPlan.housing.bathrooms"]}
            onChange={(value) => update("bathrooms", value)}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
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
                value={housing.maxMonthlyCost}
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
                  update("maxMonthlyCost", event.currentTarget.value)
                }
                className="control-input pl-7"
              />
            </div>
            <FieldError
              id="householdPlan-housing-maxMonthlyCost-error"
              message={errors["householdPlan.housing.maxMonthlyCost"]}
            />
          </div>

          <fieldset
            id="householdPlan-housing-ceilingType"
            aria-invalid={
              errors["householdPlan.housing.ceilingType"] ? "true" : undefined
            }
            aria-describedby={
              errors["householdPlan.housing.ceilingType"]
                ? "householdPlan-housing-ceilingType-error"
                : undefined
            }
          >
            <legend className="text-sm font-semibold text-slate-800">
              How firm is this ceiling?
            </legend>
            <div className="mt-2 grid gap-2">
              {ceilingOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"
                >
                  <input
                    type="radio"
                    name="householdPlan-housing-ceilingType"
                    value={option.value}
                    checked={housing.ceilingType === option.value}
                    onChange={() => updateCeilingType(option.value)}
                    className="mt-0.5 h-4 w-4 accent-teal-700"
                  />
                  <span>
                    <span className="block font-semibold">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {option.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError
              id="householdPlan-housing-ceilingType-error"
              message={errors["householdPlan.housing.ceilingType"]}
            />
          </fieldset>
        </div>
      </section>

      <section
        aria-live="polite"
        aria-label="First home consequence"
        className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-800">
            First home consequence
          </p>
          <div className="flex gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-900">
              MoveWise estimate
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              Estimated
            </span>
          </div>
        </div>

        {estimate && model.destinationCity ? (
          <>
            <p className="mt-3 text-xl font-semibold tracking-[-0.02em] text-teal-950 tabular-nums">
              {model.destinationCity}: {dollars.format(estimate.monthlyDollars)}
              /month
            </p>
            {estimate.rangeLowDollars !== null &&
            estimate.rangeHighDollars !== null ? (
              <p className="mt-1 text-sm text-teal-900/80 tabular-nums">
                Planning range {dollars.format(estimate.rangeLowDollars)}–
                {dollars.format(estimate.rangeHighDollars)}
              </p>
            ) : null}
            {ceiling?.gapDollars !== null &&
            ceiling?.gapDollars !== undefined ? (
              <p
                className={`mt-3 text-sm font-semibold ${ceiling.conflict ? "text-risk" : "text-teal-950"}`}
              >
                {ceiling.direction === "over"
                  ? `${dollars.format(Math.abs(ceiling.gapDollars))} over your ${ceilingLabel}`
                  : ceiling.direction === "under"
                    ? `${dollars.format(ceiling.gapDollars)} under your ${ceilingLabel}`
                    : `At your ${ceilingLabel}`}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Add a ceiling to see the exact gap.
              </p>
            )}
            {ceiling?.blocker ? (
              <div className="mt-4 flex gap-3 rounded-lg border border-risk/25 bg-risk-surface p-3 text-risk">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <p className="text-sm font-semibold leading-5">
                  This conflict can block favorable housing-fit language. The
                  budget still uses the market estimate so the contradiction
                  stays visible.
                </p>
              </div>
            ) : null}
            {ceiling?.meaningOpen ? (
              <p className="mt-3 text-sm font-semibold text-caution">
                The ceiling amount is known, but how firm it is remains open.
              </p>
            ) : null}
            <p className="mt-4 text-sm leading-6 text-teal-950/80">
              {estimate.stockCategoryLabel.replace(/^./, (letter) =>
                letter.toUpperCase(),
              )}{" "}
              make up {percent(estimate.destinationRenterStockShareBps)} of{" "}
              {model.destinationCity} renter-occupied homes
              {model.originCity
                ? ` versus ${percent(estimate.originRenterStockShareBps)} in ${model.originCity}`
                : ""}
              .
            </p>
            <p className="mt-3 text-xs leading-5 text-teal-900/70">
              U.S. Census Bureau ·{" "}
              {RESEARCH_METRO_RENT_SOURCE.observationPeriod} · tables B25031 and
              B25042. Occupied rental stock is a market proxy, not live listing
              availability or a guarantee of a matching home.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Choose minimum bedrooms to calculate a requirement-aware rent
            estimate.
          </p>
        )}
      </section>
    </div>
  );
}
