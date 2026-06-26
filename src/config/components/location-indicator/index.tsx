"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

export function LocationIndicator({
  className,
  variant = "default",
  showIcon = true,
}: LocationIndicatorProps) {
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

  if (!selectedLocation || !isVendor) {
    return null;
  }

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
        <span className="text-xs text-white">{selectedLocation.city || selectedLocation.name}</span>
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
        <span className="text-sm text-muted-foreground">
          {selectedLocation.city || selectedLocation.name}
        </span>
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
            {selectedLocation.city || selectedLocation.name}
          </span>
          {selectedLocation.city && selectedLocation.name && (
            <span className="text-[10px] text-white/80 leading-tight">
              {selectedLocation.name}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === "light") {
    const locationLabel =
      selectedLocation.city && selectedLocation.name
        ? `${selectedLocation.city} · ${selectedLocation.name}`
        : selectedLocation.city || selectedLocation.name;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:border-blue-600 dark:bg-blue-900/50 dark:text-blue-200",
          className
        )}
      >
        {showIcon && (
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
        )}
        {locationLabel}
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
      <span className="text-sm font-semibold text-white">
        {selectedLocation.city || selectedLocation.name}
      </span>
    </div>
  );
}
