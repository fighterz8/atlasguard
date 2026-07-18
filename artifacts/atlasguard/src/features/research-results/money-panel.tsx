import { WalletCards } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type MoneyPanelProps = Pick<ResearchResultsViewModel, "route" | "finances">;

const rows = [
  ["Take-home income", "takeHome"],
  ["Housing", "housing"],
  ["Other recurring expenses", "recurring"],
  ["Monthly cushion", "cushion"],
  ["Housing burden", "burden"],
] as const;

export function MoneyPanel({ route, finances }: MoneyPanelProps) {
  return (
    <section aria-labelledby="money-heading" className="panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Illustrative assumptions</p>
          <h2 id="money-heading" className="section-heading">
            Money, side by side
          </h2>
        </div>
        <WalletCards aria-hidden="true" className="h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        These illustrative values prove the calculation and layout only. The
        destination estimates include declared ranges for What-if testing; none
        are metro benchmarks or a suggested budget.
      </p>
      <div className="mt-6">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">
            Illustrative monthly finances for {route.originCity} and{" "}
            {route.destinationCity}
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
              <tr key={key} className="border-b border-slate-100 last:border-0">
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
      <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-600">Cushion change</span>
        <strong className="tabular-nums text-slate-950">
          {finances.cushionDelta} · {finances.classification}
        </strong>
      </div>
    </section>
  );
}
