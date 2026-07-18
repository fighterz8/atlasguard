import { Route } from "lucide-react";

import { StatusBadge } from "../ux-system/status-badge";
import { cn } from "../../lib/utils";

import type { PriorityImportance } from "./model";

type PrioritiesStepProps = {
  value: PriorityImportance;
  onChange: (value: PriorityImportance) => void;
};

const options = [
  {
    value: "must_have" as const,
    label: "Must-have",
    description: "A material loss here could block the move.",
  },
  {
    value: "important" as const,
    label: "Important",
    description: "This should meaningfully influence the tradeoff.",
  },
  {
    value: "nice_to_have" as const,
    label: "Nice-to-have",
    description: "Useful context, but not a deciding factor.",
  },
  {
    value: "does_not_matter" as const,
    label: "Does not matter",
    description: "Exclude this priority from the decision.",
  },
];

export function PrioritiesStep({ value, onChange }: PrioritiesStepProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 3 of 4</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            What matters in this decision?
          </h1>
        </div>
        <Route aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        MoveWise asks only about priorities backed by approved evidence. It will
        not infer preferences or fabricate a broad lifestyle score.
      </p>

      <fieldset className="mt-8">
        <legend className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-950">
          Typical one-way commute
          <StatusBadge tone="benchmark">Evidence available</StatusBadge>
        </legend>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          How much should the typical commute comparison affect this move?
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex min-h-24 cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-colors",
                value === option.value
                  ? "border-teal-700 bg-teal-50 shadow-sm"
                  : "border-slate-200 hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name="commute-importance"
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-950">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 rounded-xl border border-unavailable/20 bg-unavailable-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="unavailable">Not collected yet</StatusBadge>
          <strong className="text-sm text-slate-800">
            Climate, safety, schools, amenities, and taxes
          </strong>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          These dimensions stay out of the flow until their datasets,
          transformations, geography rules, and limitations are approved.
        </p>
      </div>
    </div>
  );
}
