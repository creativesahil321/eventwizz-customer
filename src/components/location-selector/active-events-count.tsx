import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type LocationActiveEventsCountProps = {
  count?: number | null;
  className?: string;
  /** Compact: "3" with icon. Default: "3 live events" / "No live events". */
  variant?: "default" | "compact";
};

export function formatLiveEventsLabel(count?: number | null): string {
  const value = Number.isFinite(Number(count)) ? Number(count) : 0;
  if (value <= 0) return "No live events";
  if (value === 1) return "1 live event";
  return `${value} live events`;
}

export function LocationActiveEventsCount({
  count,
  className,
  variant = "default",
}: LocationActiveEventsCountProps) {
  const value = Number.isFinite(Number(count)) ? Number(count) : 0;
  const label = formatLiveEventsLabel(value);

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 text-[10px] font-semibold tabular-nums",
          value <= 0
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
          className,
        )}
        title={label}
      >
        <CalendarDays className="size-3 shrink-0" aria-hidden />
        {value <= 0 ? "None" : value}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-slate-500",
        className,
      )}
    >
      <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
