import { LoaderCircle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import {
  createResearchWhatIfViewModel,
  createVerifiedWhatIfViewModel,
  type ResearchWhatIfValues,
} from "./model";

type WhatIfKey = keyof ResearchWhatIfValues;

type WhatIfPanelProps = {
  evaluation?: VerifiedResearchEvaluationResult;
};

export function WhatIfPanel({ evaluation }: WhatIfPanelProps) {
  const [values, setValues] = useState<ResearchWhatIfValues>(
    () =>
      (evaluation
        ? createVerifiedWhatIfViewModel(evaluation)
        : createResearchWhatIfViewModel()
      ).values,
  );
  const model = useMemo(
    () =>
      evaluation
        ? createVerifiedWhatIfViewModel(evaluation, values)
        : createResearchWhatIfViewModel(values),
    [evaluation, values],
  );
  const [inputValues, setInputValues] = useState<Record<WhatIfKey, string>>(
    () => ({
      takeHomeIncomeCents: String(values.takeHomeIncomeCents / 100),
      housingCostCents: String(values.housingCostCents / 100),
      recurringExpensesCents: String(values.recurringExpensesCents / 100),
      retainedPropertyNetCents: String(values.retainedPropertyNetCents / 100),
    }),
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (updateTimerRef.current !== null) {
        window.clearTimeout(updateTimerRef.current);
      }
    },
    [],
  );

  const update = (key: WhatIfKey, valueCents: number) => {
    setValues((current) => ({ ...current, [key]: valueCents }));
    setIsUpdating(true);
    if (updateTimerRef.current !== null) {
      window.clearTimeout(updateTimerRef.current);
    }
    updateTimerRef.current = window.setTimeout(() => {
      setIsUpdating(false);
      updateTimerRef.current = null;
    }, 280);
  };

  const updateInput = (key: WhatIfKey, value: string) => {
    setInputValues((current) => ({ ...current, [key]: value }));
    const normalized = value.trim().replace(/,/g, "");
    if (!/^-?\d+$/.test(normalized)) return;
    const dollars = Number(normalized);
    if (!Number.isSafeInteger(dollars) || Math.abs(dollars) > 100_000_000)
      return;
    if (key !== "retainedPropertyNetCents" && dollars < 0) return;
    update(key, dollars * 100);
  };

  const restoreInput = (key: WhatIfKey) => {
    setInputValues((current) => ({
      ...current,
      [key]: String(values[key] / 100),
    }));
  };

  const reset = () => {
    setValues(model.baselineValues);
    setInputValues({
      takeHomeIncomeCents: String(
        model.baselineValues.takeHomeIncomeCents / 100,
      ),
      housingCostCents: String(model.baselineValues.housingCostCents / 100),
      recurringExpensesCents: String(
        model.baselineValues.recurringExpensesCents / 100,
      ),
      retainedPropertyNetCents: String(
        model.baselineValues.retainedPropertyNetCents / 100,
      ),
    });
    setIsUpdating(false);
  };

  return (
    <section
      aria-labelledby="what-if-heading"
      className="border-t border-slate-300 py-12 sm:py-16"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Assumption sensitivity</p>
          <h2
            id="what-if-heading"
            className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950 sm:text-5xl"
          >
            See what changes the answer
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Change any destination estimate to test a real alternative. Every
            valid amount reruns the same decision engine immediately.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          Recalculates from the same inputs
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          {model.controls.length === 0 ? (
            <div className="border-y border-slate-200 py-5 text-sm leading-6 text-slate-600">
              All destination amounts were marked verified. Edit an assumption
              if you want to test a different estimate.
            </div>
          ) : null}
          {model.controls.map((control) => (
            <div
              key={control.id}
              className="border-b border-slate-200 pb-6 last:border-0"
            >
              <div className="flex items-start justify-between gap-4">
                <label
                  htmlFor={`what-if-${control.id}`}
                  className="text-sm font-semibold text-slate-900"
                >
                  {control.label}
                </label>
                <span className="text-xs text-slate-500">
                  Baseline {control.baseline}
                </span>
              </div>
              <div className="relative mt-3 max-w-xs">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500"
                >
                  $
                </span>
                <input
                  id={`what-if-${control.id}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={inputValues[control.id]}
                  aria-label={`${control.label} what-if amount`}
                  onChange={(event) =>
                    updateInput(control.id, event.currentTarget.value)
                  }
                  onBlur={() => restoreInput(control.id)}
                  className="control-input bg-white pl-7 tabular-nums"
                />
              </div>
            </div>
          ))}

          {model.thresholds.length > 0 ? (
            <div className="border-t border-slate-200 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Exact decision-changing thresholds
              </p>
              <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                {model.thresholds.map((threshold) => (
                  <li
                    key={threshold.id}
                    className="grid gap-1 py-3 text-xs leading-5 text-slate-600 sm:grid-cols-[1fr_auto] sm:gap-4"
                  >
                    <strong className="text-slate-950">
                      {threshold.label}
                    </strong>
                    <span className="sm:text-right">
                      {threshold.operator} {threshold.threshold}
                      <span className="ml-1 text-slate-500">
                        → {threshold.changesConditionTo}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div
          aria-live="polite"
          className="flex min-h-64 flex-col bg-slate-950 p-5 text-white sm:p-6"
        >
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-300">
            {isUpdating ? (
              <LoaderCircle
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isUpdating
              ? "Recalculating"
              : model.changed
                ? "Updated reading"
                : "Baseline reading"}
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            {model.result.condition.label}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {model.result.condition.summary}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-700 pt-5 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Monthly cushion</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {model.result.monthlyCushion}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Change from origin</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {model.result.cushionDelta} · {model.result.classification}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={!model.changed}
            onClick={reset}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset assumptions
          </button>
        </div>
      </div>
    </section>
  );
}
