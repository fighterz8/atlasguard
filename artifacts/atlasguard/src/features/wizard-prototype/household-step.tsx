import { CircleHelp, Users } from "lucide-react";
import React from "react";
import type { MoveWiseHouseholdMode } from "@workspace/contracts";

import {
  getHouseholdConstraintDefinitions,
  type HouseholdConstraintImportance,
  type HouseholdConstraintKey,
  type HouseholdConstraintRelevance,
  type HouseholdConstraintStatus,
} from "./household-constraints";
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

function ChoiceQuestion<T extends string>({
  id,
  legend,
  value,
  options,
  error,
  columns = 2,
  onChange,
}: {
  id: string;
  legend: string;
  value: T | "";
  options: readonly { value: T; label: string }[];
  error?: string;
  columns?: 2 | 3;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset
      aria-invalid={error ? "true" : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="text-sm font-semibold text-slate-800">{legend}</legend>
      <div
        className={`mt-2 grid gap-2 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {options.map((option) => (
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
              className="h-4 w-4 shrink-0 accent-teal-700"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

const relevanceOptions = [
  { value: "yes", label: "Yes, it matters" },
  { value: "no", label: "No, not for this move" },
] as const;

const importanceOptions = [
  { value: "important", label: "Important" },
  { value: "blocker", label: "Could block the move" },
] as const;

const statusOptions = [
  { value: "works", label: "Works" },
  { value: "does_not_work", label: "Does not work" },
  { value: "not_checked", label: "Not checked" },
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

const statusLabel: Record<Exclude<HouseholdConstraintStatus, "">, string> = {
  works: "Works",
  does_not_work: "Does not work",
  not_checked: "Not checked",
};

export function HouseholdStep({
  mode,
  plan,
  errors,
  onPlanChange,
}: HouseholdStepProps) {
  const definitions = getHouseholdConstraintDefinitions(mode);
  const updateConstraint = (
    key: HouseholdConstraintKey,
    patch: Partial<HouseholdPlanDraft[HouseholdConstraintKey]>,
  ) =>
    onPlanChange({
      ...plan,
      [key]: { ...plan[key], ...patch },
    } as HouseholdPlanDraft);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 5 of 6</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Household constraints
          </h1>
        </div>
        <Users aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        For each need, record whether it matters, how important it is, and what
        you know today. A relevant need stays open until its status is clear.
      </p>

      <section aria-labelledby="household-board-heading" className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Your status board
            </p>
            <h2
              id="household-board-heading"
              className="mt-2 text-lg font-semibold text-slate-950"
            >
              Needs that must work
            </h2>
          </div>
          <p className="text-xs font-medium text-slate-500">
            You entered · Affects readiness
          </p>
        </div>

        <div className="divide-y divide-slate-200 border-b border-slate-200">
          {definitions
            .filter(({ applies }) => applies)
            .map(({ key, label, detail }) => {
              const constraint = plan[key];
              const fieldPrefix = `householdPlan.${key}`;
              return (
                <article key={key} className="py-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <h3 className="text-base font-semibold text-slate-950">
                        {label}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {detail}
                      </p>
                    </div>
                    {constraint.relevance === "yes" &&
                    constraint.status !== "" ? (
                      <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
                        {statusLabel[constraint.status]}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-5">
                    <ChoiceQuestion<Exclude<HouseholdConstraintRelevance, "">>
                      id={`${fieldPrefix}-relevance`}
                      legend="1. Does it matter?"
                      value={constraint.relevance}
                      options={relevanceOptions}
                      error={errors[`${fieldPrefix}.relevance`]}
                      onChange={(value) =>
                        updateConstraint(key, {
                          relevance: value,
                          ...(value === "no"
                            ? { importance: "", status: "" }
                            : {}),
                        })
                      }
                    />
                    {constraint.relevance === "yes" ? (
                      <>
                        <ChoiceQuestion<
                          Exclude<HouseholdConstraintImportance, "">
                        >
                          id={`${fieldPrefix}-importance`}
                          legend="2. How important is it?"
                          value={constraint.importance}
                          options={importanceOptions}
                          error={errors[`${fieldPrefix}.importance`]}
                          onChange={(importance) =>
                            updateConstraint(key, { importance })
                          }
                        />
                        <ChoiceQuestion<Exclude<HouseholdConstraintStatus, "">>
                          id={`${fieldPrefix}-status`}
                          legend="3. What is its status?"
                          value={constraint.status}
                          options={statusOptions}
                          columns={3}
                          error={errors[`${fieldPrefix}.status`]}
                          onChange={(status) =>
                            updateConstraint(key, { status })
                          }
                        />
                      </>
                    ) : null}

                    {key === "childcare" && constraint.relevance === "yes" ? (
                      <SelectField
                        id={`${fieldPrefix}-arrangement`}
                        label="Care arrangement (optional)"
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
                    {key === "school" && constraint.relevance === "yes" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField
                          id={`${fieldPrefix}-gradeBand`}
                          label="Grade band (optional)"
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
                          label="School preference (optional)"
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
                </article>
              );
            })}
        </div>
      </section>

      {definitions.some(({ applies }) => !applies) ? (
        <section
          aria-labelledby="not-applicable-heading"
          className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex items-start gap-3">
            <CircleHelp
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
            />
            <div>
              <h2
                id="not-applicable-heading"
                className="text-sm font-semibold text-slate-900"
              >
                Not applicable to this move
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {definitions
                  .filter(({ applies }) => !applies)
                  .map(({ key, label, notApplicableReason }) => (
                    <li key={key}>
                      <span className="font-medium text-slate-700">
                        {label}:
                      </span>{" "}
                      {notApplicableReason}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-slate-500">
        MoveWise uses these answers as household constraints. Childcare prices,
        school ratings, provider availability, and neighborhood-level access
        still require household-specific checks.
      </p>
    </div>
  );
}
