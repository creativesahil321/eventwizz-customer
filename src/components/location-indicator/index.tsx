"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, toTitleCase } from "@/lib/utils";
import {
  useLocationsQuery,
  useCurrentLocationId,
} from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useSession } from "next-auth/react";

interface LocationIndicatorProps {
  className?: string;
  variant?: "default" | "compact" | "minimal" | "card" | "light";
  showIcon?: boolean;
}

/** Venue the vendor is currently working in, or null for other account types. */
function useSelectedLocation() {
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";

  const { data: locationsResult } = useLocationsQuery(isVendor);
  const currentLocationId = useCurrentLocationId();

  const allLocations = React.useMemo(() => {
    if (!locationsResult) return [];
    if (Array.isArray(locationsResult)) return locationsResult;
    return locationsResult.data || [];
  }, [locationsResult]);

  const selectedLocation = React.useMemo(() => {
    if (!currentLocationId || allLocations.length === 0) return null;
    return (
      allLocations.find((loc) => loc.id === currentLocationId) ||
      allLocations.find((loc) => loc.is_default) ||
      allLocations[0]
    );
  }, [currentLocationId, allLocations]);

  return { selectedLocation: isVendor ? selectedLocation : null, isVendor };
}

/** Short venue label used in page titles, e.g. "Kangra" (always title-cased). */
export function useSelectedLocationLabel(): string | null {
  const { selectedLocation } = useSelectedLocation();
  if (!selectedLocation) return null;
  const raw = selectedLocation.city || selectedLocation.name;
  return raw ? toTitleCase(raw) : null;
}

/** Title-cased city/name for a location record (header dropdown, lists, etc.). */
export function formatLocationLabel(location: {
  city?: string | null;
  name?: string | null;
}): string {
  const raw = location.city || location.name || "";
  return raw ? toTitleCase(raw) : "";
}

/**
 * Page title scoped to the current venue, e.g. `Bristol Events`.
 * Falls back to `fallback` (or `title`) until a venue is known.
 */
export function LocationScopedTitle({
  title,
  fallback,
}: {
  title: string;
  fallback?: string;
}) {
  const label = useSelectedLocationLabel();
  return <>{label ? `${label} ${title}` : (fallback ?? title)}</>;
}

/**
 * Marks a page whose data spans every venue, so vendors do not assume it is
 * filtered by the location chosen in the header. Hidden for non-vendor roles.
 */
export function AllLocationsBadge({ className }: { className?: string }) {
  const { isVendor } = useSelectedLocation();
  if (!isVendor) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
      All locations
    </span>
  );
}

/**
 * Title row for vendor-wide pages: heading + All locations badge.
 * Use inside an h1/h2, or pass `as` via children wrapping.
 */
export function VendorWideTitle({
  title,
  className,
}: {
  title: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <span>{title}</span>
      <AllLocationsBadge />
    </span>
  );
}

export function LocationIndicator({
  className,
  variant = "default",
  showIcon = true,
}: LocationIndicatorProps) {
  const { selectedLocation, isVendor } = useSelectedLocation();

  if (!selectedLocation || !isVendor) {
    return null;
  }

  const cityLabel = selectedLocation.city
    ? toTitleCase(selectedLocation.city)
    : "";
  const nameLabel = selectedLocation.name
    ? toTitleCase(selectedLocation.name)
    : "";
  const primaryLabel = formatLocationLabel(selectedLocation);

  if (variant === "minimal") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "flex items-center gap-1.5 border-white/30 bg-black/70 text-white font-medium px-2.5 py-1 shadow-sm",
          className
        )}
      >
        {showIcon && <MapPin className="h-3 w-3 text-white" />}
        <span className="text-xs text-white">{primaryLabel}</span>
      </Badge>
    );
  }

  if (variant === "card") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 animate-fadeIn",
          className
        )}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
          aria-hidden
        />
        <span className="text-sm text-muted-foreground">{primaryLabel}</span>
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/30 bg-black/70 shadow-sm",
          className
        )}
      >
        {showIcon && (
          <MapPin className="h-3.5 w-3.5 text-white flex-shrink-0" />
        )}
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white leading-tight">
            {primaryLabel}
          </span>
          {cityLabel && nameLabel && cityLabel !== nameLabel ? (
            <span className="text-[10px] text-white/80 leading-tight">
              {nameLabel}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === "light") {
    const locationLabel =
      cityLabel && nameLabel && cityLabel !== nameLabel
        ? `${cityLabel} · ${nameLabel}`
        : primaryLabel;
    return (
      <span
        className={cn(
          "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:border-blue-600 dark:bg-blue-900/50 dark:text-blue-200",
          className
        )}
      >
        {showIcon && (
          <MapPin className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{locationLabel}</span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-white/30 bg-black/70 px-3 py-1.5 shadow-sm",
        className
      )}
    >
      {showIcon && (
        <MapPin className="h-3.5 w-3.5 shrink-0 text-white" />
      )}
      <span className="text-xs text-white/80">Current location:</span>
      <span className="text-sm font-semibold text-white">{primaryLabel}</span>
    </div>
  );
}
