import { ClipboardCheck } from "lucide-react";

import { StatusBadge, type StatusBadgeTone } from "../ux-system/status-badge";

import { createReviewRows, getPlace, type WizardPrototypeDraft } from "./model";

type ReviewStepProps = {
  draft: WizardPrototypeDraft;
};

const basisCopy = {
  confirmed: { label: "Confirmed", tone: "confirmed" },
  user_estimate: { label: "User estimate", tone: "estimate" },
  manual_entry: { label: "Manual entry", tone: "confirmed" },
  user_priority: { label: "Your priority", tone: "confirmed" },
} satisfies Record<string, { label: string; tone: StatusBadgeTone }>;

export function ReviewStep({ draft }: ReviewStepProps) {
  const rows = createReviewRows(draft);
  const origin = getPlace(draft.originSlug);
  const destination = getPlace(draft.destinationSlug);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Step 4 of 4</p>
          <h1
            id="wizard-step-heading"
            tabIndex={-1}
            className="section-heading"
          >
            Review every assumption
          </h1>
        </div>
        <ClipboardCheck
          aria-hidden="true"
          className="mt-1 h-6 w-6 text-teal-700"
        />
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Nothing should enter the calculation without being visible here first.
        Go back to correct anything that is missing or mislabeled.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {[origin, destination].map((place, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              {index === 0
                ? "Origin benchmark geography"
                : "Destination benchmark geography"}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {place?.metro ?? "Missing"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-7 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            MoveWise prototype assumptions and provenance
          </caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Assumption
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Value
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 font-semibold sm:table-cell"
              >
                Basis
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const status = basisCopy[row.basis];
              return (
                <tr key={`${row.group}-${row.label}`}>
                  <th
                    scope="row"
                    className="px-4 py-3 font-medium text-slate-700"
                  >
                    <span className="block text-xs text-slate-400">
                      {row.group}
                    </span>
                    {row.label}
                    <span className="mt-2 block sm:hidden">
                      <StatusBadge tone={status.tone}>
                        {status.label}
                      </StatusBadge>
                    </span>
                  </th>
                  <td className="px-4 py-3 font-semibold text-slate-950 tabular-nums">
                    {row.value}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-7 rounded-xl border border-caution/25 bg-caution-surface p-4 text-sm leading-6 text-caution">
        Completing this review will not evaluate or save the scenario. The
        functional endpoint remains disabled until the supported metro lookup
        and complete user-facing evidence path are approved.
      </div>
    </div>
  );
}
