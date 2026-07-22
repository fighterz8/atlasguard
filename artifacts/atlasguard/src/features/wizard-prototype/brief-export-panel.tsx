import { Download, FileJson, FileText, ShieldCheck } from "lucide-react";
import React from "react";

import type { ResearchResultsViewModel } from "../research-results/model";
import type { MoveWiseVerificationTask } from "./verification-task-model";
import {
  createMoveWiseBriefExport,
  createMoveWiseBriefExportFilename,
  renderMoveWiseBriefExportHtml,
  serializeMoveWiseBriefExport,
} from "./movewise-brief-export";

type BriefExportPanelProps = Readonly<{
  model: ResearchResultsViewModel;
  tasks: readonly MoveWiseVerificationTask[];
}>;

const includedFields = [
  "Decision picture and monthly numbers",
  "Open and completed verification checks",
  "Data freshness and important non-claims",
  "Export version and calculation audit details",
] as const;

const downloadTextFile = (
  filename: string,
  contents: string,
  mimeType: string,
): boolean => {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return false;
  }
  const blobUrl = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  return true;
};

export function BriefExportPanel({ model, tasks }: BriefExportPanelProps) {
  const [scenarioName, setScenarioName] = React.useState("Current brief");
  const [includeTaskNotes, setIncludeTaskNotes] = React.useState(false);
  const [includeEvidenceLinks, setIncludeEvidenceLinks] = React.useState(false);
  const [downloadStatus, setDownloadStatus] = React.useState<
    Readonly<{ tone: "success" | "error"; message: string }> | undefined
  >();

  const download = (extension: "json" | "html") => {
    const exported = createMoveWiseBriefExport(model, tasks, {
      generatedAt: new Date().toISOString(),
      scenarioName,
      includeTaskNotes,
      includeEvidenceLinks,
    });
    const filename = createMoveWiseBriefExportFilename(exported, extension);
    const success = downloadTextFile(
      filename,
      extension === "json"
        ? serializeMoveWiseBriefExport(exported)
        : renderMoveWiseBriefExportHtml(exported),
      extension === "json"
        ? "application/json;charset=utf-8"
        : "text/html;charset=utf-8",
    );
    setDownloadStatus(
      success
        ? {
            tone: "success",
            message: `${filename} was generated on this device.`,
          }
        : {
            tone: "error",
            message:
              "This browser could not create the file. Your brief was not uploaded.",
          },
    );
  };

  return (
    <details className="group border-t border-slate-300 py-1">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-base font-semibold text-slate-900">
        <span>Export or share</span>
        <Download
          aria-hidden="true"
          className="h-5 w-5 text-slate-500 transition-transform group-open:-translate-y-0.5"
        />
      </summary>
      <section
        aria-labelledby="brief-export-heading"
        className="border-t border-slate-200 py-8 sm:py-10"
      >
        <div className="max-w-4xl">
          <div className="flex items-start gap-3 border-l-2 border-teal-700 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            <div>
              <h2 id="brief-export-heading" className="font-semibold">
                Generated only in this browser
              </h2>
              <p>
                MoveWise does not upload it, create a public link, or keep a
                copy. You decide where the downloaded file goes next.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-7 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Included in both files
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {includedFields.map((field) => (
                  <li key={field} className="flex gap-2">
                    <span aria-hidden="true" className="text-teal-700">
                      •
                    </span>
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Excluded unless you choose otherwise
              </h3>
              <div className="mt-3 space-y-3">
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeTaskNotes}
                    onChange={(event) =>
                      setIncludeTaskNotes(event.currentTarget.checked)
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                  />
                  <span>
                    <strong className="font-semibold text-slate-950">
                      Include private task notes
                    </strong>
                    <br />
                    Notes may contain family, timing, or service details.
                  </span>
                </label>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeEvidenceLinks}
                    onChange={(event) =>
                      setIncludeEvidenceLinks(event.currentTarget.checked)
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                  />
                  <span>
                    <strong className="font-semibold text-slate-950">
                      Include evidence links
                    </strong>
                    <br />
                    Links can reveal listings, providers, or research sources.
                  </span>
                </label>
              </div>
            </div>
          </div>

          <label
            htmlFor="brief-export-scenario-name"
            className="mt-7 block text-sm font-semibold text-slate-950"
          >
            Brief name
          </label>
          <input
            id="brief-export-scenario-name"
            type="text"
            value={scenarioName}
            maxLength={80}
            onChange={(event) => setScenarioName(event.currentTarget.value)}
            className="mt-2 min-h-11 w-full max-w-lg border border-slate-400 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/25"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Each file is an immutable snapshot stamped with its generation time
            and export version.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => download("json")}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <FileJson aria-hidden="true" className="h-4 w-4" />
              Download JSON
            </button>
            <button
              type="button"
              onClick={() => download("html")}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-teal-700 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              Download readable HTML
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            JSON preserves the structured record. HTML is readable, printable,
            and easy to send as a file.
          </p>

          {downloadStatus ? (
            <p
              role="status"
              aria-live="polite"
              className={`mt-4 text-sm font-medium ${
                downloadStatus.tone === "success"
                  ? "text-teal-800"
                  : "text-risk"
              }`}
            >
              {downloadStatus.message}
            </p>
          ) : null}
        </div>
      </section>
    </details>
  );
}
