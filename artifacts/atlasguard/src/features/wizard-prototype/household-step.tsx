import { Baby, Home, School, Users } from "lucide-react";
import React from "react";
import type { MoveWiseHouseholdMode } from "@workspace/contracts";

import type { HouseholdPlanDraft, WizardErrors } from "./model";

type HouseholdStepProps = {
  mode: MoveWiseHouseholdMode | "";
  plan: HouseholdPlanDraft;
  errors: WizardErrors;
  onPlanChange: (plan: HouseholdPlanDraft) => void;
};

type SelectOption = { value: string; label: string };

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
  { value: "rent", label: "Rent" },
  { value: "buy", label: "Buy" },
  { value: "either", label: "Open to either" },
] as const;
const housingTypeOptions = [
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

export function HouseholdStep({
  mode,
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

  const updateNeed = (
    key: "supportNetwork" | "requiredServices" | "carFreeAccess",
    field: "needed" | "stopsMove",
    value: "yes" | "no",
  ) =>
    onPlanChange({
      ...plan,
      [key]: {
        ...plan[key],
        [field]: value,
        ...(field === "needed" && value === "no" ? { stopsMove: "" } : {}),
      },
    });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 4 of 4</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Your household plan
          </h1>
        </div>
        <Users aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Describe what the move needs to support. MoveWise will research the
        destination; you do not need to predict whether it is better or worse.
      </p>

      <div className="mt-7 space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
              <Home aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-950">
                What kind of home needs to work?
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                We will use this plan to find relevant housing evidence. Area
                median rent is context—not a quote for this home.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SelectField
              id="householdPlan-housing-tenure"
              label="Rent or buy"
              value={plan.housing.tenure}
              options={tenureOptions}
              error={errors["householdPlan.housing.tenure"]}
              onChange={(value) => updateHousing("tenure", value)}
            />
            <SelectField
              id="householdPlan-housing-type"
              label="Home type"
              value={plan.housing.type}
              options={housingTypeOptions}
              error={errors["householdPlan.housing.type"]}
              onChange={(value) => updateHousing("type", value)}
            />
            <SelectField
              id="householdPlan-housing-bedrooms"
              label="Minimum bedrooms"
              value={plan.housing.bedrooms}
              options={bedroomOptions}
              error={errors["householdPlan.housing.bedrooms"]}
              onChange={(value) => updateHousing("bedrooms", value)}
            />
            <SelectField
              id="householdPlan-housing-bathrooms"
              label="Minimum bathrooms"
              value={plan.housing.bathrooms}
              options={bathroomOptions}
              error={errors["householdPlan.housing.bathrooms"]}
              onChange={(value) => updateHousing("bathrooms", value)}
            />
            <div>
              <label
                htmlFor="householdPlan-housing-maxMonthlyCost"
                className="text-sm font-semibold text-slate-800"
              >
                Maximum monthly housing cost
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
              legend="Would missing this housing plan stop the move?"
              value={plan.housing.stopsMove}
              error={errors["householdPlan.housing.stopsMove"]}
              onChange={(value) => updateHousing("stopsMove", value)}
            />
          </div>
        </section>

        {mode === "family" ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Baby
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 text-teal-700"
                />
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Childcare plan
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Childcare cost belongs in your monthly expenses. This asks
                    only what arrangement must be workable.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <YesNoQuestion
                  id="householdPlan-childcare-needed"
                  legend="Will your household need childcare after the move?"
                  value={plan.childcare.needed}
                  error={errors["householdPlan.childcare.needed"]}
                  onChange={(value) =>
                    onPlanChange({
                      ...plan,
                      childcare: {
                        ...plan.childcare,
                        needed: value,
                        ...(value === "no"
                          ? { arrangement: "" as const, stopsMove: "" as const }
                          : {}),
                      },
                    })
                  }
                />
                {plan.childcare.needed === "yes" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      id="householdPlan-childcare-arrangement"
                      label="What childcare arrangement do you need?"
                      value={plan.childcare.arrangement}
                      options={[
                        { value: "center", label: "Childcare center" },
                        { value: "home_based", label: "Home-based provider" },
                        {
                          value: "in_home_caregiver",
                          label: "In-home caregiver",
                        },
                        {
                          value: "family_or_friend",
                          label: "Family or friend care",
                        },
                        {
                          value: "before_after_school",
                          label: "Before- or after-school care",
                        },
                        {
                          value: "flexible",
                          label: "Flexible or open to options",
                        },
                      ]}
                      error={errors["householdPlan.childcare.arrangement"]}
                      onChange={(value) =>
                        onPlanChange({
                          ...plan,
                          childcare: { ...plan.childcare, arrangement: value },
                        } as HouseholdPlanDraft)
                      }
                    />
                    <YesNoQuestion
                      id="householdPlan-childcare-stopsMove"
                      legend="Would no workable childcare stop the move?"
                      value={plan.childcare.stopsMove}
                      error={errors["householdPlan.childcare.stopsMove"]}
                      onChange={(value) =>
                        onPlanChange({
                          ...plan,
                          childcare: { ...plan.childcare, stopsMove: value },
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <School
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 text-teal-700"
                />
                <div>
                  <h2 className="font-semibold text-slate-950">School plan</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    This does not rate schools or predict placement. It records
                    the path MoveWise should help you verify.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <YesNoQuestion
                  id="householdPlan-school-needed"
                  legend="Does your household need a school path after the move?"
                  value={plan.school.needed}
                  error={errors["householdPlan.school.needed"]}
                  onChange={(value) =>
                    onPlanChange({
                      ...plan,
                      school: {
                        ...plan.school,
                        needed: value,
                        ...(value === "no"
                          ? {
                              gradeBand: "" as const,
                              preference: "" as const,
                              requirements: "",
                              stopsMove: "" as const,
                            }
                          : {}),
                      },
                    })
                  }
                />
                {plan.school.needed === "yes" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      id="householdPlan-school-gradeBand"
                      label="Which grade band should we plan for?"
                      value={plan.school.gradeBand}
                      options={[
                        { value: "preschool", label: "Preschool" },
                        { value: "elementary", label: "Elementary" },
                        { value: "middle", label: "Middle school" },
                        { value: "high", label: "High school" },
                        { value: "multiple", label: "Multiple grade bands" },
                      ]}
                      error={errors["householdPlan.school.gradeBand"]}
                      onChange={(value) =>
                        onPlanChange({
                          ...plan,
                          school: { ...plan.school, gradeBand: value },
                        } as HouseholdPlanDraft)
                      }
                    />
                    <SelectField
                      id="householdPlan-school-preference"
                      label="What school path are you open to?"
                      value={plan.school.preference}
                      options={[
                        { value: "public", label: "Public" },
                        { value: "private", label: "Private" },
                        { value: "either", label: "Open to either" },
                      ]}
                      error={errors["householdPlan.school.preference"]}
                      onChange={(value) =>
                        onPlanChange({
                          ...plan,
                          school: { ...plan.school, preference: value },
                        } as HouseholdPlanDraft)
                      }
                    />
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="householdPlan-school-requirements"
                        className="text-sm font-semibold text-slate-800"
                      >
                        What must a workable school path support?
                      </label>
                      <textarea
                        id="householdPlan-school-requirements"
                        value={plan.school.requirements}
                        maxLength={500}
                        rows={3}
                        placeholder="Optional: program, services, schedule, or other requirement"
                        onChange={(event) =>
                          onPlanChange({
                            ...plan,
                            school: {
                              ...plan.school,
                              requirements: event.currentTarget.value,
                            },
                          })
                        }
                        className="control-input mt-2 resize-y"
                      />
                    </div>
                    <YesNoQuestion
                      id="householdPlan-school-stopsMove"
                      legend="Would no suitable school path stop the move?"
                      value={plan.school.stopsMove}
                      error={errors["householdPlan.school.stopsMove"]}
                      onChange={(value) =>
                        onPlanChange({
                          ...plan,
                          school: { ...plan.school, stopsMove: value },
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-slate-950">
            Other needs to verify
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Include only needs that actually apply. MoveWise will keep unknowns
            visible instead of treating them as favorable.
          </p>
          <div className="mt-5 space-y-6">
            {(
              [
                [
                  "supportNetwork",
                  "Nearby support",
                  "Do you need to be near people you rely on?",
                ],
                [
                  "requiredServices",
                  "Required services",
                  "Do healthcare, therapy, disability, or other services need to continue?",
                ],
                [
                  "carFreeAccess",
                  "Car-free routines",
                  "Do essential routines need to work without driving?",
                ],
              ] as const
            ).map(([key, label, question]) => (
              <div
                key={key}
                className="grid gap-4 border-t border-slate-100 pt-5 first:border-0 first:pt-0 sm:grid-cols-2"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    {label}
                  </h3>
                  <YesNoQuestion
                    id={`householdPlan-${key}-needed`}
                    legend={question}
                    value={plan[key].needed}
                    error={errors[`householdPlan.${key}.needed`]}
                    onChange={(value) => updateNeed(key, "needed", value)}
                  />
                </div>
                {plan[key].needed === "yes" ? (
                  <YesNoQuestion
                    id={`householdPlan-${key}-stopsMove`}
                    legend={`Would missing ${label.toLowerCase()} stop the move?`}
                    value={plan[key].stopsMove}
                    error={errors[`householdPlan.${key}.stopsMove`]}
                    onChange={(value) => updateNeed(key, "stopsMove", value)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
