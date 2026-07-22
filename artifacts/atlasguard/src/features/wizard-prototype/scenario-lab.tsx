import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import React, { useMemo, useState } from "react";

import { DestructiveActionDialog } from "../../components/destructive-action-dialog";

import type { WizardPrototypeDraft } from "./model";
import {
  createInitialScenarioLabDraft,
  createScenarioLabModel,
  type ScenarioLabValues,
} from "./scenario-lab-model";

type ScenarioLabKey = keyof ScenarioLabValues;

type ScenarioLabProps = {
  baselineDraft: WizardPrototypeDraft;
  onMakeActive: (draft: WizardPrototypeDraft, name: string) => void;
};

const inputStrings = (values: ScenarioLabValues) => ({
  takeHomeIncomeCents: String(values.takeHomeIncomeCents / 100),
  housingCostCents: String(values.housingCostCents / 100),
  recurringExpensesCents: String(values.recurringExpensesCents / 100),
  retainedPropertyNetCents: String(values.retainedPropertyNetCents / 100),
});

const SnapshotCard = ({
  eyebrow,
  snapshot,
  emphasized = false,
}: {
  eyebrow: string;
  snapshot: {
    name: string;
    outlook: string;
    readiness: string;
    evidenceConfidence: string;
    monthlyCushion: string;
  };
  emphasized?: boolean;
}) => (
  <article
    className={
      emphasized
        ? "border border-teal-700 bg-teal-950 p-5 text-white"
        : "border border-slate-300 bg-white p-5 text-slate-950"
    }
  >
    <p
      className={`text-xs font-bold uppercase tracking-[0.14em] ${emphasized ? "text-teal-200" : "text-slate-500"}`}
    >
      {eyebrow}
    </p>
    <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em]">
      {snapshot.name}
    </h3>
    <dl
      className={`mt-5 divide-y ${emphasized ? "divide-teal-800" : "divide-slate-200"}`}
    >
      {[
        ["Outlook", snapshot.outlook],
        ["Readiness", snapshot.readiness],
        ["Evidence", snapshot.evidenceConfidence],
        ["Monthly cushion", snapshot.monthlyCushion],
      ].map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 text-sm"
        >
          <dt className={emphasized ? "text-teal-100" : "text-slate-500"}>
            {label}
          </dt>
          <dd className="text-right font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  </article>
);

export function ScenarioLab({ baselineDraft, onMakeActive }: ScenarioLabProps) {
  const initialization = useMemo(
    () => createInitialScenarioLabDraft(baselineDraft),
    [baselineDraft],
  );
  const initialDraft = initialization.success
    ? initialization.draft
    : {
        name: "",
        values: {
          takeHomeIncomeCents: 0,
          housingCostCents: 0,
          recurringExpensesCents: 0,
          retainedPropertyNetCents: 0,
        },
      };
  const [name, setName] = useState(initialDraft.name);
  const [values, setValues] = useState<ScenarioLabValues>(initialDraft.values);
  const [inputs, setInputs] = useState<Record<ScenarioLabKey, string>>(
    inputStrings(initialDraft.values),
  );
  const [inputErrors, setInputErrors] = useState<
    Partial<Record<ScenarioLabKey, string>>
  >({});
  const comparison = useMemo(
    () => createScenarioLabModel(baselineDraft, { name, values }),
    [baselineDraft, name, values],
  );

  if (!initialization.success || !comparison.success) {
    return (
      <section aria-labelledby="scenario-lab-heading" className="py-10">
        <h2 id="scenario-lab-heading" className="text-xl font-semibold">
          Scenario lab is unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          MoveWise could not reproduce the active brief safely, so no scenario
          values were applied.
        </p>
      </section>
    );
  }

  const { model } = comparison;

  const updateInput = (key: ScenarioLabKey, raw: string) => {
    setInputs((current) => ({ ...current, [key]: raw }));
    const normalized = raw.trim().replace(/,/g, "");
    const validInteger = /^-?\d+$/.test(normalized);
    const dollars = validInteger ? Number(normalized) : Number.NaN;
    const valid =
      validInteger &&
      Number.isSafeInteger(dollars) &&
      Math.abs(dollars) <= 100_000_000 &&
      (key === "retainedPropertyNetCents" || dollars >= 0);
    if (!valid) {
      setInputErrors((current) => ({
        ...current,
        [key]:
          key === "retainedPropertyNetCents"
            ? "Enter a whole-dollar amount."
            : "Enter a non-negative whole-dollar amount.",
      }));
      return;
    }
    setInputErrors((current) => ({ ...current, [key]: undefined }));
    setValues((current) => ({ ...current, [key]: dollars * 100 }));
  };

  const restoreInput = (key: ScenarioLabKey) => {
    if (!inputErrors[key]) return;
    setInputs((current) => ({
      ...current,
      [key]: String(values[key] / 100),
    }));
    setInputErrors((current) => ({ ...current, [key]: undefined }));
  };

  const reset = () => {
    setName("");
    setValues(initialDraft.values);
    setInputs(inputStrings(initialDraft.values));
    setInputErrors({});
  };

  return (
    <section aria-labelledby="scenario-lab-heading" className="py-10 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Scenario lab</p>
          <h2
            id="scenario-lab-heading"
            className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950 sm:text-5xl"
          >
            Test a real alternative
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Name an alternative and change only the assumptions that differ.
            Your current brief stays untouched until you confirm Make active.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          Same decision engine
        </p>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
        <div>
          <label
            htmlFor="scenario-name"
            className="text-sm font-semibold text-slate-950"
          >
            Scenario name
          </label>
          <input
            id="scenario-name"
            type="text"
            autoComplete="off"
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Example: Lower-rent option"
            className="control-input mt-2 bg-white"
          />
          {model.changed && model.nameError ? (
            <p className="mt-2 text-xs font-semibold text-risk" role="alert">
              {model.nameError}
            </p>
          ) : null}

          <div className="mt-7 space-y-6">
            {model.controls.length === 0 ? (
              <p className="border-y border-slate-200 py-5 text-sm leading-6 text-slate-600">
                Every destination amount is verified. Edit the active Budget to
                create a different financial alternative.
              </p>
            ) : null}
            {model.controls.map((control) => {
              const errorId = `scenario-${control.id}-error`;
              return (
                <div
                  key={control.id}
                  className="border-b border-slate-200 pb-6 last:border-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <label
                      htmlFor={`scenario-${control.id}`}
                      className="text-sm font-semibold text-slate-900"
                    >
                      {control.label}
                    </label>
                    <span className="text-xs text-slate-500">
                      Current brief {control.baseline}
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
                      id={`scenario-${control.id}`}
                      type="text"
                      inputMode={
                        control.id === "retainedPropertyNetCents"
                          ? "text"
                          : "numeric"
                      }
                      autoComplete="off"
                      value={inputs[control.id]}
                      aria-invalid={Boolean(inputErrors[control.id])}
                      aria-describedby={
                        inputErrors[control.id] ? errorId : undefined
                      }
                      onChange={(event) =>
                        updateInput(control.id, event.currentTarget.value)
                      }
                      onBlur={() => restoreInput(control.id)}
                      className="control-input bg-white pl-7 tabular-nums"
                    />
                  </div>
                  {inputErrors[control.id] ? (
                    <p
                      id={errorId}
                      className="mt-2 text-xs font-semibold text-risk"
                    >
                      {inputErrors[control.id]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div aria-live="polite" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <SnapshotCard eyebrow="Baseline" snapshot={model.baseline} />
            <SnapshotCard
              eyebrow={model.changed ? "Alternative" : "No changes yet"}
              snapshot={model.scenario}
              emphasized
            />
          </div>

          <div className="border border-slate-300 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-950">
              What changed
            </h3>
            {model.deltas.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Change an amount to create an explicit alternative.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200">
                {model.deltas.map((delta) => (
                  <li key={delta.id} className="py-3 text-sm">
                    <p className="font-semibold text-slate-950">
                      {delta.label}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {delta.baseline}{" "}
                      <ArrowRight
                        aria-hidden="true"
                        className="mx-1 inline h-3.5 w-3.5"
                      />{" "}
                      {delta.scenario}
                      <span className="ml-2 font-semibold text-slate-800">
                        ({delta.difference})
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {model.thresholds.length > 0 ? (
        <div className="mt-8 border-t border-slate-300 pt-6">
          <h3 className="text-sm font-semibold text-slate-950">
            Exact decision-changing thresholds
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            These come from deterministic rule 0.2.0 at this alternative—not
            from a separate UI formula.
          </p>
          <ul className="mt-4 grid gap-x-8 border-y border-slate-200 sm:grid-cols-2">
            {model.thresholds.map((threshold) => (
              <li
                key={threshold.id}
                className="border-b border-slate-200 py-4 text-sm last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
              >
                <p className="font-semibold text-slate-950">
                  {threshold.label} {threshold.operator} {threshold.threshold}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {threshold.distance} away → {threshold.changesConditionTo}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-300 pt-6 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={reset}
          disabled={!model.changed && name === ""}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Reset alternative
        </button>
        <DestructiveActionDialog
          title={`Make “${model.scenario.name}” the active brief?`}
          description="This replaces the current evaluated baseline on this device with the named alternative. Cancel keeps the current brief unchanged."
          actionLabel="Make active"
          onConfirm={() => onMakeActive(model.activeDraft, model.scenario.name)}
          trigger={
            <button
              type="button"
              disabled={!model.canMakeActive}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Make active
            </button>
          }
        />
      </div>
    </section>
  );
}
