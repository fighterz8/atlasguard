import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

import { cn } from "../../lib/utils";

import type {
  BudgetChangeTone,
  BudgetEquationModel,
} from "./budget-equation-model";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const amount = (value: number | null) =>
  value === null ? "—" : currency.format(value);

const toneClasses: Record<BudgetChangeTone, string> = {
  favorable: "border-favorable/25 bg-favorable-surface text-favorable",
  caution: "border-caution/30 bg-caution-surface text-caution",
  neutral: "border-slate-300 bg-slate-50 text-slate-800",
  open: "border-teal-200 bg-teal-50 text-teal-950",
};

export function BudgetRoomLeft({
  model,
  side,
}: {
  model: BudgetEquationModel;
  side: "current" | "destination";
}) {
  const isCurrent = side === "current";
  const values = isCurrent ? model.current : model.destination;
  const equation = [
    amount(values.takeHome),
    "−",
    amount(values.housing),
    "−",
    amount(values.expenses),
  ];
  const retainedProperty =
    !isCurrent && model.destination.retainedPropertySource === "user_value"
      ? model.destination.retainedPropertyNet
      : null;

  return (
    <div
      className={cn(
        "mt-5 border-t pt-4",
        isCurrent ? "border-slate-200" : "border-teal-200",
      )}
      data-budget-equation={side}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
        {isCurrent ? "Your monthly equation" : "Destination monthly equation"}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="text-sm font-medium leading-6 text-slate-600 tabular-nums"
            aria-label={`${amount(values.takeHome)} income after tax minus ${amount(values.housing)} home minus ${amount(values.expenses)} everything else${retainedProperty !== null ? ` ${retainedProperty >= 0 ? "plus" : "minus"} ${currency.format(Math.abs(retainedProperty))} retained property impact` : ""}`}
          >
            {equation.join(" ")}
            {retainedProperty !== null
              ? ` ${retainedProperty >= 0 ? "+" : "−"} ${currency.format(Math.abs(retainedProperty))}`
              : null}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Income after tax − Home − Everything else
            {retainedProperty !== null ? " + property impact" : ""}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
          <span className="text-sm font-semibold text-slate-700">
            Room left
          </span>
          <p className="text-lg font-semibold tracking-[-0.02em] text-slate-950 tabular-nums">
            {values.roomLeftText}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BudgetConsequenceStrip({
  model,
}: {
  model: BudgetEquationModel;
}) {
  const Icon =
    model.consequence.tone === "favorable"
      ? CheckCircle2
      : model.consequence.tone === "open"
        ? ArrowRight
        : AlertCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-budget-consequence
      className={cn(
        "rounded-xl border p-4",
        toneClasses[model.consequence.tone],
      )}
    >
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">{model.consequence.headline}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">
            {model.consequence.detail}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] opacity-75">
            {model.consequence.estimateCount} planning{" "}
            {model.consequence.estimateCount === 1 ? "estimate" : "estimates"}
            {model.consequence.openCount > 0
              ? ` · ${model.consequence.openCount} open ${model.consequence.openCount === 1 ? "answer" : "answers"}`
              : " · equation complete"}
          </p>
        </div>
      </div>
    </div>
  );
}
