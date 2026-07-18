import { cn } from "../../lib/utils";

export type PriorityChoiceOption<Value extends string> = {
  value: Value;
  label: string;
  description: string;
};

type PriorityChoiceGridProps<Value extends string> = {
  name: string;
  value: Value;
  options: readonly PriorityChoiceOption<Value>[];
  onChange: (value: Value) => void;
  columns?: "two" | "three";
};

export function PriorityChoiceGrid<Value extends string>({
  name,
  value,
  options,
  onChange,
  columns = "two",
}: PriorityChoiceGridProps<Value>) {
  return (
    <div
      className={cn(
        "mt-4 grid gap-3",
        columns === "three" ? "md:grid-cols-3" : "sm:grid-cols-2",
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex min-h-24 cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-colors",
            value === option.value
              ? "border-teal-700 bg-teal-50 shadow-sm"
              : "border-slate-200 hover:border-slate-300",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-950">
              {option.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">
              {option.description}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
