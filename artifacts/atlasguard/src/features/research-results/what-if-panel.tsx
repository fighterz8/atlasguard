import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createResearchWhatIfViewModel,
  type ResearchWhatIfValues,
} from "./model";

type WhatIfKey = keyof ResearchWhatIfValues;

export function WhatIfPanel() {
  const [values, setValues] = useState<ResearchWhatIfValues>(
    () => createResearchWhatIfViewModel().values,
  );
  const model = useMemo(() => createResearchWhatIfViewModel(values), [values]);

  const update = (key: WhatIfKey, valueCents: number) => {
    setValues((current) => ({ ...current, [key]: valueCents }));
  };

  return (
    <section aria-labelledby="what-if-heading" className="panel lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Assumption sensitivity</p>
          <h2 id="what-if-heading" className="section-heading">
            See what changes the answer
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Adjust the three destination estimates inside their declared ranges.
            Every update reruns the same verified decision engine used by the
            baseline result.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          Deterministic—not a probability
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          {model.controls.map((control) => (
            <div key={control.id}>
              <div className="flex items-start justify-between gap-4">
                <label
                  htmlFor={`what-if-${control.id}`}
                  className="text-sm font-semibold text-slate-900"
                >
                  {control.label}
                </label>
                <output
                  htmlFor={`what-if-${control.id}`}
                  className="text-sm font-semibold tabular-nums text-slate-950"
                >
                  {control.value}
                </output>
              </div>
              <input
                id={`what-if-${control.id}`}
                type="range"
                min={control.minCents}
                max={control.maxCents}
                step={5_000}
                value={control.valueCents}
                aria-valuetext={control.value}
                onChange={(event) =>
                  update(control.id, Number(event.currentTarget.value))
                }
                className="mt-3 h-2 w-full cursor-pointer accent-teal-700"
              />
              <div className="mt-2 flex justify-between text-xs tabular-nums text-slate-500">
                <span>{control.min}</span>
                <span>{control.max}</span>
              </div>
            </div>
          ))}

          <div className="border-t border-slate-200 pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Exact decision-changing thresholds
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {model.thresholds.map((threshold) => (
                <li
                  key={threshold.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600"
                >
                  <strong className="block text-slate-950">
                    {threshold.label}
                  </strong>
                  {threshold.operator} {threshold.threshold}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          aria-live="polite"
          className="flex min-h-64 flex-col rounded-2xl bg-slate-950 p-5 text-white"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-300">
            {model.changed ? "Updated reading" : "Baseline reading"}
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
            onClick={() => setValues(model.baselineValues)}
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
