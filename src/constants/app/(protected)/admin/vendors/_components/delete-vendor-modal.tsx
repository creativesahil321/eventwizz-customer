"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { Vendor } from "./vendors-table";

interface DeleteVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  onConfirm?: (vendor: Vendor) => void;
}

/**
 * Confirmation dialog for deleting a venue/vendor. Confirm is stubbed until API exists.
 */
export function DeleteVendorModal({
  open,
  onOpenChange,
  vendor,
  onConfirm,
}: DeleteVendorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!vendor) return;
    setIsSubmitting(true);
    // TODO: call API to delete vendor
    await new Promise((r) => setTimeout(r, 600));
    onConfirm?.(vendor);
    toast({ title: "Venue deleted", description: `${vendor.name} has been removed.` });
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-left title-header">
            Delete venue
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Are you sure you want to delete <strong>{vendor?.name ?? "this venue"}</strong>?
            This action cannot be undone and will remove the venue and its data from the platform.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-3 sm:space-x-0">
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={isSubmitting}
            className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete venue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
