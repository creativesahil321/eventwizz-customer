"use client";

import Link from "next/link";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
import {
  useIsPreviewMode,
  usePreviewLocationNavigation,
} from "@/contexts/preview-context";
import { Check } from "lucide-react";
import { useThemeQuery } from "@/hooks/use-theme-query";
import {
  findClosestPreviewThemeRoot,
  readPreviewThemeStyleFromElement,
} from "@/app/(protected)/_shared/sites-essentials/_lib/preview-theme-portal";

/** Elevated surface card — cleaner than the old “Select a location + pin” list. */
const dropdownContentClass =
  "z-[80] max-h-[min(70vh,22rem)] w-[17.5rem] max-w-[min(100vw-2rem,20rem)] overflow-y-auto rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-2 text-[var(--color-text)] shadow-[0_20px_48px_-24px_rgba(0,0,0,0.45)]";

function locationLabel(location: LocationData) {
  return location.city?.trim() || "Unknown Location";
}

function locationEventCount(location: LocationData) {
  return typeof location.total_events === "number" ? location.total_events : 0;
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
  const {
    previewLocations,
    activePreviewLocationSlug,
    onPreviewLocationSelect,
  } = usePreviewLocationNavigation();

  const previewLocationData: LocationData[] = (previewLocations ?? []).map(
    (loc) => ({
      id: loc.id,
      slug: loc.slug,
      city: loc.city,
    }),
  );

  const allLocations =
    previewLocationData.length > 0
      ? previewLocationData
      : (settings?.locations ?? []);
  const selectableLocations = getSelectableLocations(allLocations);
  const isPreviewLocationNav =
    Boolean(onPreviewLocationSelect) && selectableLocations.length > 1;
  const effectivelyDisabled = disabled && !isPreviewLocationNav;

  if (!isLoading && !shouldShowLocationSwitcher(allLocations)) {
    return null;
  }

  if (effectivelyDisabled) {
    return (
      <div className={cn(mobileNavRowClass, "cursor-not-allowed opacity-60")}>
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
        const isActive = activePreviewLocationSlug === slug;

        if (isPreviewLocationNav && onPreviewLocationSelect) {
          return (
            <button
              key={slug || String(index)}
              type="button"
              className={cn(
                mobileNavRowClass,
                hoverColorClass,
                "w-full transition-colors text-left",
                isActive && "font-semibold",
              )}
              onClick={() => {
                onPreviewLocationSelect(slug);
                onNavigate();
              }}
            >
              <span className={mobileNavIconWrap} aria-hidden>
                <MapPin />
              </span>
              <span className="flex-1">{label}</span>
              {isActive ? (
                <Check className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]" />
              ) : null}
            </button>
          );
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
  const { domain, settings, isLoading } = useDomain();
  const { data: liveTheme } = useThemeQuery(domain, settings);
  const isPreviewMode = useIsPreviewMode();
  const {
    previewLocations,
    activePreviewLocationSlug,
    onPreviewLocationSelect,
  } = usePreviewLocationNavigation();
  const hostRef = useRef<HTMLDivElement>(null);
  const [previewThemeStyle, setPreviewThemeStyle] = useState<
    CSSProperties | undefined
  >();

  const syncPreviewThemeStyle = useCallback(() => {
    const root = findClosestPreviewThemeRoot(hostRef.current);
    setPreviewThemeStyle(readPreviewThemeStyleFromElement(root));
  }, []);

  useLayoutEffect(() => {
    if (!isPreviewMode) {
      setPreviewThemeStyle(undefined);
      return;
    }
    syncPreviewThemeStyle();
  }, [isPreviewMode, syncPreviewThemeStyle]);

  const previewLocationData: LocationData[] = (previewLocations ?? []).map(
    (loc) => ({
      id: loc.id,
      slug: loc.slug,
      city: loc.city,
      total_events: loc.total_events,
    }),
  );

  const allLocations =
    previewLocationData.length > 0
      ? previewLocationData
      : liveTheme?.locations || settings?.locations || [];
  const selectableLocations = getSelectableLocations(allLocations);
  const isPreviewLocationNav =
    Boolean(onPreviewLocationSelect) && selectableLocations.length > 1;
  const effectivelyDisabled = disabled && !isPreviewLocationNav;

  if (!isLoading && !shouldShowLocationSwitcher(allLocations)) {
    return null;
  }

  const locationsLabelClass = isPreviewMode
    ? "hidden @md/preview:inline"
    : "inline";

  const bookNowPillClass = cn(
    "!rounded-full h-9 gap-1.5 border-0 !px-3.5 font-semibold backdrop-blur-sm transition-all duration-200",
    "inline-flex shrink-0 items-center justify-center",
    pillGlassOnHero &&
      "shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] ring-1 ring-white/25",
    triggerClassName,
  );

  const itemClass =
    "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-colors duration-200 focus:bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)]";

  const body = (
    <>
      <div className="mb-1.5 border-b border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] px-2.5 pb-2 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-dimmed)]">
        Jump to city
      </div>
      {isLoading ? (
        <div className="px-2.5 py-2 text-sm text-[var(--color-text-dimmed)]">
          Loading locations...
        </div>
      ) : selectableLocations.length > 0 ? (
        selectableLocations.map((location, index) => {
          const slug = location.slug?.trim() ?? "";
          const label = locationLabel(location);
          if (!slug) return null;
          const isActive = activePreviewLocationSlug === slug;
          const eventCount = locationEventCount(location);
          const eventLabel = `${eventCount} event${eventCount === 1 ? "" : "s"}`;

          if (isPreviewLocationNav && onPreviewLocationSelect) {
            return (
              <DropdownMenuItem
                key={slug || String(index)}
                className={cn(
                  itemClass,
                  isActive
                    ? "bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)] font-semibold"
                    : "hover:bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)]",
                )}
                onClick={() => {
                  onPreviewLocationSelect(slug);
                  onLocationNavigate?.();
                }}
              >
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-text)]">
                  {label}
                </span>
                <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-primary-foreground)]">
                  {eventLabel}
                </span>
                {isActive ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary)]" />
                ) : null}
              </DropdownMenuItem>
            );
          }

          return (
            <DropdownMenuItem key={slug || String(index)} asChild>
              <Link
                href={`/${slug}`}
                className={cn(
                  itemClass,
                  "hover:bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)]",
                )}
                onClick={() => onLocationNavigate?.()}
              >
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--color-text)]">
                  {label}
                </span>
                <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-primary-foreground)]">
                  {eventLabel}
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })
      ) : (
        <div className="px-2.5 py-2 text-sm text-[var(--color-text-dimmed)]">
          No locations available
        </div>
      )}
    </>
  );

  if (effectivelyDisabled) {
    if (variant === "icon") {
      return (
        <div
          className={cn(iconTriggerClassName, "cursor-not-allowed opacity-60")}
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
        aria-label="Locations"
        aria-hidden
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className={locationsLabelClass}>Locations</span>
        <ChevronDown size={14} className="opacity-80" />
      </div>
    );
  }

  return (
    <div ref={hostRef} className="contents">
      <DropdownMenu
        onOpenChange={(open) => {
          if (open && isPreviewMode) syncPreviewThemeStyle();
        }}
      >
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
              <MapPin className="h-4 w-4 shrink-0" />
              <span className={locationsLabelClass}>Locations</span>
              <ChevronDown size={14} className="opacity-80" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          style={previewThemeStyle}
          className={cn(dropdownContentClass, menuContentClassName)}
        >
          {body}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
