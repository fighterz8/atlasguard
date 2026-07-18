import { ArrowRight, WalletCards } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type MoneyPanelProps = Pick<ResearchResultsViewModel, "route" | "finances"> & {
  reviewedAssumptions?: boolean;
};

const rows = [
  ["Take-home income", "takeHome"],
  ["Gross income", "gross"],
  ["Housing", "housing"],
  ["Other recurring expenses", "recurring"],
  ["Retained-property net", "retainedPropertyNet"],
  ["Monthly cushion", "cushion"],
  ["Housing burden", "burden"],
] as const;

export function MoneyPanel({
  route,
  finances,
  reviewedAssumptions = false,
}: MoneyPanelProps) {
  return (
    <section aria-labelledby="money-heading" className="panel lg:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Monthly impact</p>
          <h2 id="money-heading" className="section-heading">
            Your financial picture at a glance
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {reviewedAssumptions
              ? "Based on the monthly amounts you entered."
              : "Illustrative amounts used to test this research preview."}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-800">
          <WalletCards aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <dt className="text-xs font-medium text-slate-500">
            {route.originCity} cushion
          </dt>
          <dd className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums text-slate-950">
            {finances.origin.cushion}
          </dd>
        </div>
        <div className="flex items-center justify-center px-2 text-teal-700">
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 rotate-90 sm:rotate-0"
          />
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <dt className="text-xs font-medium text-teal-800">
            {route.destinationCity} cushion
          </dt>
          <dd className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums text-teal-950">
            {finances.destination.cushion}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-1 rounded-xl bg-slate-950 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-slate-300">Monthly difference</span>
        <strong className="text-lg tabular-nums">
          {finances.cushionDelta} · {finances.classification}
        </strong>
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 text-sm font-semibold text-slate-800">
          See the monthly inputs
        </summary>
        <div className="overflow-x-auto border-t border-slate-200 px-4 pb-2 pt-1">
          <table className="w-full min-w-[30rem] table-fixed text-left text-sm">
            <caption className="sr-only">
              {reviewedAssumptions ? "Reviewed" : "Illustrative"} monthly
              finances for {route.originCity} and {route.destinationCity}
            </caption>
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th scope="col" className="w-[46%] pb-3 pr-2 font-medium">
                  Monthly
                </th>
                <th
                  scope="col"
                  className="w-[27%] pb-3 text-right text-xs font-medium sm:text-sm"
                >
                  {route.originCity}
                </th>
                <th
                  scope="col"
                  className="w-[27%] pb-3 text-right text-xs font-medium sm:text-sm"
                >
                  {route.destinationCity}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, key]) => (
                <tr
                  key={key}
                  className="border-b border-slate-100 last:border-0"
                >
                  <th
                    scope="row"
                    className="py-3 pr-2 font-medium text-slate-700"
                  >
                    {label}
                  </th>
                  <td className="py-3 text-right tabular-nums text-slate-950">
                    {finances.origin[key]}
                  </td>
                  <td className="py-3 text-right tabular-nums text-slate-950">
                    {finances.destination[key]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
