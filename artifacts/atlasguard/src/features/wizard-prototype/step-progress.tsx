import { Check } from "lucide-react";

import { cn } from "../../lib/utils";

import { wizardSteps, type WizardStepId } from "./model";

type StepProgressProps = {
  currentStep: WizardStepId;
};

export function StepProgress({ currentStep }: StepProgressProps) {
  const currentIndex = wizardSteps.findIndex((step) => step.id === currentStep);

  return (
    <nav aria-label="Evaluation progress">
      <ol className="grid grid-cols-3 gap-1 sm:grid-cols-6 sm:gap-3">
        {wizardSteps.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;

          return (
            <li key={step.id} className="min-w-0">
              <div
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-center text-xs font-semibold transition-colors sm:min-h-14 sm:flex-row sm:justify-start sm:gap-2 sm:px-3 sm:text-left",
                  current &&
                    "border-teal-700 bg-teal-50 text-teal-950 shadow-sm",
                  complete &&
                    "border-favorable/25 bg-favorable-surface text-favorable",
                  !current &&
                    !complete &&
                    "border-slate-200 bg-white text-slate-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums",
                    current && "border-teal-700 bg-teal-700 text-white",
                    complete && "border-favorable bg-favorable text-white",
                    !current &&
                      !complete &&
                      "border-slate-300 bg-slate-50 text-slate-600",
                  )}
                >
                  {complete ? (
                    <Check aria-label="Completed" className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="max-w-full truncate sm:hidden">
                  {step.shortLabel}
                </span>
                <span className="hidden truncate sm:inline">{step.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
