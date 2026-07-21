import { StatusBadge } from "../ux-system/status-badge";

import type { ResearchResultsViewModel } from "./model";

type ComparisonOverviewProps = Pick<
  ResearchResultsViewModel,
  "route" | "comparison" | "priority" | "climate" | "housingContext"
> & {
  reviewedAssumptions?: boolean;
};

const classificationCopy = {
  improves: "Better",
  similar: "Similar",
  worsens: "Worse",
  unavailable: "Unavailable",
} as const;

const classificationTone = {
  improves: "favorable",
  similar: "neutral",
  worsens: "risk",
  unavailable: "unavailable",
} as const;

export function ComparisonOverview({
  route,
  comparison,
  priority,
  climate,
  housingContext,
  reviewedAssumptions = false,
}: ComparisonOverviewProps) {
  return (
    <section
      aria-labelledby="comparison-heading"
      className="border-t border-slate-300 py-12 sm:py-16"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
        <div>
          <p className="eyebrow">Side-by-side</p>
          <h2
            id="comparison-heading"
            className="mt-3 max-w-2xl font-serif text-4xl tracking-[-0.035em] text-slate-950 sm:text-5xl"
          >
            What changes if you move
          </h2>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {reviewedAssumptions
            ? "Monthly amounts use MoveWise public estimates plus any edits you made."
            : "Monthly amounts are illustrative for this research preview."}
        </p>
      </div>

      <div className="mt-10 hidden overflow-x-auto border-y border-slate-300 sm:block">
        <table className="w-full min-w-[32rem] table-fixed text-left">
          <caption className="sr-only">
            Monthly financial comparison between {route.originCity} and{" "}
            {route.destinationCity}
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">
              <th scope="col" className="w-[34%] py-4 pr-3">
                Monthly
              </th>
              <th scope="col" className="w-[22%] px-2 py-4 text-right">
                {route.originCity}
              </th>
              <th scope="col" className="w-[22%] px-2 py-4 text-right">
                {route.destinationCity}
              </th>
              <th scope="col" className="w-[22%] py-4 pl-2 text-right">
                Difference
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.financialRows.map((row) => (
              <tr
                key={row.id}
                className={
                  row.emphasis
                    ? "border-b border-slate-300 bg-white/60"
                    : "border-b border-slate-200 last:border-0"
                }
              >
                <th
                  scope="row"
                  className={`py-4 pr-3 ${row.emphasis ? "font-semibold text-slate-950" : "font-medium text-slate-700"}`}
                >
                  <span className="block">{row.label}</span>
                  {row.sourceLabel ? (
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone={row.sourceTone ?? "neutral"}>
                        {row.sourceLabel}
                      </StatusBadge>
                    </span>
                  ) : null}
                </th>
                <td className="px-2 py-4 text-right text-sm tabular-nums text-slate-800">
                  {row.originValue}
                </td>
                <td className="px-2 py-4 text-right text-sm font-medium tabular-nums text-slate-950">
                  {row.destinationValue}
                </td>
                <td className="py-4 pl-2 text-right text-sm font-semibold tabular-nums">
                  <StatusBadge
                    tone={classificationTone[row.classification]}
                    className="ml-auto"
                  >
                    {row.deltaValue} · {classificationCopy[row.classification]}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 border-y border-slate-300 sm:hidden">
        {comparison.financialRows.map((row) => (
          <div
            key={row.id}
            className={`border-b border-slate-200 py-4 last:border-0 ${row.emphasis ? "bg-white/60" : ""}`}
          >
            <p
              className={`mb-3 text-sm ${row.emphasis ? "font-semibold text-slate-950" : "font-medium text-slate-700"}`}
            >
              {row.label}
            </p>
            {row.sourceLabel ? (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <StatusBadge tone={row.sourceTone ?? "neutral"}>
                  {row.sourceLabel}
                </StatusBadge>
              </div>
            ) : null}
            <dl className="grid grid-cols-3 gap-2">
              {[
                [route.originCity, row.originValue],
                [route.destinationCity, row.destinationValue],
                ["Difference", row.deltaValue],
              ].map(([label, value], index) => (
                <div key={label} className={index === 2 ? "text-right" : ""}>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {label}
                  </dt>
                  {index === 2 ? (
                    <dd className="mt-1">
                      <StatusBadge
                        tone={classificationTone[row.classification]}
                      >
                        {value} · {classificationCopy[row.classification]}
                      </StatusBadge>
                    </dd>
                  ) : (
                    <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-950">
                      {value}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {priority || climate ? (
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {priority ? (
            <article aria-labelledby="commute-comparison-heading">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Importance {priority.weight}/5
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-b border-slate-300 pb-3">
                <h3
                  id="commute-comparison-heading"
                  className="text-lg font-semibold text-slate-950"
                >
                  Commute
                </h3>
                <StatusBadge tone={classificationTone[priority.classification]}>
                  {classificationCopy[priority.classification]}
                </StatusBadge>
              </div>
              <dl className="grid grid-cols-2 gap-6 py-5">
                <div>
                  <dt className="text-xs text-slate-500">{route.originCity}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
                    {priority.originValue}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">
                    {route.destinationCity}
                  </dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
                    {priority.destinationValue}
                  </dd>
                </div>
              </dl>
              <p className="text-sm leading-6 text-slate-600">
                {priority.interpretation}
              </p>
              {priority.mobilityContext ? (
                <div className="mt-5 border-l-4 border-slate-300 bg-white/60 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="neutral">
                      {priority.mobilityContext.role}
                    </StatusBadge>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                      {priority.mobilityContext.sourceLabel}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {priority.mobilityContext.reading}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {priority.mobilityContext.boundary}
                  </p>
                </div>
              ) : null}
            </article>
          ) : null}

          {climate ? (
            <article aria-labelledby="climate-comparison-heading">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Preference: {climate.preference}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-b border-slate-300 pb-3">
                <h3
                  id="climate-comparison-heading"
                  className="text-lg font-semibold text-slate-950"
                >
                  Climate
                </h3>
                <StatusBadge tone={classificationTone[climate.classification]}>
                  {classificationCopy[climate.classification]}
                </StatusBadge>
              </div>
              <div className="grid gap-5 py-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    {route.originCity}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {climate.originSummary}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    {route.destinationCity}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {climate.destinationSummary}
                  </p>
                </div>
              </div>
              <p className="border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
                {climate.traitChanges.join(" · ")}
              </p>
            </article>
          ) : null}
        </div>
      ) : null}

      <details className="mt-10 border-y border-slate-200 py-1">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-sm font-semibold text-slate-800">
          <span>Area rent context</span>
          <span className="text-xs font-medium text-slate-500">
            {housingContext.boundary}
          </span>
        </summary>
        <div className="grid gap-6 border-t border-slate-200 py-5 sm:grid-cols-[1fr_1fr_2fr]">
          <div>
            <p className="text-xs text-slate-500">{route.originMetro}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
              {housingContext.originValue}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{route.destinationMetro}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
              {housingContext.destinationValue}
            </p>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {housingContext.reading}
          </p>
        </div>
      </details>
    </section>
  );
}
