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
import { LogOut, Loader2 } from "lucide-react";
import { adminVenuesService } from "@/services/admin/venues/venues.service";

interface ForceLogoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
  /** Backend vendor (user) id — used for POST force-logout API. */
  vendorId: number;
}

/**
 * Confirmation modal for "Force logout" – log vendor out from all sessions.
 * Toast handled by Axios interceptor.
 */
export function ForceLogoutModal({
  open,
  onOpenChange,
  venueName,
  vendorId,
}: ForceLogoutModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const response = await adminVenuesService.forceVendorLogout(vendorId);
      if (response?.status) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-left title-header flex items-center gap-2">
            <LogOut className="h-5 w-5 text-muted-foreground" />
            Force logout
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            This will log out the vendor for <strong className="text-foreground">{venueName}</strong> from
            all devices. They will need to sign in again with their password.
            <br />
            <br />
            Do you want to continue?
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
              <LogOut className="h-4 w-4" />
            )}
            {isSubmitting ? "Logging out…" : "Force logout"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
