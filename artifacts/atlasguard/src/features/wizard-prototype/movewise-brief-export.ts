import type { ResearchResultsViewModel } from "../research-results/model";
import type { MoveWiseVerificationTask } from "./verification-task-model";

export const MOVEWISE_BRIEF_EXPORT_SCHEMA_VERSION = "1.0.0" as const;

const NON_CLAIMS = [
  "This brief is a planning aid, not a recommendation or instruction to move.",
  "MoveWise estimates are not a quote, guarantee, current listing, or promise of availability.",
  "Area-level evidence does not establish that a specific home, route, school, service, or job will work for this household.",
] as const;

type MoveWiseBriefExportOptions = Readonly<{
  generatedAt: string;
  scenarioName: string;
  includeTaskNotes?: boolean;
  includeEvidenceLinks?: boolean;
}>;

type ExportedVerificationTask = Readonly<{
  id: string;
  question: string;
  instructions: string;
  affectedClaim: string;
  answerReturnsTo: MoveWiseVerificationTask["answerReturnsTo"];
  status: MoveWiseVerificationTask["status"];
  owner: string | null;
  dueDate: string | null;
  updatedAt: string;
  resolution: null | Readonly<{
    kind: NonNullable<MoveWiseVerificationTask["resolution"]>["kind"];
    resolvedValue: string;
    provenance: "user_checked";
    resolvedAt: string;
  }>;
  note?: string;
  evidenceUrl?: string;
}>;

type DataFreshness = Readonly<{
  area: string;
  dataset: string;
  publisher: string;
  observationPeriod: string;
  releasedOn: string;
  verifiedOn: string;
  sourceUrl?: string;
}>;

export type MoveWiseBriefExport = Readonly<{
  schemaVersion: typeof MOVEWISE_BRIEF_EXPORT_SCHEMA_VERSION;
  kind: "movewise_relocation_brief";
  generatedAt: string;
  immutable: true;
  scenario: Readonly<{
    name: string;
    origin: string;
    destination: string;
    originMetro: string;
    destinationMetro: string;
  }>;
  decision: Readonly<{
    judgment: string;
    outlook: string;
    readiness: string;
    evidenceConfidence: string;
    scoreRuleVersion: string;
  }>;
  financialPicture: Readonly<{
    currency: "USD";
    rows: readonly Readonly<{
      label: string;
      origin: string;
      destination: string;
      change: string;
      destinationSource: string | null;
    }>[];
    originMonthlyCushion: string;
    destinationMonthlyCushion: string;
    monthlyCushionChange: string;
  }>;
  verification: Readonly<{
    open: readonly ExportedVerificationTask[];
    completed: readonly ExportedVerificationTask[];
  }>;
  dataFreshness: readonly DataFreshness[];
  nonClaims: readonly string[];
  privacy: Readonly<{
    generatedLocally: true;
    uploadedByMoveWise: false;
    includesTaskNotes: boolean;
    includesEvidenceLinks: boolean;
    excludedByDefault: readonly string[];
  }>;
  audit: Readonly<{
    scoreRuleVersion: string;
    benchmarkSnapshotVersion: string;
    benchmarkSnapshotSha256: string;
    rawSnapshotSha256: string;
    transformationId: string;
    transformationVersion: string;
  }>;
}>;

const exportTask = (
  task: MoveWiseVerificationTask,
  options: MoveWiseBriefExportOptions,
): ExportedVerificationTask => {
  const exported: ExportedVerificationTask = {
    id: task.id,
    question: task.question,
    instructions: task.instructions,
    affectedClaim: task.affectedClaim,
    answerReturnsTo: task.answerReturnsTo,
    status: task.status,
    owner: task.owner === "" ? null : task.owner,
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
    resolution:
      task.resolution === null
        ? null
        : {
            kind: task.resolution.kind,
            resolvedValue: task.resolution.resolvedValue,
            provenance: task.resolution.provenance,
            resolvedAt: task.resolution.resolvedAt,
          },
    ...(options.includeTaskNotes && task.note !== ""
      ? { note: task.note }
      : {}),
    ...(options.includeEvidenceLinks && task.evidenceUrl !== ""
      ? { evidenceUrl: task.evidenceUrl }
      : {}),
  };
  return exported;
};

const freshnessRecord = (
  area: string,
  evidence: Readonly<{
    dataset: string;
    publisher: string;
    observationPeriod: string;
    releasedOn: string;
    verifiedOn: string;
    sourceUrl: string;
  }>,
  includeEvidenceLinks: boolean,
): DataFreshness => ({
  area,
  dataset: evidence.dataset,
  publisher: evidence.publisher,
  observationPeriod: evidence.observationPeriod,
  releasedOn: evidence.releasedOn,
  verifiedOn: evidence.verifiedOn,
  ...(includeEvidenceLinks ? { sourceUrl: evidence.sourceUrl } : {}),
});

export function createMoveWiseBriefExport(
  model: ResearchResultsViewModel,
  tasks: readonly MoveWiseVerificationTask[],
  options: MoveWiseBriefExportOptions,
): MoveWiseBriefExport {
  const includeEvidenceLinks = options.includeEvidenceLinks === true;
  const exportedTasks = tasks.map((task) => exportTask(task, options));
  const dataFreshness = [
    freshnessRecord("Commute", model.evidence, includeEvidenceLinks),
    freshnessRecord(
      "Housing",
      model.housingContext.evidence,
      includeEvidenceLinks,
    ),
    ...(model.climateEvidence === null
      ? []
      : [
          freshnessRecord(
            "Climate",
            model.climateEvidence,
            includeEvidenceLinks,
          ),
        ]),
  ];

  return {
    schemaVersion: MOVEWISE_BRIEF_EXPORT_SCHEMA_VERSION,
    kind: "movewise_relocation_brief",
    generatedAt: options.generatedAt,
    immutable: true,
    scenario: {
      name: options.scenarioName.trim() || "Current brief",
      origin: model.route.originCity,
      destination: model.route.destinationCity,
      originMetro: model.route.originMetro,
      destinationMetro: model.route.destinationMetro,
    },
    decision: {
      judgment: model.brief.judgment,
      outlook: model.brief.outlook.label,
      readiness: model.brief.readiness.label,
      evidenceConfidence: model.brief.evidenceConfidence.label,
      scoreRuleVersion: model.score.scoreVersion,
    },
    financialPicture: {
      currency: "USD",
      rows: model.comparison.financialRows.map((row) => ({
        label: row.label,
        origin: row.originValue,
        destination: row.destinationValue,
        change: row.deltaValue,
        destinationSource: row.sourceLabel ?? null,
      })),
      originMonthlyCushion: model.finances.origin.cushion,
      destinationMonthlyCushion: model.finances.destination.cushion,
      monthlyCushionChange: model.finances.cushionDelta,
    },
    verification: {
      open: exportedTasks.filter(
        (task) => task.status === "open" || task.status === "in_progress",
      ),
      completed: exportedTasks.filter(
        (task) => task.status === "resolved" || task.status === "not_needed",
      ),
    },
    dataFreshness,
    nonClaims: [...NON_CLAIMS],
    privacy: {
      generatedLocally: true,
      uploadedByMoveWise: false,
      includesTaskNotes: options.includeTaskNotes === true,
      includesEvidenceLinks: includeEvidenceLinks,
      excludedByDefault: ["Private task notes", "Evidence links"],
    },
    audit: {
      scoreRuleVersion: model.score.scoreVersion,
      benchmarkSnapshotVersion: model.evidence.snapshotVersion,
      benchmarkSnapshotSha256: model.evidence.snapshotSha256,
      rawSnapshotSha256: model.evidence.rawSnapshotSha256,
      transformationId: model.evidence.transformationId,
      transformationVersion: model.evidence.transformationVersion,
    },
  };
}

const safeFilenamePart = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "brief";

export function createMoveWiseBriefExportFilename(
  exported: MoveWiseBriefExport,
  extension: "json" | "html",
): string {
  const date = exported.generatedAt.slice(0, 10);
  const version = exported.schemaVersion.replace(/\./g, "-");
  return [
    "movewise",
    safeFilenamePart(exported.scenario.name),
    `${safeFilenamePart(exported.scenario.origin)}-to-${safeFilenamePart(exported.scenario.destination)}`,
    date,
    `v${version}.${extension}`,
  ].join("-");
}

export const serializeMoveWiseBriefExport = (
  exported: MoveWiseBriefExport,
): string => `${JSON.stringify(exported, null, 2)}\n`;

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );

const formatGeneratedDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
};

const taskListHtml = (
  heading: string,
  tasks: readonly ExportedVerificationTask[],
): string => `
  <section>
    <h2>${escapeHtml(heading)} <span class="count">${tasks.length}</span></h2>
    ${
      tasks.length === 0
        ? "<p>None.</p>"
        : `<ul>${tasks
            .map(
              (task) => `<li>
        <strong>${escapeHtml(task.question)}</strong>
        <p>${escapeHtml(task.instructions)}</p>
        <p class="meta">Status: ${escapeHtml(task.status.replace(/_/g, " "))}${task.owner ? ` · Owner: ${escapeHtml(task.owner)}` : ""}${task.dueDate ? ` · Due: ${escapeHtml(task.dueDate)}` : ""}</p>
        ${task.note ? `<p><strong>Private note:</strong> ${escapeHtml(task.note)}</p>` : ""}
        ${task.evidenceUrl ? `<p><strong>Evidence link:</strong> <a href="${escapeHtml(task.evidenceUrl)}">${escapeHtml(task.evidenceUrl)}</a></p>` : ""}
      </li>`,
            )
            .join("")}</ul>`
    }
  </section>`;

export function renderMoveWiseBriefExportHtml(
  exported: MoveWiseBriefExport,
): string {
  const route = `${exported.scenario.origin} to ${exported.scenario.destination}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MoveWise · ${escapeHtml(exported.scenario.name)}</title>
  <style>
    :root { color: #14201f; background: #f7f8f4; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    body { max-width: 900px; margin: 0 auto; padding: 40px 24px 64px; line-height: 1.55; }
    h1, h2 { line-height: 1.15; } h1 { font-family: Georgia, serif; font-size: 2.4rem; margin: .4rem 0 1rem; }
    h2 { border-top: 1px solid #bdc8c5; padding-top: 1.25rem; margin-top: 2rem; }
    .eyebrow, .meta { color: #52615f; font-size: .9rem; } .count { color: #52615f; font-weight: normal; }
    .decision { border-left: 4px solid #0f766e; padding: 1rem 1.25rem; background: #edf8f5; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: .4rem 1rem; } dt { font-weight: 700; }
    table { border-collapse: collapse; width: 100%; } th, td { border-bottom: 1px solid #d6dddb; padding: .7rem .5rem; text-align: left; vertical-align: top; }
    ul { padding-left: 1.3rem; } li { margin: .8rem 0; } a { color: #0f766e; overflow-wrap: anywhere; }
    .privacy { background: #fff7df; padding: 1rem 1.25rem; }
    @media (max-width: 620px) { body { padding: 24px 16px 48px; } h1 { font-size: 2rem; } table { font-size: .85rem; } }
    @media print { :root, body { background: white; } body { max-width: none; padding: 0; } a { color: inherit; } section, table { break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">MoveWise relocation brief · ${escapeHtml(route)}</p>
    <h1>${escapeHtml(exported.scenario.name)}</h1>
    <p class="meta">Generated ${escapeHtml(formatGeneratedDate(exported.generatedAt))} · Export version ${escapeHtml(exported.schemaVersion)} · Immutable snapshot</p>
  </header>
  <section class="decision">
    <h2>Decision picture</h2>
    <p><strong>${escapeHtml(exported.decision.judgment)}</strong></p>
    <dl><dt>Outlook</dt><dd>${escapeHtml(exported.decision.outlook)}</dd><dt>Readiness</dt><dd>${escapeHtml(exported.decision.readiness)}</dd><dt>Evidence</dt><dd>${escapeHtml(exported.decision.evidenceConfidence)}</dd></dl>
  </section>
  <section>
    <h2>Monthly financial picture</h2>
    <table><thead><tr><th>Number</th><th>${escapeHtml(exported.scenario.origin)}</th><th>${escapeHtml(exported.scenario.destination)}</th><th>Change</th></tr></thead><tbody>${exported.financialPicture.rows
      .map(
        (row) =>
          `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.origin)}</td><td>${escapeHtml(row.destination)}${row.destinationSource ? `<br><span class="meta">${escapeHtml(row.destinationSource)}</span>` : ""}</td><td>${escapeHtml(row.change)}</td></tr>`,
      )
      .join("")}</tbody></table>
  </section>
  ${taskListHtml("Open checks", exported.verification.open)}
  ${taskListHtml("Completed checks", exported.verification.completed)}
  <section>
    <h2>Data freshness</h2>
    <ul>${exported.dataFreshness
      .map(
        (source) =>
          `<li><strong>${escapeHtml(source.area)}</strong> · ${escapeHtml(source.publisher)} · ${escapeHtml(source.dataset)}<br><span class="meta">Observed ${escapeHtml(source.observationPeriod)} · Released ${escapeHtml(source.releasedOn)} · Verified ${escapeHtml(source.verifiedOn)}</span>${source.sourceUrl ? `<br><a href="${escapeHtml(source.sourceUrl)}">Source</a>` : ""}</li>`,
      )
      .join("")}</ul>
  </section>
  <section>
    <h2>What this brief does not claim</h2>
    <ul>${exported.nonClaims.map((claim) => `<li>${escapeHtml(claim)}</li>`).join("")}</ul>
  </section>
  <section class="privacy">
    <h2>Export privacy</h2>
    <p>This file was generated locally. MoveWise did not upload it or create a public link.</p>
    <p>Private task notes: ${exported.privacy.includesTaskNotes ? "included by request" : "excluded"}. Evidence links: ${exported.privacy.includesEvidenceLinks ? "included by request" : "excluded"}.</p>
  </section>
</body>
</html>\n`;
}
