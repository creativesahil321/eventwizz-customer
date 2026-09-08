import type { SupportPriority, SupportStatus } from "../_lib/types";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  getPriorityClass,
  getStatusClass,
  normalizeSupportStatus,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: SupportPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const safePriority = (["low", "medium", "high"] as const).includes(
    priority as SupportPriority
  )
    ? priority
    : "medium";

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium sm:text-[10px]",
        getPriorityClass(safePriority),
        className
      )}
    >
      {PRIORITY_LABELS[safePriority]}
    </span>
  );
}

const badgeClassName =
  "inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium sm:text-[10px]";

interface StatusBadgeProps {
  status: SupportStatus | string;
  label?: string | null;
  reopened?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  reopened,
  className,
}: StatusBadgeProps) {
  const safeStatus = reopened ? "reopen" : normalizeSupportStatus(status);
  const text = reopened
    ? STATUS_LABELS.reopen
    : label?.trim() || STATUS_LABELS[safeStatus];

  return (
    <span
      className={cn(badgeClassName, getStatusClass(safeStatus), className)}
    >
      {text}
    </span>
  );
}
