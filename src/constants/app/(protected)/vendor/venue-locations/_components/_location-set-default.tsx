"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Location } from "../_lib/types";
import { useSwitchLocation } from "../_lib/hooks";
import { MapPin } from "lucide-react";

interface SetDefaultLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

export default function SetDefaultLocationDialog({
  open,
  onOpenChange,
  location,
}: SetDefaultLocationDialogProps) {
  // Use the switch location hook
  const { mutate: switchLocation, isPending } = useSwitchLocation();

  const handleSetDefault = () => {
    // Call the switch location API with the location ID
    switchLocation(location.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black">
            Set Default Location
          </DialogTitle>
          <DialogDescription className="break-words">
            Are you sure you want to set
            {location.city && (
              <>
                {" "}
                (<span className="break-words">{location.city}</span>)
              </>
            )}{" "}
            as your default location?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-black">
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{location.name}</p>
              <p className="text-sm text-muted-foreground break-words">
                {location.city}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Switching the default location will update your dashboard, events,
            and other data to reflect the selected location. You can switch back
            at any time.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="event-outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={"event-primary"}
            onClick={handleSetDefault}
            disabled={isPending}
          >
            {isPending ? "Switching..." : "Set as Default"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
