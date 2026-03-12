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

interface ForceLogoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
}

/**
 * Confirmation modal for "Force logout" – log vendor out from all sessions.
 */
export function ForceLogoutModal({
  open,
  onOpenChange,
  venueName,
}: ForceLogoutModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    // TODO: call API to force logout vendor
    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-left title-header">
            Force logout
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            This will log out the vendor for <strong>{venueName}</strong> from
            all devices. They will need to sign in again. Do you want to continue?
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
            Force logout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
