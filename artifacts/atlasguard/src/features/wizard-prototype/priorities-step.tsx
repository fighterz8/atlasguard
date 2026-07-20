import { Flame, Route } from "lucide-react";

import { StatusBadge } from "../ux-system/status-badge";

import type { ClimateHeatPreference, PriorityImportance } from "./model";
import {
  PriorityChoiceGrid,
  type PriorityChoiceOption,
} from "./priority-choice-grid";

type ActiveImportance = Exclude<PriorityImportance, "does_not_matter">;

type PrioritiesStepProps = {
  commuteImportance: PriorityImportance;
  climateHeatPreference: ClimateHeatPreference;
  climateHeatImportance: ActiveImportance;
  onCommuteChange: (value: PriorityImportance) => void;
  onClimatePreferenceChange: (value: ClimateHeatPreference) => void;
  onClimateImportanceChange: (value: ActiveImportance) => void;
};

const importanceOptions: readonly PriorityChoiceOption<PriorityImportance>[] = [
  {
    value: "must_have",
    label: "Very important",
    description: "Give this supported comparison the strongest influence.",
    tone: "caution",
  },
  {
    value: "important",
    label: "Important",
    description: "This should meaningfully influence the tradeoff.",
  },
  {
    value: "nice_to_have",
    label: "Nice-to-have",
    description: "Useful context, but not a deciding factor.",
  },
  {
    value: "does_not_matter",
    label: "Does not matter",
    description: "Exclude this priority from the decision.",
    tone: "unavailable",
  },
];

const activeImportanceOptions = importanceOptions.filter(
  (option): option is PriorityChoiceOption<ActiveImportance> =>
    option.value !== "does_not_matter",
);

const climatePreferenceOptions: readonly PriorityChoiceOption<ClimateHeatPreference>[] =
  [
    {
      value: "fewer_hot_days",
      label: "Fewer hot days",
      description: "Prefer fewer days above 90°F.",
    },
    {
      value: "more_hot_days",
      label: "More hot days",
      description: "Prefer more days above 90°F.",
    },
    {
      value: "does_not_matter",
      label: "No preference",
      description: "Leave this climate signal out of the decision.",
      tone: "unavailable",
    },
  ];

export function PrioritiesStep({
  commuteImportance,
  climateHeatPreference,
  climateHeatImportance,
  onCommuteChange,
  onClimatePreferenceChange,
  onClimateImportanceChange,
}: PrioritiesStepProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 3 of 4</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            What matters in daily life?
          </h1>
        </div>
        <Route aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Set the direction and importance of each supported comparison. These
        priorities influence the score, but they are not deal-breakers. “Does
        not matter” removes that factor from the decision.
      </p>

      <fieldset className="mt-8">
        <legend className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-950">
          <Route aria-hidden="true" className="h-5 w-5 text-teal-700" />
          Typical one-way commute
          <StatusBadge tone="benchmark">ACS evidence</StatusBadge>
        </legend>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          How much should the regional commute comparison affect this move?
        </p>
        <PriorityChoiceGrid
          name="commute-importance"
          value={commuteImportance}
          options={importanceOptions}
          onChange={onCommuteChange}
        />
      </fieldset>

      <fieldset className="mt-9 border-t border-slate-200 pt-8">
        <legend className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-950">
          <Flame aria-hidden="true" className="h-5 w-5 text-amber-700" />
          Days above 90°F
          <StatusBadge tone="benchmark">NOAA evidence</StatusBadge>
        </legend>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Choose the heat pattern you prefer. NOAA station normals are a local
          proxy, so Results will show the urban-versus-airport range.
        </p>
        <PriorityChoiceGrid
          name="climate-heat-preference"
          value={climateHeatPreference}
          options={climatePreferenceOptions}
          onChange={onClimatePreferenceChange}
          columns="three"
        />

        {climateHeatPreference !== "does_not_matter" ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">
              How much should this heat preference count?
            </p>
            <PriorityChoiceGrid
              name="climate-heat-importance"
              value={climateHeatImportance}
              options={activeImportanceOptions}
              onChange={onClimateImportanceChange}
              columns="three"
            />
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}
