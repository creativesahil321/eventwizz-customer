"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
  contactEmail: string;
}

/**
 * Modal for "Reset password" – send reset link to venue contact or custom email.
 */
export function ResetPasswordModal({
  open,
  onOpenChange,
  venueName,
  contactEmail,
}: ResetPasswordModalProps) {
  const [email, setEmail] = useState(contactEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChangeWithReset = (next: boolean) => {
    if (!next) setEmail(contactEmail);
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: call API to send reset link to email
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    handleOpenChangeWithReset(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWithReset}>
      <DialogContent className="sm:max-w-md text-left">
        <DialogHeader>
          <DialogTitle className="title-header text-left">
            Reset password
          </DialogTitle>
          <DialogDescription className="text-left">
            Send a password reset link to the vendor for <strong>{venueName}</strong>.
            The link will be sent to the email below; you can change it if needed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email address</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
              required
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="event-outline"
              onClick={() => handleOpenChangeWithReset(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="event-primary" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Send reset link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
