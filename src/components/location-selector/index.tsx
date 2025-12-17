import React from "react";
import { useLocationStore } from "@/store/location.store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";

export function LocationSelector() {
  const { selectedLocation, allLocations } = useLocationStore();
  const { mutate: switchLocation, isPending } = useSwitchLocation();

  // Handle location selection - call the switchLocation API
  const handleLocationChange = async (locationId: number) => {
    if (!locationId) return;

    // Use our new switchLocation hook that handles everything
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
          className="flex items-center gap-2 border-[var(--color-secondary,#009ead)] text-black"
          disabled={isPending}
        >
          <MapPin className="h-4 w-4 text-black" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{selectedLocation.name}</span>
            {selectedLocation.city && (
              <span className="text-xs text-muted-foreground leading-tight">
                {selectedLocation.city}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <div className="py-2 px-3 border-b">
          <span className="text-xs text-muted-foreground">Select location</span>
        </div>
        {allLocations.map((location) => (
          <DropdownMenuItem
            key={location.id}
            onClick={() => handleLocationChange(location.id)}
            className={cn(
              "py-2 cursor-pointer",
              selectedLocation.id === location.id ? "bg-accent" : ""
            )}
            disabled={isPending || selectedLocation.id === location.id}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-[var(--color-secondary,#009ead)]" />
                  <span className="font-medium">
                    {location.city && location.city}
                  </span>
                </div>

                {location.is_default && (
                  <span className="text-xs text-[var(--color-secondary,#009ead)] pl-5">
                    (Default)
                  </span>
                )}
              </div>
              {selectedLocation.id === location.id && (
                <Check className="h-4 w-4 text-[var(--color-secondary,#009ead)]" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
