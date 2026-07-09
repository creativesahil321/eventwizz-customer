import type { SupportPriority, SupportStatus } from "../_lib/types";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  getPriorityClass,
  getStatusClass,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: SupportPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-medium sm:text-xs",
        getPriorityClass(priority),
        className
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

interface StatusBadgeProps {
  status: SupportStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center truncate rounded-full border px-2 py-0.5 text-[10px] font-medium sm:text-xs",
        getStatusClass(status),
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
