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
import { KeyRound, Loader2 } from "lucide-react";
import { adminVenuesService } from "@/services/admin/venues/venues.service";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
  contactEmail: string;
  /** Backend vendor (user) id — used for POST reset-password API. */
  vendorId: number;
}

/**
 * Confirmation modal for "Reset password" – generate random password and email it to the vendor.
 * Toast handled by Axios interceptor.
 */
export function ResetPasswordModal({
  open,
  onOpenChange,
  venueName,
  contactEmail,
  vendorId,
}: ResetPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const response = await adminVenuesService.resetVendorPassword(vendorId);
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
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            Reset vendor password
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Are you sure you want to generate a new random password for the
            vendor account <strong className="text-foreground">{venueName}</strong>?
            <br />
            <br />
            The new password will be sent to{" "}
            <strong className="text-foreground">{contactEmail}</strong>. The
            vendor will need to use it to sign in. This action cannot be undone.
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
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {isSubmitting ? "Sending…" : "Generate & email password"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
