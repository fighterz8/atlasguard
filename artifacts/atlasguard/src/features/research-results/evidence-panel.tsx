import { ExternalLink, Fingerprint } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type EvidencePanelProps = Pick<ResearchResultsViewModel, "evidence">;

const shortHash = (hash: string) => `${hash.slice(0, 12)}…${hash.slice(-8)}`;

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  const details = [
    ["Dataset", evidence.dataset],
    ["Publisher", evidence.publisher],
    ["Observation period", evidence.observationPeriod],
    ["Released", evidence.releasedOn],
    ["Verified", evidence.verifiedOn],
    ["Origin geography", evidence.originGeography],
    ["Destination geography", evidence.destinationGeography],
    ["Delineation", evidence.delineationVersion],
    [
      "Transformation",
      `${evidence.transformationId} v${evidence.transformationVersion}`,
    ],
    [
      "Promoted snapshot",
      `v${evidence.snapshotVersion} · ${shortHash(evidence.snapshotSha256)}`,
    ],
    ["Raw snapshot", shortHash(evidence.rawSnapshotSha256)],
  ];

  return (
    <section aria-labelledby="evidence-heading" className="lg:col-span-2">
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-slate-800">
          <span id="evidence-heading">Sources and methodology</span>
          <Fingerprint aria-hidden="true" className="h-4 w-4 text-slate-500" />
        </summary>
        <div className="border-t border-slate-200 px-4 pb-5 pt-4 sm:px-5">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            {evidence.definition}
          </p>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="border-t border-slate-100 pt-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 break-words font-mono text-xs leading-5 text-slate-800">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className="source-link"
              href={evidence.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Official source{" "}
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
            {evidence.termsUrl ? (
              <a
                className="source-link"
                href={evidence.termsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Source terms{" "}
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}
