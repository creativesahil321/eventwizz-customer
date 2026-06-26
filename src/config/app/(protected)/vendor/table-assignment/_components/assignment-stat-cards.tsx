"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Users } from "lucide-react";

export type AssignmentTotals = {
  totalSeats: number;
  completeGuests: number;
  awaitingGuests: number;
};

type Props = {
  totals: AssignmentTotals;
  filteredCount: number | null;
  totalGuestRows: number;
  className?: string;
  showFilterHint?: boolean;
};

export function AssignmentStatCards({
  totals,
  filteredCount,
  totalGuestRows,
  className,
  showFilterHint = true,
}: Props) {
  const shouldShowFilterHint =
    filteredCount !== null && filteredCount !== totalGuestRows;

  const items: {
    label: string;
    value: number;
    hint: string;
    icon: typeof Users;
    iconBg: string;
    iconColor: string;
    valueColor: string;
  }[] = [
    {
      label: "Total persons",
      value: totals.totalSeats,
      hint: "Sum of booked persons in this list",
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      label: "Customers complete",
      value: totals.completeGuests,
      hint: "Final tables match booked count",
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label: "Awaiting tables",
      value: totals.awaitingGuests,
      hint: "Still need final table numbers",
      icon: AlertCircle,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      valueColor: "text-amber-600",
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Booking History-style summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4 min-h-[72px]"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                stat.iconBg,
                stat.iconColor,
              )}
            >
              <stat.icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p
                className={cn(
                  "truncate text-base font-semibold tabular-nums sm:text-lg",
                  stat.valueColor,
                )}
                aria-label={`${stat.label}: ${stat.value}`}
                title={String(stat.value)}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground" title={stat.hint}>
                {stat.hint}
              </p>
            </div>
          </div>
        ))}
      </div>
      {showFilterHint && shouldShowFilterHint ? (
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          Showing{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {filteredCount}
          </span>{" "}
          of{" "}
          <span className="tabular-nums">{totalGuestRows}</span> customers ·
          Clear search to see everyone.
        </p>
      ) : null}
    </div>
  );
}
