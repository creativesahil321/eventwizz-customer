"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2, ShieldAlert } from "lucide-react";
import { useStartImpersonation } from "@/hooks/useImpersonation";

interface LoginToVenueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
  /** Backend vendor (user) id — sent to POST /admin/impersonate/vendor. Not venue.id. */
  vendorId: number;
  contactEmail: string;
}

/**
 * Confirmation dialog for admin impersonation.
 * No password required — backend validates admin authority via their token.
 */
export function LoginToVenueModal({
  open,
  onOpenChange,
  venueName,
  vendorId,
  contactEmail,
}: LoginToVenueModalProps) {
  const startImpersonation = useStartImpersonation();

  const handleConfirm = () => {
    startImpersonation.mutate(
      {
        vendorId,
        vendorName: venueName,
        vendorEmail: contactEmail,
      },
      {
        onSuccess: () => onOpenChange(false),
        // On error keep modal open so user can retry after reading the toast
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-left">
        <DialogHeader>
          <DialogTitle className="title-header text-left text-black flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Login as Vendor
          </DialogTitle>
          <DialogDescription className="text-left">
            You are about to impersonate{" "}
            <strong className="text-foreground">{venueName}</strong> and access
            their vendor dashboard. Your admin session will be preserved and
            restored when you exit.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Vendor</span>
            <span className="font-medium text-foreground">{venueName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{contactEmail}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Session</span>
            <span className="font-medium text-amber-600">
              Tab-scoped (ends on tab close)
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          A banner at the top will show &quot;Viewing as [Vendor]&quot;. Use
          &quot;Back to my account&quot; when you want to return to the admin
          dashboard.
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="event-outline"
            onClick={() => onOpenChange(false)}
            disabled={startImpersonation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            disabled={startImpersonation.isPending}
            className="gap-2"
            onClick={handleConfirm}
          >
            {startImpersonation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Login as Vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
