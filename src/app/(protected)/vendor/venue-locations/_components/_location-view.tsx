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
  Globe,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import Image from "next/image";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] text-black">
        <DialogHeader>
          <DialogTitle>Location Details</DialogTitle>
          <DialogDescription>
            View details for this venue location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {location.logo && (
            <div className="flex justify-center mb-4">
              <Image
                src={location.logo}
                alt={`${location.name} logo`}
                width={80}
                height={80}
                className="h-20 w-auto object-contain rounded-md"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{location.name}</h3>
            {isDefault ? (
              <Badge
                variant="outline"
                className="border-green-500 text-green-600 flex items-center gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                Default Location
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Location
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {location.address || "No address provided"}
                </p>
                <p className="text-sm font-medium mt-1">City</p>
                <p className="text-sm text-muted-foreground">
                  {location.city || "No city provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {location.email || "No email provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Contact Number</p>
                <p className="text-sm text-muted-foreground">
                  {location.contact_number || "No contact number provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Globe className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Slug</p>
                <p className="text-sm text-muted-foreground">
                  {location.slug || "No slug provided"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(location.created_at) || "Unknown"}
                </p>
                {location.updated_at && (
                  <>
                    <p className="text-sm font-medium mt-1">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
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
