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
import { LogIn, Loader2 } from "lucide-react";

interface LoginToVenueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
  /** Vendor contact email, pre-filled for impersonation */
  contactEmail: string;
}

/**
 * Modal for "Login as Vendor" – admin enters vendor credentials to impersonate the vendor account.
 */
export function LoginToVenueModal({
  open,
  onOpenChange,
  venueName,
  contactEmail,
}: LoginToVenueModalProps) {
  const [email, setEmail] = useState(contactEmail);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChangeWithReset = (next: boolean) => {
    if (!next) {
      setEmail(contactEmail);
      setPassword("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    // TODO: call API to impersonate vendor (e.g. admin login-as-vendor with email/password, returns token or redirect URL)
    await new Promise((r) => setTimeout(r, 800));
    setIsSubmitting(false);
    handleOpenChangeWithReset(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWithReset}>
      <DialogContent className="sm:max-w-md text-left">
        <DialogHeader>
          <DialogTitle className="title-header text-left text-black">
            Login as Vendor
          </DialogTitle>
          <DialogDescription className="text-left">
            Enter the vendor credentials for <strong>{venueName}</strong> to
            impersonate their account and access the vendor dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-email">Vendor email</Label>
            <Input
              id="vendor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
              required
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-password">Vendor password</Label>
            <Input
              id="vendor-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
              autoComplete="current-password"
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
            <Button
              type="submit"
              variant="event-primary"
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Login as Vendor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
