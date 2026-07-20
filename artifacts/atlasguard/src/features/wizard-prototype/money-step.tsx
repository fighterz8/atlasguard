import { Copy, Home, Landmark } from "lucide-react";

import { MoneyComparisonCard, moneyComparisons } from "./money-comparison-card";
import type { BasisKey, FinanceKey, ValueKey } from "./money-control-types";
import { MoneyInput } from "./money-input";
import type {
  AssumptionBasis,
  WizardErrors,
  WizardPrototypeDraft,
} from "./model";

type MoneyStepProps = {
  finances: WizardPrototypeDraft["finances"];
  errors: WizardErrors;
  onValueChange: (key: ValueKey, value: string) => void;
  onBasisChange: (key: BasisKey, value: AssumptionBasis) => void;
  onGrossKnownChange: (value: boolean) => void;
  onCopyCurrent: () => void;
};

export function MoneyStep({
  finances,
  errors,
  onValueChange,
  onBasisChange,
  onGrossKnownChange,
  onCopyCurrent,
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
            Compare your monthly picture
          </h1>
        </div>
        <Landmark aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Enter what is true today, then use the sliders to explore what might
        change after the move. You can always type an exact amount.
      </p>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-950">
            Expect housing and other costs to stay similar?
          </p>
          <p className="mt-1 text-xs leading-5 text-teal-900/75">
            Copy current housing and recurring costs. Enter destination
            take-home separately because taxes and pay can change across states.
          </p>
        </div>
        <button
          type="button"
          onClick={onCopyCurrent}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-900 transition-colors hover:border-teal-500 hover:bg-teal-100"
        >
          <Copy aria-hidden="true" className="h-4 w-4" />
          Copy current costs
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {moneyComparisons.map((definition) => (
          <MoneyComparisonCard
            key={definition.kind}
            definition={definition}
            finances={finances}
            errors={errors}
            onValueChange={onValueChange}
            onBasisChange={onBasisChange}
          />
        ))}

        <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-950">
            What would your household’s total monthly income be before taxes in
            the destination?
          </legend>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            This is used only for the housing-burden check. MoveWise will not
            guess gross income from your take-home pay.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-5">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="radio"
                name="targetGrossIncomeKnown"
                checked={finances.targetGrossIncomeKnown}
                onChange={() => onGrossKnownChange(true)}
                className="h-4 w-4 accent-teal-800"
              />
              Enter monthly gross income
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="radio"
                name="targetGrossIncomeKnown"
                checked={!finances.targetGrossIncomeKnown}
                onChange={() => onGrossKnownChange(false)}
                className="h-4 w-4 accent-teal-800"
              />
              I don’t know
            </label>
          </div>
          {finances.targetGrossIncomeKnown ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <MoneyInput
                id="targetGrossIncome"
                label="Destination gross income"
                description="Total monthly household income before taxes. Use an estimate if it is not confirmed yet."
                value={finances.targetGrossIncome}
                basis={finances.targetGrossIncomeBasis}
                basisKey="targetGrossIncomeBasis"
                error={errors["finances.targetGrossIncome"]}
                onValueChange={(value) =>
                  onValueChange("targetGrossIncome", value)
                }
                onBasisChange={onBasisChange}
              />
            </div>
          ) : null}
        </fieldset>

        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 marker:hidden">
            <Home aria-hidden="true" className="h-4 w-4 text-slate-500" />
            Keeping a property after the move?
          </summary>
          <div className="border-t border-slate-200 bg-white p-4">
            <MoneyInput
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
    </div>
  );
}

export type { BasisKey, FinanceKey, ValueKey };
