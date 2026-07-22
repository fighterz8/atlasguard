import { Pencil } from "lucide-react";
import React from "react";

import type { ResearchResultsViewModel } from "./model";

type NumbersUsedProps = Pick<
  ResearchResultsViewModel,
  "comparison" | "route"
> & {
  onEdit?: () => void;
};

export function NumbersUsed({ comparison, route, onEdit }: NumbersUsedProps) {
  return (
    <section
      aria-labelledby="numbers-used-heading"
      className="border-t border-slate-300 py-10 sm:py-12"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">The budget behind the brief</p>
          <h2
            id="numbers-used-heading"
            className="mt-2 font-serif text-3xl tracking-normal text-slate-950 sm:text-4xl"
          >
            Numbers MoveWise used
          </h2>
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-11 items-center gap-2 border-b-2 border-teal-800 px-1 py-2 text-sm font-semibold text-teal-900 hover:border-teal-500"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edit Budget
          </button>
        ) : null}
      </div>

      <div className="mt-7 hidden overflow-x-auto border-y border-slate-300 sm:block">
        <table className="w-full min-w-[34rem] table-fixed text-left">
          <caption className="sr-only">
            Monthly numbers used for the {route.originCity} to{" "}
            {route.destinationCity} brief
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              <th scope="col" className="w-[37%] py-3 pr-3">
                Monthly
              </th>
              <th scope="col" className="w-[21%] px-2 py-3 text-right">
                {route.originCity}
              </th>
              <th scope="col" className="w-[21%] px-2 py-3 text-right">
                {route.destinationCity}
              </th>
              <th scope="col" className="w-[21%] py-3 pl-2 text-right">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.financialRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-200 last:border-0"
              >
                <th
                  scope="row"
                  className="py-3 pr-3 text-sm font-semibold text-slate-800"
                >
                  {row.label}
                  {row.sourceLabel ? (
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      {row.sourceLabel}
                    </span>
                  ) : null}
                </th>
                <td className="px-2 py-3 text-right text-sm tabular-nums text-slate-700">
                  {row.originValue}
                </td>
                <td className="px-2 py-3 text-right text-sm font-semibold tabular-nums text-slate-950">
                  {row.destinationValue}
                </td>
                <td className="py-3 pl-2 text-right text-sm font-semibold tabular-nums text-slate-950">
                  {row.deltaValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-7 border-y border-slate-300 sm:hidden">
        {comparison.financialRows.map((row) => (
          <div
            key={row.id}
            className="border-b border-slate-200 py-4 last:border-0"
          >
            <p className="text-sm font-semibold text-slate-900">{row.label}</p>
            {row.sourceLabel ? (
              <p className="mt-1 text-xs text-slate-500">{row.sourceLabel}</p>
            ) : null}
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {[
                [route.originCity, row.originValue],
                [route.destinationCity, row.destinationValue],
                ["Change", row.deltaValue],
              ].map(([label, value], index) => (
                <div key={label} className={index === 2 ? "text-right" : ""}>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-950">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
