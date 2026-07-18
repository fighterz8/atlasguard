import { ExternalLink, Fingerprint } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <section aria-labelledby="evidence-heading" className="panel lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Traceable by design</p>
          <h2 id="evidence-heading" className="section-heading">
            Evidence record
          </h2>
        </div>
        <Fingerprint aria-hidden="true" className="h-6 w-6 text-teal-700" />
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {evidence.definition}
      </p>
      <Accordion type="single" collapsible className="mt-4">
        <AccordionItem value="provenance">
          <AccordionTrigger className="text-slate-900">
            Inspect source, dates, geography, and checksums
          </AccordionTrigger>
          <AccordionContent>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
