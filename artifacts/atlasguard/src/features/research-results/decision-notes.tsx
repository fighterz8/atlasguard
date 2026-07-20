import React from "react";

import type { ResearchResultsViewModel } from "./model";

type DecisionNotesProps = Pick<
  ResearchResultsViewModel,
  "findings" | "finances" | "nextSteps" | "priority" | "climate"
>;

export function DecisionNotes({
  findings,
  finances,
  nextSteps,
  priority,
  climate,
}: DecisionNotesProps) {
  const materialFindings = [
    ...findings.blockers,
    ...findings.tradeoffs,
    ...findings.drivers,
  ];

  return (
    <section className="border-t border-slate-300 py-12 sm:py-16">
      <div
        className={
          nextSteps.length > 0
            ? "grid gap-12 lg:grid-cols-2 lg:gap-20"
            : "max-w-3xl"
        }
      >
        <div aria-labelledby="decision-notes-heading">
          <p className="eyebrow">The reasoning</p>
          <h2
            id="decision-notes-heading"
            className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
          >
            What matters most
          </h2>
          {materialFindings.length > 0 ? (
            <ul className="mt-7 divide-y divide-slate-200 border-y border-slate-300">
              {materialFindings.map((item) => (
                <li
                  key={item}
                  className="py-4 text-sm leading-6 text-slate-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-7 border-y border-slate-300 py-5">
              <p className="font-semibold text-slate-950">
                No material advantage or blocker was detected.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {finances.reading}
                {priority || climate
                  ? " The included daily-life factors are not large enough to change that reading."
                  : " Factors you excluded are not being used to fill the gap."}
              </p>
            </div>
          )}
          {findings.assumptions.length > 0 ? (
            <details className="mt-4 text-sm text-slate-600">
              <summary className="min-h-11 cursor-pointer py-3 font-semibold text-slate-800">
                Assumptions to watch
              </summary>
              <ul className="space-y-2 border-l border-slate-300 pl-4">
                {findings.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        {nextSteps.length > 0 ? (
          <div aria-labelledby="next-steps-heading">
            <p className="eyebrow">Before you decide</p>
            <h2
              id="next-steps-heading"
              className="mt-3 font-serif text-4xl tracking-[-0.035em] text-slate-950"
            >
              Close the important gaps
            </h2>
            <ol className="mt-7 border-y border-slate-300">
              {nextSteps.map((step, index) => (
                <li
                  key={`${index}-${step}`}
                  className="grid grid-cols-[2rem_1fr] gap-3 border-b border-slate-200 py-4 last:border-0"
                >
                  <span className="font-serif text-xl text-teal-800">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-slate-700">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
