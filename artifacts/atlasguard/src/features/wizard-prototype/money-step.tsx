import { Copy, Home, Landmark } from "lucide-react";

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
  | "targetExpenses"
  | "retainedPropertyNet";
type BasisKey =
  | "targetTakeHomeBasis"
  | "targetHousingBasis"
  | "targetExpensesBasis"
  | "retainedPropertyNetBasis";

type MoneyStepProps = {
  finances: WizardPrototypeDraft["finances"];
  errors: WizardErrors;
  onValueChange: (key: ValueKey, value: string) => void;
  onBasisChange: (key: BasisKey, value: AssumptionBasis) => void;
  onCopyCurrent: () => void;
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
            <option value="user_estimate">Estimate</option>
            <option value="confirmed">Confirmed amount</option>
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
  onCopyCurrent,
}: MoneyStepProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 2 of 3</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Compare your monthly picture
          </h1>
        </div>
        <Landmark aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Six whole-dollar amounts are enough for the first result. Start with
        your current numbers, then change only what you expect to be different.
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
              Estimates are fine. Mark an amount confirmed only when you know
              it.
            </p>
          </div>
          <button
            type="button"
            onClick={onCopyCurrent}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition-colors hover:border-teal-400 hover:bg-teal-100"
          >
            <Copy aria-hidden="true" className="h-4 w-4" />
            Start with my current numbers
          </button>
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
            <details className="rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 marker:hidden">
                <Home aria-hidden="true" className="h-4 w-4 text-slate-500" />
                Keeping a property after the move?
              </summary>
              <div className="border-t border-slate-200 bg-white p-4">
                <MoneyField
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
        </section>
      </div>
    </div>
  );
}

export type { BasisKey, FinanceKey, ValueKey };
