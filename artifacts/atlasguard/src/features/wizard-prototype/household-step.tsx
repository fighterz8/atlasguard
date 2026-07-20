import { Home, Users } from "lucide-react";
import React from "react";
import {
  MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE,
  type MoveWiseHouseholdFactorId,
  type MoveWiseHouseholdMode,
} from "@workspace/contracts";

import { StatusBadge } from "../ux-system/status-badge";

import {
  householdFactorLabels,
  type HouseholdImpact,
  type HouseholdRole,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

type HouseholdStepProps = {
  mode: MoveWiseHouseholdMode | "";
  factors: WizardPrototypeDraft["householdFactors"];
  errors: WizardErrors;
  onRoleChange: (
    factorId: MoveWiseHouseholdFactorId,
    value: HouseholdRole,
  ) => void;
  onImpactChange: (
    factorId: MoveWiseHouseholdFactorId,
    value: HouseholdImpact,
  ) => void;
};

const factorDescriptions: Record<MoveWiseHouseholdFactorId, string> = {
  space_fit:
    "Your assessment of whether the home fits—not a citywide space grade.",
  support_network: "Your personal access to people you rely on.",
  childcare_continuity:
    "Whether needed childcare arrangements can continue. Childcare cost belongs in your monthly expenses.",
  school_continuity:
    "A path you have personally confirmed—not a school-quality rating.",
  required_services_continuity:
    "Continuity for healthcare, therapy, or other services your household requires.",
  car_free_access:
    "Whether your real routines can work without a car—not generic city walkability.",
};

const roleOptions: ReadonlyArray<{ value: HouseholdRole; label: string }> = [
  { value: "important", label: "Important, but not a deal-breaker" },
  {
    value: "essential_met",
    label: "Essential — the destination meets this need",
  },
  {
    value: "essential_unconfirmed",
    label: "Essential — I haven’t confirmed it yet",
  },
  {
    value: "essential_unmet",
    label: "Essential — the destination does not meet it",
  },
  { value: "not_applicable", label: "Not part of my decision" },
];

const impactOptions: ReadonlyArray<{ value: HouseholdImpact; label: string }> =
  [
    { value: "strong_negative", label: "Much harder" },
    { value: "negative", label: "Somewhat harder" },
    { value: "neutral", label: "About the same" },
    { value: "positive", label: "Somewhat better" },
    { value: "strong_positive", label: "Much better" },
    { value: "unavailable", label: "I’m not sure yet" },
  ];

export function HouseholdStep({
  mode,
  factors,
  errors,
  onRoleChange,
  onImpactChange,
}: HouseholdStepProps) {
  const factorIds = mode ? MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE[mode] : [];

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
            What needs to work for your household?
          </h1>
        </div>
        <Users aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Mark what matters, what is essential, and what you have not confirmed.
        These are your assessments, so Results will keep them separate from
        researched city evidence.
      </p>

      <div className="mt-7 space-y-4">
        {factorIds.map((factorId) => {
          const answer = factors[factorId];
          const roleId = `household-${factorId}-role`;
          const impactId = `household-${factorId}-impact`;
          const roleError = errors[`household.${factorId}.role`];
          const impactError = errors[`household.${factorId}.impact`];

          return (
            <section
              key={factorId}
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                  <Home aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-950">
                    {householdFactorLabels[factorId]}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {factorDescriptions[factorId]}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label
                    htmlFor={roleId}
                    className="text-sm font-semibold text-slate-800"
                  >
                    What role does this play in your decision?
                  </label>
                  <select
                    id={roleId}
                    value={answer.role}
                    aria-invalid={roleError ? "true" : undefined}
                    aria-describedby={roleError ? `${roleId}-error` : undefined}
                    onChange={(event) =>
                      onRoleChange(
                        factorId,
                        event.currentTarget.value as HouseholdRole,
                      )
                    }
                    className="control-input mt-2"
                  >
                    <option value="">Choose a role</option>
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {roleError ? (
                    <p
                      id={`${roleId}-error`}
                      role="alert"
                      className="mt-2 text-sm font-medium text-risk"
                    >
                      {roleError}
                    </p>
                  ) : null}
                </div>

                {answer.role && answer.role !== "not_applicable" ? (
                  <div>
                    <label
                      htmlFor={impactId}
                      className="text-sm font-semibold text-slate-800"
                    >
                      After the move, how would this compare with your situation
                      now?
                    </label>
                    <select
                      id={impactId}
                      value={answer.impact}
                      aria-invalid={impactError ? "true" : undefined}
                      aria-describedby={
                        impactError ? `${impactId}-error` : undefined
                      }
                      onChange={(event) =>
                        onImpactChange(
                          factorId,
                          event.currentTarget.value as HouseholdImpact,
                        )
                      }
                      className="control-input mt-2"
                    >
                      <option value="">Choose the expected change</option>
                      {impactOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {impactError ? (
                      <p
                        id={`${impactId}-error`}
                        role="alert"
                        className="mt-2 text-sm font-medium text-risk"
                      >
                        {impactError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-end">
                    <StatusBadge tone="unavailable">
                      {answer.role === "not_applicable"
                        ? "Excluded by you"
                        : "Choose a role first"}
                    </StatusBadge>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
