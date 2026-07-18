import { Landmark } from "lucide-react";

import { StatusBadge } from "../ux-system/status-badge";

import type {
  AssumptionBasis,
  WizardErrors,
  WizardPrototypeDraft,
} from "./model";

type FinanceKey = keyof WizardPrototypeDraft["finances"];
type ValueKey =
  | "currentTakeHome"
  | "targetTakeHome"
  | "currentHousing"
  | "targetHousing"
  | "currentExpenses"
  | "targetExpenses";
type BasisKey =
  | "targetTakeHomeBasis"
  | "targetHousingBasis"
  | "targetExpensesBasis";

type MoneyStepProps = {
  finances: WizardPrototypeDraft["finances"];
  errors: WizardErrors;
  onValueChange: (key: ValueKey, value: string) => void;
  onBasisChange: (key: BasisKey, value: AssumptionBasis) => void;
};

type MoneyFieldProps = {
  id: ValueKey;
  label: string;
  description: string;
  value: string;
  error?: string;
  basis: AssumptionBasis | "confirmed";
  basisKey?: BasisKey;
  onValueChange: (value: string) => void;
  onBasisChange?: (key: BasisKey, value: AssumptionBasis) => void;
};

function MoneyField({
  id,
  label,
  description,
  value,
  error,
  basis,
  basisKey,
  onValueChange,
  onBasisChange,
}: MoneyFieldProps) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-950">
          {label}
        </label>
        {basisKey && onBasisChange ? (
          <select
            value={basis}
            aria-label={`${label} assumption status`}
            onChange={(event) =>
              onBasisChange(
                basisKey,
                event.currentTarget.value as AssumptionBasis,
              )
            }
            className="min-h-11 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus-visible:border-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/20"
          >
            <option value="user_estimate">User estimate</option>
            <option value="confirmed">Confirmed</option>
          </select>
        ) : (
          <StatusBadge tone="confirmed">Confirmed</StatusBadge>
        )}
      </div>
      <p id={descriptionId} className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
      <div className="relative mt-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500"
        >
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          className="control-input pl-7 tabular-nums"
          placeholder="0"
        />
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm font-medium text-risk"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

const fieldPairs = [
  {
    current: {
      id: "currentTakeHome" as const,
      label: "Current take-home income",
      description: "Monthly spendable income after withholding.",
    },
    target: {
      id: "targetTakeHome" as const,
      basisKey: "targetTakeHomeBasis" as const,
      label: "Target take-home income",
      description: "Use a real offer or a clearly labeled estimate.",
    },
  },
  {
    current: {
      id: "currentHousing" as const,
      label: "Current housing cost",
      description: "Monthly rent or mortgage and required housing costs.",
    },
    target: {
      id: "targetHousing" as const,
      basisKey: "targetHousingBasis" as const,
      label: "Expected target housing",
      description: "Your expected cost—not the regional median.",
    },
  },
  {
    current: {
      id: "currentExpenses" as const,
      label: "Current recurring expenses",
      description: "Monthly recurring costs excluding housing.",
    },
    target: {
      id: "targetExpenses" as const,
      basisKey: "targetExpensesBasis" as const,
      label: "Expected target expenses",
      description: "Your estimated recurring costs excluding housing.",
    },
  },
] as const;

export function MoneyStep({
  finances,
  errors,
  onValueChange,
  onBasisChange,
}: MoneyStepProps) {
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
            Build the two monthly pictures
          </h1>
        </div>
        <Landmark aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Enter household amounts in whole dollars. MoveWise keeps your confirmed
        values separate from estimates so uncertainty stays visible.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="current-finances-heading">
          <div className="border-b border-slate-200 pb-3">
            <p
              id="current-finances-heading"
              className="font-semibold text-slate-950"
            >
              Current monthly picture
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Your baseline before the move.
            </p>
          </div>
          <div className="mt-5 space-y-6">
            {fieldPairs.map(({ current }) => (
              <MoneyField
                key={current.id}
                {...current}
                value={finances[current.id]}
                basis="confirmed"
                error={errors[`finances.${current.id}`]}
                onValueChange={(value) => onValueChange(current.id, value)}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="target-finances-heading">
          <div className="border-b border-slate-200 pb-3">
            <p
              id="target-finances-heading"
              className="font-semibold text-slate-950"
            >
              Destination monthly picture
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Every value must say whether it is confirmed or estimated.
            </p>
          </div>
          <div className="mt-5 space-y-6">
            {fieldPairs.map(({ target }) => (
              <MoneyField
                key={target.id}
                {...target}
                value={finances[target.id]}
                basis={finances[target.basisKey]}
                error={errors[`finances.${target.id}`]}
                onValueChange={(value) => onValueChange(target.id, value)}
                onBasisChange={onBasisChange}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-xl border border-estimate/25 bg-estimate-surface p-4 text-sm leading-6 text-estimate">
        <strong>Future import boundary:</strong> a reviewed PocketPulse summary
        could prefill these aggregates later. It would remain labeled as an
        estimate until you confirm it here; raw transactions would not be
        transferred by default.
      </div>
    </div>
  );
}

export type { BasisKey, FinanceKey, ValueKey };
