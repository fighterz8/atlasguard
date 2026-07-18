import {
  CheckCircle2,
  CircleAlert,
  CircleOff,
  Database,
  FilePenLine,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type StatusBadgeTone =
  | "confirmed"
  | "estimate"
  | "benchmark"
  | "favorable"
  | "caution"
  | "risk"
  | "unavailable";

const styles: Record<StatusBadgeTone, string> = {
  confirmed: "border-favorable/25 bg-favorable-surface text-favorable",
  estimate: "border-estimate/25 bg-estimate-surface text-estimate",
  benchmark: "border-sky-700/20 bg-sky-50 text-sky-800",
  favorable: "border-favorable/25 bg-favorable-surface text-favorable",
  caution: "border-caution/25 bg-caution-surface text-caution",
  risk: "border-risk/25 bg-risk-surface text-risk",
  unavailable: "border-unavailable/20 bg-unavailable-surface text-unavailable",
};

const icons = {
  confirmed: CheckCircle2,
  estimate: FilePenLine,
  benchmark: Database,
  favorable: CheckCircle2,
  caution: CircleAlert,
  risk: CircleAlert,
  unavailable: CircleOff,
} satisfies Record<StatusBadgeTone, typeof CheckCircle2>;

type StatusBadgeProps = {
  tone: StatusBadgeTone;
  children: React.ReactNode;
  className?: string;
};

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  const Icon = icons[tone];

  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
