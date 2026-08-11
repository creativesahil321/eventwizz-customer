"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, ChevronDown, Check, XCircle } from "lucide-react";
import { cn, toTitleCase } from "@/lib/utils";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import {
  useLocationsQuery,
  useCurrentLocationId,
} from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import type { VenueLocation } from "@/types/api.types";
import { LocationActiveEventsCount } from "@/components/location-selector/active-events-count";

type LocationSelectorProps = {
  /**
   * `dropdown` — header / desktop (portaled menu).
   * `inline` — mobile sheet/drawer (expands in place; avoids portal z-index fights).
   */
  variant?: "dropdown" | "inline";
  className?: string;
  /** Fired after a location switch is requested (e.g. close the mobile sheet). */
  onLocationSelected?: () => void;
};

export function LocationSelector({
  variant = "dropdown",
  className,
  onLocationSelected,
}: LocationSelectorProps) {
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";
  const [inlineOpen, setInlineOpen] = React.useState(false);

  // Only fetch locations if user is vendor
  const { data: locationsResult } = useLocationsQuery(isVendor);
  const currentLocationId = useCurrentLocationId();
  const { mutate: switchLocation, isPending } = useSwitchLocation();

  // Extract locations from result (support { data, meta } or array)
  const allLocations = React.useMemo(() => {
    if (!locationsResult) return [];
    if (Array.isArray(locationsResult)) return locationsResult;
    return locationsResult.data || [];
  }, [locationsResult]);

  // Find current location from the list
  const selectedLocation = React.useMemo(() => {
    if (!currentLocationId || allLocations.length === 0) return null;
    return (
      allLocations.find((loc) => loc.id === currentLocationId) ||
      allLocations.find((loc) => loc.is_default) ||
      allLocations[0]
    );
  }, [currentLocationId, allLocations]);

  const handleLocationChange = (locationId: number) => {
    if (!locationId || selectedLocation?.id === locationId) return;
    switchLocation(locationId);
    setInlineOpen(false);
    onLocationSelected?.();
  };

  if (!selectedLocation || allLocations.length <= 1) {
    return null;
  }

  const label = toTitleCase(
    selectedLocation.city || selectedLocation.name || "",
  );

  if (variant === "inline") {
    return (
      <div className={cn("w-full min-w-0", className)}>
        <Button
          type="button"
          variant="outline"
          className="flex h-11 w-full items-center gap-2 border-[var(--color-secondary,#009ead)] px-3 text-black"
          disabled={isPending}
          aria-expanded={inlineOpen}
          onClick={() => setInlineOpen((open) => !open)}
        >
          <MapPin className="h-4 w-4 shrink-0 text-black" />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {label}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              inlineOpen && "rotate-180",
            )}
          />
        </Button>

        {inlineOpen ? (
          <ul
            className="mt-2 max-h-[min(50vh,20rem)] space-y-1 overflow-y-auto rounded-lg border bg-white p-1.5 shadow-sm"
            role="listbox"
            aria-label="Select location"
          >
            {allLocations.map((location) => (
              <LocationOption
                key={location.id}
                location={location}
                selected={selectedLocation.id === location.id}
                disabled={isPending}
                onSelect={handleLocationChange}
              />
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex max-w-[200px] items-center gap-2 border-[var(--color-secondary,#009ead)] text-black",
            className,
          )}
          disabled={isPending}
        >
          <MapPin className="h-4 w-4 shrink-0 text-black" />
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <span className="w-full truncate text-sm font-medium">{label}</span>
          </div>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] max-w-[320px]">
        <div className="border-b px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">
            Select location
          </span>
        </div>
        {allLocations.map((location) => (
          <DropdownMenuItem
            key={location.id}
            onClick={() => handleLocationChange(location.id)}
            className={cn(
              "cursor-pointer items-start px-4 py-2.5",
              selectedLocation.id === location.id ? "bg-accent" : "",
            )}
            disabled={isPending || selectedLocation.id === location.id}
          >
            <LocationOptionContent
              location={location}
              selected={selectedLocation.id === location.id}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LocationOption({
  location,
  selected,
  disabled,
  onSelect,
}: {
  location: VenueLocation;
  selected: boolean;
  disabled: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled || selected}
        onClick={() => onSelect(location.id)}
        className={cn(
          "flex w-full items-center rounded-md px-3 py-2.5 text-left transition-colors",
          selected ? "bg-accent" : "hover:bg-muted",
          (disabled || selected) && "cursor-default",
        )}
      >
        <LocationOptionContent location={location} selected={selected} />
      </button>
    </li>
  );
}

function LocationOptionContent({
  location,
  selected,
}: {
  location: VenueLocation;
  selected: boolean;
}) {
  const activeEventsCount = location.active_events_count ?? 0;

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
        <span className="truncate text-sm font-medium">
          {toTitleCase(location.city || location.name || "")}
        </span>
        <LocationActiveEventsCount
          count={activeEventsCount}
          variant="compact"
        />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {location.is_headquarters ? (
          <span className="whitespace-nowrap text-xs font-medium text-[var(--color-primary)]">
            (Head office)
          </span>
        ) : null}
        {location.is_default ? (
          <span className="whitespace-nowrap text-xs font-medium text-[var(--color-secondary,#009ead)]">
            (In use)
          </span>
        ) : null}
        {location.status === false && (
          <Badge
            variant="outline"
            className="flex h-4.5 items-center gap-1 whitespace-nowrap border-red-500 px-2 text-[10px] text-red-600"
          >
            <XCircle className="h-2.5 w-2.5" />
            Inactive
          </Badge>
        )}
        {selected && (
          <Check className="ml-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary,#009ead)]" />
        )}
      </div>
    </div>
  );
}
