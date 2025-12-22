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
import { useDeleteLocation } from "../_lib/queries";
import { Location } from "../_lib/types";
import { AlertCircle } from "lucide-react";

interface DeleteLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

export default function DeleteLocationDialog({
  open,
  onOpenChange,
  location,
}: DeleteLocationDialogProps) {
  const { mutate: deleteLocation, isPending } = useDeleteLocation();

  const handleDelete = () => {
    deleteLocation(location.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-black">
            <AlertCircle className="h-5 w-5" />
            Delete Location
          </DialogTitle>
          <DialogDescription className="break-words">
            Are you sure you want to delete <strong>{location.name}</strong>
            {location.city && (
              <>
                {" "}
                (<span className="break-words">{location.city}</span>)
              </>
            )}
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-black">
          <div className="border rounded-md p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm font-medium">Location:</p>
              <p className="text-sm break-words">{location.name}</p>

              <p className="text-sm font-medium">City:</p>
              <p className="text-sm break-words">{location.city}</p>

              <p className="text-sm font-medium">Address:</p>
              <p className="text-sm break-words">{location.address || "-"}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Deleting this location will remove it permanently from your account.
            Any events associated with this location will need to be reassigned.
            Default locations cannot be deleted.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="event-outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
