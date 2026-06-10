"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import type { LocationData } from "@/types/theme.types";
import { cn } from "@/lib/utils";

const dropdownContentClass =
  "bg-[var(--color-header)] border border-[var(--color-primary)] text-[var(--color-on-header)] p-2 rounded-lg shadow-lg w-48 max-w-[min(100vw-2rem,20rem)]";

function locationLabel(location: LocationData) {
  return location.city?.trim() || "Unknown Location";
}

function getSelectableLocations(locations: LocationData[]): LocationData[] {
  return locations.filter(
    (loc) => typeof loc.slug === "string" && loc.slug.trim().length > 0,
  );
}

/** Location switcher is only useful when guests can pick between 2+ venues. */
function shouldShowLocationSwitcher(locations: LocationData[]): boolean {
  return getSelectableLocations(locations).length > 1;
}

export interface VendorPublicLocationMobileMenuEntriesProps {
  disabled?: boolean;
  onNavigate: () => void;
  mobileNavRowClass: string;
  mobileNavIconWrap: string;
  hoverColorClass: string;
}

/** Same locations as the Locations dropdown, as full-width drawer rows */
export function VendorPublicLocationMobileMenuEntries({
  disabled = false,
  onNavigate,
  mobileNavRowClass,
  mobileNavIconWrap,
  hoverColorClass,
}: VendorPublicLocationMobileMenuEntriesProps) {
  const { settings, isLoading } = useDomain();
  const allLocations = settings?.locations ?? [];
  const selectableLocations = getSelectableLocations(allLocations);

  if (!isLoading && !shouldShowLocationSwitcher(allLocations)) {
    return null;
  }

  if (disabled) {
    return (
      <div
        className={cn(
          mobileNavRowClass,
          "cursor-not-allowed opacity-60",
        )}
      >
        <span className={mobileNavIconWrap} aria-hidden>
          <MapPin />
        </span>
        Locations
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn(mobileNavRowClass, "opacity-70")}>
        <span className={mobileNavIconWrap} aria-hidden>
          <MapPin />
        </span>
        Loading locations...
      </div>
    );
  }

  if (!allLocations.length) {
    return (
      <div className={cn(mobileNavRowClass, "opacity-70")}>
        <span className={mobileNavIconWrap} aria-hidden>
          <MapPin />
        </span>
        No locations available
      </div>
    );
  }

  return (
    <>
      {selectableLocations.map((location, index) => {
        const slug = location.slug?.trim() ?? "";
        const label = locationLabel(location);
        if (!slug) {
          return null;
        }
        return (
          <Link
            key={slug || String(index)}
            href={`/${slug}`}
            className={cn(
              mobileNavRowClass,
              hoverColorClass,
              "transition-colors",
            )}
            onClick={onNavigate}
          >
            <span className={mobileNavIconWrap} aria-hidden>
              <MapPin />
            </span>
            {label}
          </Link>
        );
      })}
    </>
  );
}

export interface VendorPublicLocationBookNowProps {
  pillGlassOnHero: boolean;
  /** Non-interactive chrome (preview / onboarding): show trigger only */
  disabled?: boolean;
  /** Called after navigating to a location (e.g. close mobile drawer) */
  onLocationNavigate?: () => void;
  /** Primary pill control vs compact map icon (e.g. mobile header bar) */
  variant?: "book-now" | "icon";
  /** Extra classes on the Locations trigger (e.g. drawer full width) */
  triggerClassName?: string;
  /** Required for `variant="icon"` — match sibling header controls */
  iconTriggerClassName?: string;
  align?: "start" | "end" | "center";
  /** Override panel width (e.g. `w-full` in mobile drawer) */
  menuContentClassName?: string;
}

export function VendorPublicLocationBookNow({
  pillGlassOnHero,
  disabled = false,
  onLocationNavigate,
  variant = "book-now",
  triggerClassName,
  iconTriggerClassName,
  align = "end",
  menuContentClassName,
}: VendorPublicLocationBookNowProps) {
  const { settings, isLoading } = useDomain();
  const allLocations = settings?.locations ?? [];
  const selectableLocations = getSelectableLocations(allLocations);

  if (!isLoading && !shouldShowLocationSwitcher(allLocations)) {
    return null;
  }

  const bookNowPillClass = cn(
    "!rounded-full h-9 gap-1 border-0 px-4 font-semibold backdrop-blur-sm",
    pillGlassOnHero &&
      "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] ring-1 ring-white/25",
    triggerClassName,
  );

  const body = (
    <>
      <div className="py-1 px-2 text-xs text-[var(--color-on-header)]/70 border-b border-[var(--color-primary)]/30 mb-1">
        Select a location
      </div>
      {isLoading ? (
        <div className="py-2 px-2 text-sm text-[var(--color-on-header)]/70">
          Loading locations...
        </div>
      ) : selectableLocations.length > 0 ? (
        selectableLocations.map((location, index) => {
          const slug = location.slug?.trim() ?? "";
          const label = locationLabel(location);
          if (!slug) return null;
          return (
            <DropdownMenuItem key={slug || String(index)} asChild>
              <Link
                href={`/${slug}`}
                className="flex items-center gap-2 py-2 px-2 hover:bg-[var(--color-primary)]/10 rounded-md text-sm cursor-pointer transition-colors"
                onClick={() => onLocationNavigate?.()}
              >
                <MapPin
                  size={14}
                  className="text-[var(--color-on-header)]/70"
                />
                <span>{label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })
      ) : (
        <div className="py-2 px-2 text-sm text-[var(--color-on-header)]/70">
          No locations available
        </div>
      )}
    </>
  );

  if (disabled) {
    if (variant === "icon") {
      return (
        <div
          className={cn(
            iconTriggerClassName,
            "cursor-not-allowed opacity-60",
          )}
          aria-hidden
        >
          <MapPin className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div
        className={cn(
          bookNowPillClass,
          "inline-flex cursor-not-allowed items-center justify-center gap-1 opacity-60",
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        )}
        aria-hidden
      >
        <span>Locations</span>
        <ChevronDown size={14} />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            className={iconTriggerClassName}
            aria-label="Locations"
          >
            <MapPin className="h-5 w-5" />
          </button>
        ) : (
          <Button
            size="sm"
            variant="event-primary"
            className={bookNowPillClass}
            aria-label="Locations"
          >
            <span>Locations</span>
            <ChevronDown size={14} />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn(dropdownContentClass, menuContentClassName)}
      >
        {body}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
