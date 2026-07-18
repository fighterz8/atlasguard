import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "../../lib/utils";

import type { BasisKey, ValueKey } from "./money-control-types";
import { MoneyInput } from "./money-input";
import {
  createMoneySliderModel,
  type MoneySliderKind,
} from "./money-slider-model";
import type {
  AssumptionBasis,
  WizardErrors,
  WizardPrototypeDraft,
} from "./model";

export type ComparisonDefinition = {
  kind: MoneySliderKind;
  title: string;
  description: string;
  current: {
    id: Extract<ValueKey, `current${string}`>;
    description: string;
  };
  target: {
    id: Extract<ValueKey, `target${string}`>;
    basisKey: Exclude<BasisKey, "retainedPropertyNetBasis">;
    description: string;
  };
};

export const moneyComparisons: readonly ComparisonDefinition[] = [
  {
    kind: "take_home",
    title: "Take-home income",
    description: "Monthly spendable income after withholding.",
    current: {
      id: "currentTakeHome",
      description: "Today",
    },
    target: {
      id: "targetTakeHome",
      basisKey: "targetTakeHomeBasis",
      description: "After the move",
    },
  },
  {
    kind: "housing",
    title: "Housing",
    description:
      "Required housing today and your expected cost after the move—not the regional median.",
    current: {
      id: "currentHousing",
      description: "Today",
    },
    target: {
      id: "targetHousing",
      basisKey: "targetHousingBasis",
      description: "After the move",
    },
  },
  {
    kind: "expenses",
    title: "Other recurring expenses",
    description: "Monthly recurring costs excluding housing.",
    current: {
      id: "currentExpenses",
      description: "Today",
    },
    target: {
      id: "targetExpenses",
      basisKey: "targetExpensesBasis",
      description: "After the move",
    },
  },
];

function DeltaBadge({
  direction,
  text,
}: {
  direction: "unknown" | "same" | "up" | "down";
  text: string;
}) {
  const Icon =
    direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
        direction === "unknown"
          ? "border-slate-200 bg-slate-50 text-slate-500"
          : direction === "same"
            ? "border-slate-300 bg-white text-slate-700"
            : "border-teal-200 bg-teal-50 text-teal-900",
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

export function MoneyComparisonCard({
  definition,
  finances,
  errors,
  onValueChange,
  onBasisChange,
}: {
  definition: ComparisonDefinition;
  finances: WizardPrototypeDraft["finances"];
  errors: WizardErrors;
  onValueChange: (key: ValueKey, value: string) => void;
  onBasisChange: (key: BasisKey, value: AssumptionBasis) => void;
}) {
  const targetBasis = finances[definition.target.basisKey];
  const slider = createMoneySliderModel({
    kind: definition.kind,
    currentValue: finances[definition.current.id],
    destinationValue: finances[definition.target.id],
  });
  const sliderDescriptionId = `${definition.target.id}-slider-description`;

  return (
    <section
      aria-labelledby={`${definition.kind}-comparison-heading`}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id={`${definition.kind}-comparison-heading`}
            className="text-base font-semibold text-slate-950"
          >
            {definition.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {definition.description}
          </p>
        </div>
        <DeltaBadge direction={slider.deltaDirection} text={slider.deltaText} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <MoneyInput
            id={definition.current.id}
            label="Current"
            accessibleLabel={`Current ${definition.title.toLowerCase()}`}
            description={definition.current.description}
            value={finances[definition.current.id]}
            basis="confirmed"
            error={errors[`finances.${definition.current.id}`]}
            onValueChange={(value) =>
              onValueChange(definition.current.id, value)
            }
          />
        </div>

        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
          <MoneyInput
            id={definition.target.id}
            label="Destination"
            accessibleLabel={`Destination ${definition.title.toLowerCase()}`}
            description={definition.target.description}
            value={finances[definition.target.id]}
            basis={targetBasis}
            basisKey={definition.target.basisKey}
            error={errors[`finances.${definition.target.id}`]}
            onValueChange={(value) =>
              onValueChange(definition.target.id, value)
            }
            onBasisChange={onBasisChange}
          />
        </div>
      </div>

      {targetBasis === "user_estimate" ? (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor={`${definition.target.id}-slider`}
              className="text-xs font-semibold text-slate-700"
            >
              Adjust destination estimate
            </label>
            <span className="text-xs font-semibold tabular-nums text-teal-900">
              {slider.valueText}
            </span>
          </div>
          <input
            id={`${definition.target.id}-slider`}
            type="range"
            min={slider.minimum}
            max={slider.maximum}
            step={1}
            value={slider.sliderValue}
            aria-label={`${definition.title} destination estimate slider`}
            aria-invalid={
              errors[`finances.${definition.target.id}`] ? "true" : undefined
            }
            aria-valuetext={slider.valueText}
            aria-describedby={sliderDescriptionId}
            onChange={(event) => {
              const rawValue = Number(event.currentTarget.value);
              const steppedValue =
                Math.round(rawValue / slider.step) * slider.step;
              onValueChange(definition.target.id, String(steppedValue));
            }}
            onKeyDown={(event) => {
              const direction =
                event.key === "ArrowLeft" || event.key === "ArrowDown"
                  ? -1
                  : event.key === "ArrowRight" || event.key === "ArrowUp"
                    ? 1
                    : 0;
              if (direction === 0) return;
              event.preventDefault();
              const nextValue = Math.min(
                slider.maximum,
                Math.max(
                  slider.minimum,
                  slider.sliderValue + direction * slider.step,
                ),
              );
              onValueChange(definition.target.id, String(nextValue));
            }}
            className="mt-2 h-11 w-full cursor-pointer accent-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30"
          />
          <div
            aria-hidden="true"
            className="flex justify-between text-[0.7rem] font-medium tabular-nums text-slate-500"
          >
            <span>{slider.minimumLabel}</span>
            <span>{slider.maximumLabel}</span>
          </div>
          <p
            id={sliderDescriptionId}
            className="mt-1 text-xs leading-5 text-slate-500"
          >
            Slide in {`$${slider.step}`} steps or type an exact amount above.
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          Confirmed amounts stay direct-entry so an exploratory slider cannot
          change them accidentally.
        </p>
      )}
    </section>
  );
}
