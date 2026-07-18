import type { WizardErrors, WizardPrototypeDraft } from "./model";

export type RangeKey =
  | "targetTakeHomeRangeMin"
  | "targetTakeHomeRangeMax"
  | "targetHousingRangeMin"
  | "targetHousingRangeMax"
  | "targetExpensesRangeMin"
  | "targetExpensesRangeMax"
  | "retainedPropertyNetRangeMin"
  | "retainedPropertyNetRangeMax";

type PlausibleRangeFieldsProps = {
  label: string;
  minKey: RangeKey;
  maxKey: RangeKey;
  finances: WizardPrototypeDraft["finances"];
  errors: WizardErrors;
  signed?: boolean;
  onChange: (key: RangeKey, value: string) => void;
};

export function PlausibleRangeFields({
  label,
  minKey,
  maxKey,
  finances,
  errors,
  signed = false,
  onChange,
}: PlausibleRangeFieldsProps) {
  const descriptionId = `${minKey}-description`;

  return (
    <fieldset className="mt-4 rounded-xl border border-estimate/25 bg-estimate-surface/50 p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-estimate">
        Plausible monthly range
      </legend>
      <p id={descriptionId} className="text-xs leading-5 text-slate-600">
        Enter a realistic low and high. Your {label.toLowerCase()} must fall
        inside this range.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[
          { key: minKey, shortLabel: "Low" },
          { key: maxKey, shortLabel: "High" },
        ].map(({ key, shortLabel }) => {
          const error = errors[`finances.${key}`];
          const errorId = `${key}-error`;
          return (
            <div key={key}>
              <label
                htmlFor={key}
                className="text-xs font-semibold text-slate-700"
              >
                {shortLabel}
              </label>
              <div className="relative mt-1">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500"
                >
                  $
                </span>
                <input
                  id={key}
                  type="text"
                  inputMode={signed ? "text" : "numeric"}
                  autoComplete="off"
                  value={finances[key]}
                  aria-label={`${label} plausible ${shortLabel.toLowerCase()}`}
                  aria-invalid={error ? "true" : undefined}
                  aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
                  onChange={(event) => onChange(key, event.currentTarget.value)}
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
        })}
      </div>
    </fieldset>
  );
}
