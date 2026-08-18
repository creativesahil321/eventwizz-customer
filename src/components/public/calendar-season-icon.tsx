import type { EventSeasonTheme } from "@/lib/event-season-theme";
import { EVENT_SEASON_THEME_LABEL } from "@/lib/event-season-theme";
import { cn } from "@/lib/utils";

const ICON_CLASS = "h-[11px] w-[11px] shrink-0";

function TreeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M8 2.2 3.6 8.1h2.1L3.4 11.6h9.2L10.3 8.1h2.1L8 2.2Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M8 11.6v2.2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SantaHatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M3.4 11.2c.4-3.4 2.4-6.4 4.8-7.6 1.6 1.8 3.6 4.6 4.2 7.6"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.2 11.4h9.6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <circle cx="8.4" cy="3.2" r="1.15" fill="currentColor" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M8 2.2v11.6M2.2 8h11.6M4.4 4.4l7.2 7.2M11.6 4.4 4.4 11.6"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M8 13.1S3.2 10 3.2 6.7C3.2 5 4.5 3.9 6 3.9c.9 0 1.6.4 2 1.1.4-.7 1.1-1.1 2-1.1 1.5 0 2.8 1.1 2.8 2.8 0 3.3-4.8 6.4-4.8 6.4Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EggIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M8 2.6c-2.4 0-4.4 3.2-4.4 6.4S5.9 13.6 8 13.6s4.4-1.4 4.4-4.6S10.4 2.6 8 2.6Z"
        stroke="currentColor"
        strokeWidth="1.15"
      />
    </svg>
  );
}

function DiyaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M8 2.8c.8 1.1.9 2.2 0 3.2-.9-1-1-2.1 0-3.2Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M3.2 10.2c.8 2.2 2.6 3.2 4.8 3.2s4-1 4.8-3.2H3.2Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrescentIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M10.2 3.2A5.2 5.2 0 1 0 12.6 12 4.4 4.4 0 1 1 10.2 3.2Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrideHeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M8 13.1S3.2 10 3.2 6.7C3.2 5 4.5 3.9 6 3.9c.9 0 1.6.4 2 1.1.4-.7 1.1-1.1 2-1.1 1.5 0 2.8 1.1 2.8 2.8 0 3.3-4.8 6.4-4.8 6.4Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M5.4 7.2h5.2"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PumpkinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={cn(ICON_CLASS, className)}
      aria-hidden
    >
      <path
        d="M3.2 8.4c0-2.6 2.1-4.4 4.8-4.4s4.8 1.8 4.8 4.4-2.1 4.6-4.8 4.6-4.8-2-4.8-4.6Z"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path
        d="M8 4.2c0-1 .5-1.8 1.3-2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M6.2 8.1 7.3 7l.7 1.1.7-1.1 1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const THEME_ICON: Record<
  EventSeasonTheme,
  (props: { className?: string }) => JSX.Element
> = {
  christmas: TreeIcon,
  santa: SantaHatIcon,
  new_year: SparkleIcon,
  valentines: HeartIcon,
  halloween: PumpkinIcon,
  easter: EggIcon,
  diwali: DiyaIcon,
  eid: CrescentIcon,
  pride: PrideHeartIcon,
};

type CalendarSeasonIconProps = {
  theme: EventSeasonTheme;
  className?: string;
};

/** 11px gold line icon — secondary to the date number. */
export function CalendarSeasonIcon({
  theme,
  className,
}: CalendarSeasonIconProps) {
  const Icon = THEME_ICON[theme];
  return (
    <span
      className={cn(
        "pointer-events-none leading-none text-[color:var(--color-primary)]",
        "[[aria-selected=true]_&]:text-[color:var(--color-primary-foreground)]",
        className,
      )}
      title={EVENT_SEASON_THEME_LABEL[theme]}
    >
      <Icon />
    </span>
  );
}
