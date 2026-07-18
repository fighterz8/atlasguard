import { MapPin } from "lucide-react";

import { StatusBadge } from "@/features/ux-system/status-badge";

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

export function MoveStep({ draft, errors, onChange }: MoveStepProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 1 of 4</p>
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

      <div className="mt-8 rounded-xl border border-caution/25 bg-caution-surface p-4 text-sm leading-6 text-caution">
        This prototype supports Los Angeles and Seattle only. A selected city is
        preserved separately from the metro used for regional evidence.
      </div>
    </div>
  );
}
