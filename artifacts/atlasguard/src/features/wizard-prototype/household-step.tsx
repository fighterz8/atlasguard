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

const assessmentOptions = [
  { value: "unavailable", label: "Need to confirm" },
  { value: "positive", label: "Looks workable" },
  { value: "strong_positive", label: "Looks very workable" },
  { value: "neutral", label: "Mixed or unclear" },
  { value: "negative", label: "Looks difficult" },
  { value: "strong_negative", label: "Looks very difficult" },
] as const;

const childcareArrangementOptions = [
  { value: "center", label: "Center-based care" },
  { value: "home_based", label: "Home-based care" },
  { value: "in_home_caregiver", label: "In-home caregiver" },
  { value: "family_or_friend", label: "Family or friend care" },
  { value: "before_after_school", label: "Before/after school" },
  { value: "flexible", label: "Flexible" },
] as const;

const gradeBandOptions = [
  { value: "preschool", label: "Preschool" },
  { value: "elementary", label: "Elementary" },
  { value: "middle", label: "Middle school" },
  { value: "high", label: "High school" },
  { value: "multiple", label: "Multiple grade bands" },
] as const;

const schoolPreferenceOptions = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "either", label: "Either" },
] as const;

type ConditionalNeedKey =
  | "supportNetwork"
  | "childcare"
  | "school"
  | "requiredServices"
  | "carFreeAccess";

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

  const updateConditionalNeed = (
    key: ConditionalNeedKey,
    patch: Partial<HouseholdPlanDraft[ConditionalNeedKey]>,
  ) =>
    onPlanChange({
      ...plan,
      [key]: { ...plan[key], ...patch },
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
  const householdNeedRows = [
    {
      key: "supportNetwork",
      label: "Nearby support",
      applies: true,
      detail:
        "Friends, family, or trusted people who can help with daily life.",
    },
    {
      key: "childcare",
      label: "Workable childcare",
      applies: mode === "family",
      detail: "Care arrangements that need to keep working after the move.",
    },
    {
      key: "school",
      label: "Suitable school path",
      applies: mode === "family",
      detail: "School continuity or a new school path that has to be viable.",
    },
    {
      key: "requiredServices",
      label: "Required services",
      applies: true,
      detail: "Healthcare, therapy, specialist, or other recurring services.",
    },
    {
      key: "carFreeAccess",
      label: "Car-free routines",
      applies: true,
      detail: "Daily routines that need to work without reliable car access.",
    },
  ] as const satisfies readonly {
    key: ConditionalNeedKey;
    label: string;
    applies: boolean;
    detail: string;
  }[];

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

      <section
        aria-labelledby="household-essentials-heading"
        className="mt-7 border-y border-slate-300 py-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              User-supplied checks
            </p>
            <h2
              id="household-essentials-heading"
              className="mt-2 text-lg font-semibold text-slate-950"
            >
              Household essentials
            </h2>
          </div>
          <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600">
            Context and conditions
          </span>
        </div>
        <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
          {householdNeedRows
            .filter(({ applies }) => applies)
            .map(({ key, label, detail }) => {
              const need = plan[key];
              const fieldPrefix = `householdPlan.${key}`;
              return (
                <div key={key} className="py-5">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {label}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {detail}
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <YesNoQuestion
                        id={`${fieldPrefix}-needed`}
                        legend="Does this matter for this move?"
                        value={need.needed}
                        error={errors[`${fieldPrefix}.needed`]}
                        onChange={(value) =>
                          updateConditionalNeed(key, {
                            needed: value,
                            ...(value === "no"
                              ? {
                                  stopsMove: "",
                                  assessment: "unavailable",
                                }
                              : {}),
                          })
                        }
                      />
                      {need.needed === "yes" ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <YesNoQuestion
                            id={`${fieldPrefix}-stopsMove`}
                            legend="Can this stop the move?"
                            value={need.stopsMove}
                            error={errors[`${fieldPrefix}.stopsMove`]}
                            onChange={(value) =>
                              updateConditionalNeed(key, { stopsMove: value })
                            }
                          />
                          <SelectField
                            id={`${fieldPrefix}-assessment`}
                            label="Current read"
                            value={need.assessment}
                            options={assessmentOptions}
                            error={errors[`${fieldPrefix}.assessment`]}
                            onChange={(value) =>
                              updateConditionalNeed(key, {
                                assessment:
                                  value as HouseholdPlanDraft[typeof key]["assessment"],
                              })
                            }
                          />
                        </div>
                      ) : null}
                      {key === "childcare" && need.needed === "yes" ? (
                        <SelectField
                          id={`${fieldPrefix}-arrangement`}
                          label="Care arrangement"
                          value={plan.childcare.arrangement}
                          options={childcareArrangementOptions}
                          error={errors[`${fieldPrefix}.arrangement`]}
                          onChange={(value) =>
                            onPlanChange({
                              ...plan,
                              childcare: {
                                ...plan.childcare,
                                arrangement:
                                  value as HouseholdPlanDraft["childcare"]["arrangement"],
                              },
                            })
                          }
                        />
                      ) : null}
                      {key === "school" && need.needed === "yes" ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <SelectField
                            id={`${fieldPrefix}-gradeBand`}
                            label="Grade band"
                            value={plan.school.gradeBand}
                            options={gradeBandOptions}
                            error={errors[`${fieldPrefix}.gradeBand`]}
                            onChange={(value) =>
                              onPlanChange({
                                ...plan,
                                school: {
                                  ...plan.school,
                                  gradeBand:
                                    value as HouseholdPlanDraft["school"]["gradeBand"],
                                },
                              })
                            }
                          />
                          <SelectField
                            id={`${fieldPrefix}-preference`}
                            label="School preference"
                            value={plan.school.preference}
                            options={schoolPreferenceOptions}
                            error={errors[`${fieldPrefix}.preference`]}
                            onChange={(value) =>
                              onPlanChange({
                                ...plan,
                                school: {
                                  ...plan.school,
                                  preference:
                                    value as HouseholdPlanDraft["school"]["preference"],
                                },
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          These answers are user-supplied context. MoveWise does not yet use
          childcare prices, school ratings, provider availability, or
          neighborhood-level access data.
        </p>
      </section>
    </div>
  );
}
