"use client";

import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { Vendor } from "./vendors-table";

interface EditVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  onSaved?: (vendor: Vendor, data: { name: string; address: string; status: Vendor["status"] }) => void;
}

/**
 * Modal to edit venue/vendor details (name, address, status). Submit is stubbed until API exists.
 */
export function EditVendorModal({
  open,
  onOpenChange,
  vendor,
  onSaved,
}: EditVendorModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<Vendor["status"]>("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setAddress(vendor.address);
      setStatus(vendor.status);
    }
  }, [vendor]);

  const handleOpenChange = (next: boolean) => {
    if (!next && vendor) {
      setName(vendor.name);
      setAddress(vendor.address);
      setStatus(vendor.status);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !name.trim() || !address.trim()) return;
    setIsSubmitting(true);
    // TODO: call API to update vendor
    await new Promise((r) => setTimeout(r, 600));
    const data = { name: name.trim(), address: address.trim(), status };
    onSaved?.({ ...vendor, ...data }, data);
    toast({ title: "Venue updated", description: `${name.trim()} has been updated.` });
    setIsSubmitting(false);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md text-left">
        <DialogHeader>
          <DialogTitle className="title-header text-left text-black">
            Edit venue
          </DialogTitle>
          <DialogDescription className="text-left">
            Update the venue details below. Changes will apply after you save.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-venue-name">Venue name</Label>
            <Input
              id="edit-venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Victoria & Albert Hall"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-venue-address">Address</Label>
            <Input
              id="edit-venue-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as Vendor["status"])}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="event-outline"
              onClick={() => handleOpenChange(false)}
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
                <Pencil className="h-4 w-4" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
