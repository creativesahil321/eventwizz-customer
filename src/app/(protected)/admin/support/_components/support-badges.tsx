import { Building2, Ticket, UserRound, Store } from "lucide-react";
import type { SupportSource, SupportStatus } from "../_lib/types";
import {
  ADMIN_SOURCE_LABELS,
  STATUS_LABELS,
  getStatusClass,
} from "../_lib/utils";
import { cn } from "@/lib/utils";
import {
  PriorityBadge,
  StatusBadge as CustomerStatusBadge,
} from "@/app/(protected)/customer/support/_components/support-badges";

export { PriorityBadge };

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
  return (
    <>
      <CustomerStatusBadge
        status={status}
        label={label}
        className={className}
      />
      {reopened ? (
        <span className={cn(badgeClassName, getStatusClass("reopen"))}>
          {STATUS_LABELS.reopen}
        </span>
      ) : null}
    </>
  );
}

interface SourceBadgeProps {
  source: SupportSource;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const isVendor = source === "vendor";
  const Icon = isVendor ? Store : UserRound;

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold sm:text-[10px]",
        isVendor
          ? "border-indigo-200 bg-indigo-50 text-indigo-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
        className
      )}
    >
      <Icon className="size-2.5 shrink-0" aria-hidden />
      {ADMIN_SOURCE_LABELS[source]}
    </span>
  );
}

interface VenueBadgeProps {
  name: string;
  className?: string;
}

export function VenueBadge({ name, className }: VenueBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 sm:text-[10px]",
        className
      )}
    >
      <Building2 className="size-2.5 shrink-0 text-slate-500" aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

interface BookingBadgeProps {
  bookingRef: string;
  className?: string;
}

export function BookingBadge({ bookingRef, className }: BookingBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-900 sm:text-[10px]",
        className
      )}
    >
      <Ticket className="size-2.5 shrink-0 text-amber-700" aria-hidden />
      <span className="truncate">{bookingRef}</span>
    </span>
  );
}
