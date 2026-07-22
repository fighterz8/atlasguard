import { CheckCircle2, Pencil } from "lucide-react";
import React from "react";

import type {
  BudgetEditOrigin,
  BudgetEditSummary,
} from "./budget-edit-session";

export function BudgetEditBanner({ origin }: { origin: BudgetEditOrigin }) {
  return (
    <aside
      aria-label="Budget edit status"
      className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-teal-950"
    >
      <div className="flex items-start gap-3">
        <Pencil aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">
            Editing Budget from {origin === "results" ? "Results" : "Review"}
          </p>
          <p className="mt-1 text-sm leading-6 text-teal-900/80">
            This is a working copy. Save Budget to recalculate and return, or
            Cancel to keep the evaluated brief unchanged.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function BudgetEditSummaryPanel({
  summary,
}: {
  summary: BudgetEditSummary;
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="budget-edit-summary-heading"
      className="mb-6 rounded-xl border border-favorable/25 bg-favorable-surface p-4 text-favorable"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <h2 id="budget-edit-summary-heading" className="font-semibold">
            {summary.headline}
          </h2>
          <p className="mt-1 text-sm leading-6">{summary.detail}</p>
          <ul className="mt-3 space-y-1 text-xs leading-5">
            {summary.items.slice(0, 3).map((item) => (
              <li key={item.key}>
                <span className="font-semibold">{item.label}:</span>{" "}
                <span className="line-through opacity-70">{item.before}</span> →{" "}
                {item.after}
              </li>
            ))}
          </ul>
          {summary.items.length > 3 ? (
            <p className="mt-2 text-xs font-semibold">
              +{summary.items.length - 3} more changed assumption
              {summary.items.length - 3 === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
