import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, ChevronDown, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import {
  useLocationsQuery,
  useCurrentLocationId,
} from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";

export function LocationSelector() {
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";

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

  // Handle location selection - call the switchLocation API
  const handleLocationChange = async (locationId: number) => {
    if (!locationId) return;
    switchLocation(locationId);
  };

  if (!selectedLocation || allLocations.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-[var(--color-secondary,#009ead)] text-black max-w-[200px]"
          disabled={isPending}
        >
          <MapPin className="h-4 w-4 text-black flex-shrink-0" />
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm font-medium truncate w-full">
              {selectedLocation.city || selectedLocation.name}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-1 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px] max-w-[260px]">
        <div className="py-2.5 px-4 border-b">
          <span className="text-xs text-muted-foreground font-medium">
            Select location
          </span>
        </div>
        {allLocations.map((location) => (
          <DropdownMenuItem
            key={location.id}
            onClick={() => handleLocationChange(location.id)}
            className={cn(
              "py-2.5 px-4 cursor-pointer",
              selectedLocation.id === location.id ? "bg-accent" : "",
            )}
            disabled={isPending || selectedLocation.id === location.id}
          >
            <div className="flex items-center justify-between w-full gap-3 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" />
                <span className="font-medium text-sm truncate">
                  {location.city || location.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {location.is_default && (
                  <span className="text-xs text-[var(--color-secondary,#009ead)] whitespace-nowrap font-medium">
                    (Default)
                  </span>
                )}
                {location.status === false && (
                  <Badge
                    variant="outline"
                    className="border-red-500 text-red-600 flex items-center gap-1 h-4.5 px-2 text-[10px] whitespace-nowrap"
                  >
                    <XCircle className="h-2.5 w-2.5" />
                    Inactive
                  </Badge>
                )}
                {selectedLocation.id === location.id && (
                  <Check className="h-4 w-4 text-[var(--color-secondary,#009ead)] flex-shrink-0 ml-0.5" />
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
