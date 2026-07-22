import { MapPin } from "lucide-react";
import type { MoveWiseHouseholdMode } from "@workspace/contracts";

import { StatusBadge } from "../ux-system/status-badge";

import {
  getPlace,
  supportedPlaces,
  type SupportedPlaceSlug,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

type MoveStepProps = {
  draft: WizardPrototypeDraft;
  errors: WizardErrors;
  onChange: (
    key: "originSlug" | "destinationSlug",
    value: SupportedPlaceSlug | "",
  ) => void;
  onModeChange: (value: MoveWiseHouseholdMode) => void;
};

type LocationFieldProps = {
  id: "originSlug" | "destinationSlug";
  label: string;
  description: string;
  value: SupportedPlaceSlug | "";
  error?: string;
  onChange: (value: SupportedPlaceSlug | "") => void;
};

function LocationField({
  id,
  label,
  description,
  value,
  error,
  onChange,
}: LocationFieldProps) {
  const place = getPlace(value);
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-950">
        {label}
      </label>
      <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-600">
        {description}
      </p>
      <select
        id={id}
        value={value}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
        onChange={(event) =>
          onChange(event.currentTarget.value as SupportedPlaceSlug | "")
        }
        className="control-input mt-3"
      >
        <option value="">Choose a location</option>
        {supportedPlaces.map((placeOption) => (
          <option key={placeOption.slug} value={placeOption.slug}>
            {placeOption.city}, {placeOption.state}
          </option>
        ))}
      </select>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm font-medium text-risk"
        >
          {error}
        </p>
      ) : null}
      {place ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="benchmark">Metro resolved</StatusBadge>
            <span className="text-xs font-medium text-slate-500">
              Census/OMB comparison geography
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-800">
            {place.metro}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function MoveStep({
  draft,
  errors,
  onChange,
  onModeChange,
}: MoveStepProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 1 of 6</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            What move are you considering?
          </h1>
        </div>
        <MapPin aria-hidden="true" className="mt-1 h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        MoveWise evaluates one specific origin and destination. It is not a
        nationwide “best places” recommender.
      </p>

      <div className="mt-8 grid gap-7 lg:grid-cols-2">
        <LocationField
          id="originSlug"
          label="Current location"
          description="Where you live now—the baseline for every comparison."
          value={draft.originSlug}
          error={errors.originSlug}
          onChange={(value) => onChange("originSlug", value)}
        />
        <LocationField
          id="destinationSlug"
          label="Destination under consideration"
          description="The real location you are deciding whether to move to."
          value={draft.destinationSlug}
          error={errors.destinationSlug}
          onChange={(value) => onChange("destinationSlug", value)}
        />
      </div>

      <fieldset className="mt-8 border-t border-slate-200 pt-7">
        <legend className="text-base font-semibold text-slate-950">
          Who would be making this move?
        </legend>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This changes which household questions appear. It does not give a
          family or individual an automatic score advantage.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              value: "individual" as const,
              label: "Just me",
              description:
                "We’ll ask only about needs that can apply to an individual move.",
            },
            {
              value: "family" as const,
              label: "Me and one or more other people in my household",
              description:
                "We’ll include household continuity without adding an automatic family bonus.",
            },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"
            >
              <input
                id={`householdMode-${option.value}`}
                type="radio"
                name="householdMode"
                value={option.value}
                checked={draft.householdMode === option.value}
                aria-invalid={errors.householdMode ? "true" : undefined}
                aria-describedby={
                  errors.householdMode ? "householdMode-error" : undefined
                }
                onChange={() => onModeChange(option.value)}
                className="mt-1 h-4 w-4 shrink-0 accent-teal-800"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-950">
                  {option.label}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.householdMode ? (
          <p
            id="householdMode-error"
            role="alert"
            className="mt-2 text-sm font-medium text-risk"
          >
            {errors.householdMode}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-8 rounded-xl border border-caution/25 bg-caution-surface p-4 text-sm leading-6 text-caution">
        This research cohort supports Los Angeles, Seattle, Austin, and San
        Diego. The selected city stays separate from the metro used for regional
        evidence.
      </div>
    </div>
  );
}
