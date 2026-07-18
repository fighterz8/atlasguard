import { ArrowUpRight, CheckCircle2, Info, MoveRight } from "lucide-react";

import { EvidencePanel } from "@/features/research-results/evidence-panel";
import { MoneyPanel } from "@/features/research-results/money-panel";
import { createResearchResultsViewModel } from "@/features/research-results/model";
import { PriorityPanel } from "@/features/research-results/priority-panel";
import { ResearchBanner } from "@/features/research-results/research-banner";
import { SummaryPanel } from "@/features/research-results/summary-panel";

export default function ResultsPage() {
  const model = createResearchResultsViewModel();
  const hasMaterialFindings =
    model.findings.drivers.length +
      model.findings.tradeoffs.length +
      model.findings.blockers.length >
    0;

  return (
    <div className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <ResearchBanner />
      <header className="border-b border-slate-200/80 bg-[#f7f8f4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <a
            href={import.meta.env.BASE_URL}
            className="text-lg font-semibold tracking-[-0.03em] text-slate-950"
          >
            Move<span className="text-teal-700">Wise</span>
          </a>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
            Deterministic preview
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <SummaryPanel {...model} />

        <section
          aria-label="Interpretation limits"
          className="mt-8 grid gap-3 sm:grid-cols-2"
        >
          <div className="status-note">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            />
            <div>
              <strong>Confidence: {model.confidence.level}.</strong>{" "}
              {model.confidence.explanation}
            </div>
          </div>
          <div className="status-note">
            <Info
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            />
            <div>
              <strong>Stability: not evaluated.</strong>{" "}
              {model.stability.explanation}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <MoneyPanel route={model.route} finances={model.finances} />
          <PriorityPanel route={model.route} priority={model.priority} />

          <section aria-labelledby="reading-heading" className="panel">
            <p className="eyebrow">Why this result</p>
            <h2 id="reading-heading" className="section-heading">
              Decision reading
            </h2>
            {hasMaterialFindings ? (
              <ul className="mt-5 space-y-3">
                {[
                  ...model.findings.blockers,
                  ...model.findings.tradeoffs,
                  ...model.findings.drivers,
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm leading-6 text-slate-700"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 text-teal-700"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="font-medium text-slate-900">
                  No material driver or blocker was detected.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {model.finances.reading} The commute change is also not
                  material. More evidence is required—not more confident
                  wording.
                </p>
              </div>
            )}
          </section>

          <section
            aria-labelledby="next-heading"
            className="panel bg-slate-950 text-white"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">
              Next investigation
            </p>
            <h2
              id="next-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
            >
              What would make this useful?
            </h2>
            <ol className="mt-5 space-y-4">
              {model.nextSteps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 text-sm leading-6 text-slate-200"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-200">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
              <li className="flex gap-3 text-sm leading-6 text-slate-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-200">
                  {model.nextSteps.length + 1}
                </span>
                Add verified housing, cost-of-living, and climate evidence
                before comparing a real move.
              </li>
            </ol>
            <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <MoveRight aria-hidden="true" className="h-4 w-4" />
              What-if thresholds are deliberately not simulated yet.
            </p>
          </section>

          <EvidencePanel evidence={model.evidence} />
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Research-only result · no account, storage, model provider, or live
            API call.
          </p>
          <a
            className="inline-flex items-center gap-1 font-medium text-teal-800 hover:text-teal-950"
            href="#evidence-heading"
          >
            Inspect the evidence{" "}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </footer>
      </main>
    </div>
  );
}
