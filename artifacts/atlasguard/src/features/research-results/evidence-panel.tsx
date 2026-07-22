import { ExternalLink, Fingerprint } from "lucide-react";

import type { ResearchResultsViewModel } from "./model";

type EvidencePanelProps = Pick<
  ResearchResultsViewModel,
  "evidence" | "climateEvidence"
>;

const shortHash = (hash: string) => `${hash.slice(0, 12)}…${hash.slice(-8)}`;

export function EvidencePanel({
  evidence,
  climateEvidence,
}: EvidencePanelProps) {
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
  const climateDetails = climateEvidence
    ? [
        ["Dataset", climateEvidence.dataset],
        ["Publisher", climateEvidence.publisher],
        ["Observation period", climateEvidence.observationPeriod],
        ["Released", climateEvidence.releasedOn],
        ["Verified", climateEvidence.verifiedOn],
        ["Origin station", climateEvidence.originGeography],
        ["Destination station", climateEvidence.destinationGeography],
        [
          "Transformation",
          `${climateEvidence.transformationId} v${climateEvidence.transformationVersion}`,
        ],
      ]
    : [];

  return (
    <section
      aria-labelledby="evidence-heading"
      className="border-t border-slate-300 py-12"
    >
      <details className="border-y border-slate-200">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-sm font-semibold text-slate-800">
          <span id="evidence-heading">Sources and calculation details</span>
          <Fingerprint aria-hidden="true" className="h-4 w-4 text-slate-500" />
        </summary>
        <div className="border-t border-slate-200 pb-5 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">
            Commute evidence
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {evidence.definition}
          </p>
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
          <div className="mt-5 flex flex-wrap gap-3">
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

          {climateEvidence ? (
            <div className="mt-7 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-950">
                Hot-day evidence
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {climateEvidence.definition}
              </p>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                {climateEvidence.selectionRationale}
              </p>
              <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {climateDetails.map(([label, value]) => (
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
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  className="source-link"
                  href={climateEvidence.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Official NOAA source{" "}
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
                {climateEvidence.termsUrl ? (
                  <a
                    className="source-link"
                    href={climateEvidence.termsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source terms{" "}
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
