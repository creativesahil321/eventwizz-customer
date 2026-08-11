import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type LocationActiveEventsCountProps = {
  count?: number | null;
  className?: string;
  /** Compact: "3" with icon. Default: "3 active events". */
  variant?: "default" | "compact";
};

export function LocationActiveEventsCount({
  count,
  className,
  variant = "default",
}: LocationActiveEventsCountProps) {
  const value = Number.isFinite(Number(count)) ? Number(count) : 0;

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-1.5 text-[10px] font-semibold tabular-nums text-[var(--color-primary)]",
          className,
        )}
        title={`${value} active event${value === 1 ? "" : "s"}`}
      >
        <CalendarDays className="size-3 shrink-0" aria-hidden />
        {value}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] tabular-nums text-slate-500",
        className,
      )}
    >
      <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
      {value} active event{value === 1 ? "" : "s"}
    </span>
  );
}
