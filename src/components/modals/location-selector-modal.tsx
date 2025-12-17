"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocationStore } from "@/store/location.store";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import { VenueLocation } from "@/types/api.types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PageLoader } from "../ui/page-loader";
import { InfoCircledIcon } from "@radix-ui/react-icons";

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectPath?: string;
}

export function LocationSelectorModal({
  isOpen,
  onClose,
  redirectPath = "/vendor/dashboard",
}: LocationSelectorModalProps) {
  const { allLocations, selectedLocation } = useLocationStore();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    selectedLocation?.id || null
  );
  const { mutate: switchLocation, isPending } = useSwitchLocation();
  const router = useRouter();

  // Update selected location when store changes
  useEffect(() => {
    if (selectedLocation?.id) {
      setSelectedLocationId(selectedLocation.id);
    }
  }, [selectedLocation]);

  // Handler for selecting a location
  const handleLocationSelect = (location: VenueLocation) => {
    setSelectedLocationId(location.id);
  };

  // Handler for confirming selection
  const handleConfirm = () => {
    if (!selectedLocationId) return;

    switchLocation(selectedLocationId, {
      onSuccess: () => {
        onClose();
        if (redirectPath) {
          router.push(redirectPath);
        }
      },
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Allow closing via X button but not on outside clicks
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-[600px] p-0 overflow-hidden"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking outside
          e.preventDefault();
        }}
      >
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            Choose a Location
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 px-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">
                Locations are venues where your events are hosted.
              </p>
              <InfoCircledIcon className="h-4 w-4 text-gray-500" />
            </div>
            <Button
              onClick={() => router.push("/vendor/venue-locations/create")}
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white"
            >
              Create New Location
            </Button>
          </div>

          {isPending ? (
            <div className="flex justify-center py-8">
              <PageLoader />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {allLocations && allLocations.length > 0 ? (
                allLocations.map((location) => (
                  <div
                    key={location.id}
                    className={cn(
                      "border rounded-md p-4 cursor-pointer transition-all",
                      selectedLocationId === location.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => handleLocationSelect(location)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-lg">{location.name}</div>
                      {location.is_default && (
                        <div className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">
                          Default
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {location.city || ""}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      ID: {location.id}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    No locations found. Please create a location first.
                  </p>
                  <Button
                    onClick={() =>
                      router.push("/vendor/venue-locations/create")
                    }
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Create New Location
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 p-4 bg-gray-50 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedLocationId || isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
