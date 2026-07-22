import React from "react";
import { CheckCircle2, ChevronDown, CircleDotDashed } from "lucide-react";

import type { MoveWiseDecisionGateModule } from "./decision-gate-model";
import type {
  MoveWiseVerificationResolutionInput,
  MoveWiseVerificationTask,
  MoveWiseVerificationTaskStatus,
} from "./verification-task-model";

type TaskMutationResult = Readonly<{
  success: boolean;
  error?: string;
}>;

type VerificationPlanProps = {
  tasks: readonly MoveWiseVerificationTask[];
  onUpdateTask: (
    taskId: string,
    patch: Partial<
      Pick<
        MoveWiseVerificationTask,
        "status" | "owner" | "dueDate" | "note" | "evidenceUrl"
      >
    >,
  ) => TaskMutationResult;
  onResolveTask: (
    taskId: string,
    resolution: MoveWiseVerificationResolutionInput,
  ) => TaskMutationResult;
  onEditModule?: (moduleId: MoveWiseDecisionGateModule) => void;
};

const activeStatuses = new Set<MoveWiseVerificationTaskStatus>([
  "open",
  "in_progress",
]);

const statusLabel: Record<MoveWiseVerificationTaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  not_needed: "Not needed",
};

const inputClassName =
  "mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20";

const taskDomId = (task: MoveWiseVerificationTask) =>
  task.id.replace(/[^a-zA-Z0-9_-]/g, "-");

function TaskResolution({
  task,
  onResolveTask,
}: Pick<VerificationPlanProps, "onResolveTask"> & {
  task: MoveWiseVerificationTask;
}) {
  const id = taskDomId(task);
  const [value, setValue] = React.useState("");
  const [notNeededReason, setNotNeededReason] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const isHouseholdStatus = /^householdPlan\..+\.status$/.test(
    task.source.fieldId,
  );
  const isCeilingType =
    task.source.fieldId === "householdPlan.housing.ceilingType";
  const valueLabel =
    task.source.fieldId === "householdPlan.housing.maxMonthlyCost"
      ? "Updated rent ceiling"
      : "Verified monthly amount";

  const resolve = (resolution: MoveWiseVerificationResolutionInput) => {
    const result = onResolveTask(task.id, resolution);
    setMessage(
      result.success
        ? "Answer saved and the move picture was recalculated."
        : (result.error ?? "This answer could not be saved."),
    );
  };

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <h4 className="text-sm font-semibold text-slate-950">
        Return the checked answer
      </h4>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Completing this task updates the source field and recalculates the
        brief. Changing the task status alone cannot verify it.
      </p>

      {isHouseholdStatus ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-slate-800">
            What did you find?
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ["works", "Works"],
              ["does_not_work", "Does not work"],
            ].map(([optionValue, label]) => (
              <label
                key={optionValue}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"
              >
                <input
                  type="radio"
                  name={`${id}-household-status`}
                  value={optionValue}
                  checked={value === optionValue}
                  onChange={(event) => setValue(event.target.value)}
                />
                {label}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={value === ""}
            onClick={() =>
              resolve({
                kind: "household_status",
                value: value as "works" | "does_not_work",
              })
            }
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Resolve with this answer
          </button>
        </fieldset>
      ) : isCeilingType ? (
        <div className="mt-4">
          <label
            htmlFor={`${id}-ceiling-type`}
            className="text-sm font-semibold text-slate-800"
          >
            Rent ceiling meaning
          </label>
          <select
            id={`${id}-ceiling-type`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={inputClassName}
          >
            <option value="">Choose one</option>
            <option value="hard">Hard limit</option>
            <option value="target">Target</option>
            <option value="flexible">Flexible</option>
          </select>
          <button
            type="button"
            disabled={value === ""}
            onClick={() =>
              resolve({
                kind: "rent_ceiling_type",
                value: value as "hard" | "target" | "flexible",
              })
            }
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Resolve with this answer
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <label
            htmlFor={`${id}-verified-value`}
            className="text-sm font-semibold text-slate-800"
          >
            {valueLabel}
          </label>
          <div className="mt-2 flex max-w-md items-stretch rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/20">
            <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">
              $
            </span>
            <input
              id={`${id}-verified-value`}
              inputMode="numeric"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-r-md border-0 px-3 py-2 text-base text-slate-950 outline-none"
            />
          </div>
          <button
            type="button"
            disabled={value.trim() === ""}
            onClick={() => resolve({ kind: "verified_value", value })}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Resolve with this answer
          </button>
        </div>
      )}

      {isHouseholdStatus ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <label
            htmlFor={`${id}-not-needed-reason`}
            className="text-sm font-semibold text-slate-800"
          >
            If this need no longer applies, explain why
          </label>
          <textarea
            id={`${id}-not-needed-reason`}
            rows={2}
            value={notNeededReason}
            onChange={(event) => setNotNeededReason(event.target.value)}
            className={inputClassName}
          />
          <button
            type="button"
            disabled={notNeededReason.trim() === ""}
            onClick={() =>
              resolve({ kind: "not_needed", reason: notNeededReason })
            }
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Mark not needed
          </button>
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 text-sm font-semibold text-slate-700"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function VerificationTaskEditor({
  task,
  onUpdateTask,
  onResolveTask,
  onEditModule,
}: Omit<VerificationPlanProps, "tasks"> & {
  task: MoveWiseVerificationTask;
}) {
  const id = taskDomId(task);
  const [status, setStatus] = React.useState<"open" | "in_progress">(
    task.status === "in_progress" ? "in_progress" : "open",
  );
  const [owner, setOwner] = React.useState(task.owner);
  const [dueDate, setDueDate] = React.useState(task.dueDate ?? "");
  const [note, setNote] = React.useState(task.note);
  const [evidenceUrl, setEvidenceUrl] = React.useState(task.evidenceUrl);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setStatus(task.status === "in_progress" ? "in_progress" : "open");
    setOwner(task.owner);
    setDueDate(task.dueDate ?? "");
    setNote(task.note);
    setEvidenceUrl(task.evidenceUrl);
  }, [task]);

  return (
    <details className="group border-t border-slate-200" open={false}>
      <summary className="flex min-h-14 cursor-pointer list-none items-start justify-between gap-4 py-4 marker:hidden">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-950">
              {task.question}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
              {statusLabel[task.status]}
            </span>
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            {task.instructions}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="pb-6">
        <dl className="grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-700">Affected claim</dt>
            <dd className="mt-1 leading-6 text-slate-600">
              {task.affectedClaim}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">Where it goes</dt>
            <dd className="mt-1 leading-6 text-slate-600">
              Answer returns to {task.answerReturnsTo}
            </dd>
          </div>
        </dl>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const result = onUpdateTask(task.id, {
              status,
              owner,
              dueDate: dueDate === "" ? null : dueDate,
              note,
              evidenceUrl,
            });
            setMessage(
              result.success
                ? "Task details saved on this device."
                : (result.error ?? "Task details could not be saved."),
            );
          }}
        >
          <div>
            <label
              htmlFor={`${id}-status`}
              className="text-sm font-semibold text-slate-800"
            >
              Status
            </label>
            <select
              id={`${id}-status`}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "open" | "in_progress")
              }
              className={inputClassName}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
            </select>
          </div>
          <div>
            <label
              htmlFor={`${id}-owner`}
              className="text-sm font-semibold text-slate-800"
            >
              Owner
            </label>
            <input
              id={`${id}-owner`}
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Who will check this?"
              className={inputClassName}
            />
          </div>
          <div>
            <label
              htmlFor={`${id}-due-date`}
              className="text-sm font-semibold text-slate-800"
            >
              Due date
            </label>
            <input
              id={`${id}-due-date`}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label
              htmlFor={`${id}-evidence`}
              className="text-sm font-semibold text-slate-800"
            >
              Optional evidence link
            </label>
            <input
              id={`${id}-evidence`}
              type="url"
              inputMode="url"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://"
              className={inputClassName}
            />
            <p className="mt-1 text-xs leading-5 text-slate-500">
              An evidence link does not verify the answer by itself.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor={`${id}-note`}
              className="text-sm font-semibold text-slate-800"
            >
              Notes
            </label>
            <textarea
              id={`${id}-note`}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-500"
            >
              Save task details
            </button>
            {onEditModule ? (
              <button
                type="button"
                onClick={() => onEditModule(task.source.moduleId)}
                className="inline-flex min-h-11 items-center border-b-2 border-teal-800 py-2 text-sm font-semibold text-teal-900 hover:border-teal-500"
              >
                Edit {task.answerReturnsTo}
              </button>
            ) : null}
          </div>
          {message ? (
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-semibold text-slate-700 sm:col-span-2"
            >
              {message}
            </p>
          ) : null}
        </form>

        <TaskResolution task={task} onResolveTask={onResolveTask} />
      </div>
    </details>
  );
}

export function VerificationPlan({
  tasks,
  onUpdateTask,
  onResolveTask,
  onEditModule,
}: VerificationPlanProps) {
  const activeTasks = tasks.filter((task) => activeStatuses.has(task.status));
  const completedTasks = tasks.filter(
    (task) => !activeStatuses.has(task.status),
  );
  const openLabel = `${activeTasks.length} open ${activeTasks.length === 1 ? "check" : "checks"}`;

  return (
    <section
      aria-labelledby="verification-plan-heading"
      className="border-t border-slate-300 py-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Verification plan
          </p>
          <h2
            id="verification-plan-heading"
            className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950"
          >
            Turn uncertainty into household work
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Assign each check, keep the source you used, and return the answer
            to the part of the brief it changes.
          </p>
        </div>
        <div className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-950">
          <CircleDotDashed aria-hidden="true" className="h-4 w-4" />
          {openLabel}
        </div>
      </div>

      {activeTasks.length > 0 ? (
        <div className="mt-6 border-b border-slate-200">
          {activeTasks.map((task) => (
            <VerificationTaskEditor
              key={task.id}
              task={task}
              onUpdateTask={onUpdateTask}
              onResolveTask={onResolveTask}
              onEditModule={onEditModule}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-3 rounded-md bg-teal-50 p-4 text-sm leading-6 text-teal-950">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <p>
            No open checks remain. The brief still reflects the sources and
            answers recorded in each module.
          </p>
        </div>
      )}

      {completedTasks.length > 0 ? (
        <details className="group mt-5 border-t border-slate-200">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 text-sm font-semibold text-slate-800">
            <span>Completed history ({completedTasks.length})</span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180"
            />
          </summary>
          <ul className="divide-y divide-slate-200 border-t border-slate-200">
            {completedTasks.map((task) => (
              <li key={task.id} className="py-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">
                    {task.question}
                  </span>
                  <span className="rounded-full bg-teal-100 px-2 py-1 text-xs font-bold text-teal-900">
                    {statusLabel[task.status]}
                  </span>
                </div>
                {task.resolution ? (
                  <p className="mt-1 leading-6 text-slate-600">
                    Recorded answer: {task.resolution.resolvedValue}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
