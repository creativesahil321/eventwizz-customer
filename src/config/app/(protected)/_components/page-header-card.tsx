import { cn } from "@/lib/utils";
import {
  AllLocationsBadge,
  LocationScopedTitle,
} from "@/components/location-indicator";

export const PAGE_CARD_CLASS =
  "bg-white rounded-lg border border-[var(--color-border)] shadow-md";

export const PAGE_CARD_PADDING_CLASS = "p-4 sm:p-6";

export function pageCardClassName(className?: string) {
  return cn(PAGE_CARD_CLASS, PAGE_CARD_PADDING_CLASS, className);
}

interface ProtectedPageHeaderProps {
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  /**
   * How this page relates to the header venue selector.
   * - `venue`: title becomes "{City} {title}" via LocationScopedTitle
   * - `all-locations`: shows All locations badge (vendors only)
   * - omit / `none`: leave title as provided
   */
  locationScope?: "venue" | "all-locations" | "none";
}

export function ProtectedPageHeader({
  title,
  description,
  actions,
  className,
  locationScope = "none",
}: ProtectedPageHeaderProps) {
  const titleNode =
    locationScope === "venue" && typeof title === "string" ? (
      <LocationScopedTitle title={title} />
    ) : locationScope === "all-locations" ? (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>{title}</span>
        <AllLocationsBadge />
      </span>
    ) : (
      title
    );

  return (
    <div className={pageCardClassName(className)}>
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-black title-header sm:text-2xl">
            {titleNode}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
