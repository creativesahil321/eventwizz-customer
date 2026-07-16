import type { SupportPriority, SupportStatus } from "../_lib/types";
import {
  PRIORITY_LABELS,
  getPriorityClass,
  getStatusClass,
  getStatusLabel,
  normalizeSupportStatus,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: SupportPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const safePriority = (["low", "medium", "high"] as const).includes(
    priority as SupportPriority,
  )
    ? priority
    : "medium";

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium sm:text-[10px]",
        getPriorityClass(safePriority),
        className,
      )}
    >
      {PRIORITY_LABELS[safePriority]}
    </span>
  );
}

interface StatusBadgeProps {
  status: SupportStatus | string;
  label?: string | null;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const safeStatus = normalizeSupportStatus(status);
  const text = getStatusLabel(safeStatus, label);

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium sm:text-[10px]",
        getStatusClass(safeStatus),
        className,
      )}
    >
      {text}
    </span>
  );
}
