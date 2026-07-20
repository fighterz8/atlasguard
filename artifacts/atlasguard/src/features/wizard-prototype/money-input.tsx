import { StatusBadge } from "../ux-system/status-badge";

import type { BasisKey, ValueKey } from "./money-control-types";
import type { AssumptionBasis } from "./model";

type MoneyInputProps = {
  id: ValueKey;
  label: string;
  accessibleLabel?: string;
  description: string;
  value: string;
  error?: string;
  basis: AssumptionBasis | "confirmed";
  basisKey?: BasisKey;
  sourceLabel?:
    | "MoveWise public-data estimate"
    | "MoveWise starting assumption"
    | "You told us";
  onReset?: () => void;
  onValueChange: (value: string) => void;
  onBasisChange?: (key: BasisKey, value: AssumptionBasis) => void;
};

export function MoneyInput({
  id,
  label,
  accessibleLabel,
  description,
  value,
  error,
  basis,
  basisKey,
  sourceLabel,
  onReset,
  onValueChange,
  onBasisChange,
}: MoneyInputProps) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-950">
          {label}
        </label>
        {basisKey && onBasisChange ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {sourceLabel ? (
              <StatusBadge tone={onReset ? "neutral" : "benchmark"}>
                {sourceLabel}
              </StatusBadge>
            ) : null}
            <select
              value={basis}
              aria-label={`${accessibleLabel ?? label} assumption status`}
              onChange={(event) =>
                onBasisChange(
                  basisKey,
                  event.currentTarget.value as AssumptionBasis,
                )
              }
              className="min-h-11 max-w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus-visible:border-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/20"
            >
              <option value="user_estimate">Estimate</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
        ) : (
          <StatusBadge tone="confirmed">Current</StatusBadge>
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
          aria-label={accessibleLabel}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          className="control-input pl-7 text-sm tabular-nums sm:text-base"
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
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 min-h-11 text-xs font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:text-teal-950"
        >
          Reset to MoveWise starting assumption
        </button>
      ) : null}
    </div>
  );
}
