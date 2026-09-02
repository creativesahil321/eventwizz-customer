"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Location } from "../_lib/types";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Building2,
  CalendarDays,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { addCacheBusting } from "@/lib/image-utils";

interface ViewLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

export default function ViewLocationDialog({
  open,
  onOpenChange,
  location,
}: ViewLocationDialogProps) {
  if (!location) return null;

  const isDefault = Boolean(location.is_default);
  const isHeadquarters = Boolean(location.is_headquarters);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-w-[90vw] text-black max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Location Details</DialogTitle>
          <DialogDescription>
            View details for this venue location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 min-w-0">
          {location.logo && (
            <div className="flex justify-center mb-4">
              <img
                src={addCacheBusting(location.logo, location.updated_at)}
                alt={`${location.name} logo`}
                className="h-20 w-auto object-contain rounded-md"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold break-words min-w-0 flex-1">
              {location.name}
            </h3>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {isHeadquarters ? (
                <Badge className="gap-1 border-0 bg-[var(--color-primary)] px-2.5 py-0.5 text-xs font-semibold text-white shadow-none hover:bg-[var(--color-primary)]">
                  <Building2 className="h-3.5 w-3.5" />
                  Head office
                </Badge>
              ) : null}
              {isDefault ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500 text-emerald-700 flex items-center gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  In use
                </Badge>
              ) : (
                !isHeadquarters && (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground"
                  >
                    Location
                  </Badge>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground break-words">
                  {location.address || "No address provided"}
                </p>
                <p className="text-sm font-medium mt-1">City</p>
                <p className="text-sm text-muted-foreground break-words">
                  {location.city || "No city provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground break-words">
                  {location.email || "No email provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Contact Number</p>
                <p className="text-sm text-muted-foreground break-words">
                  {location.contact_number || "No contact number provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Active Events</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {location.active_events_count ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground break-words">
                  {formatDate(location.created_at) || "Unknown"}
                </p>
                {location.updated_at && (
                  <>
                    <p className="text-sm font-medium mt-1">Last Updated</p>
                    <p className="text-sm text-muted-foreground break-words">
                      {formatDate(location.updated_at)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
