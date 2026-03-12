"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  MessageCircle,
  Bell,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VenueDetail, VenueLocation } from "../_lib/types";
import { adminVenuesService } from "@/services/admin/venues/venues.service";

interface EditVenueFormProps {
  venue: VenueDetail;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const NEVER = "Never";

/**
 * Edit page: same consolidated layout as Manage Venue Details, with Contact
 * and Business Documents editable. Events, notes, location and financials read-only.
 */
export function EditVenueForm({ venue }: EditVenueFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const defaultLocation = venue.locations[0];
  const [selectedLocationId, setSelectedLocationId] = useState<number>(
    defaultLocation?.id ?? 0,
  );
  const [contact, setContact] = useState({
    phone: venue.contact.phone,
    registeredAddress: venue.contact.registeredAddress,
  });
  const [businessDocuments, setBusinessDocuments] = useState({
    vatNumber: venue.businessDocuments.vatNumber,
    kycStatus: venue.businessDocuments.kycStatus,
    documentUrl: venue.businessDocuments.documentUrl ?? "",
    /** "active" = domain approved/enabled, "inactive" = not yet active */
    domainStatus: (
      venue.domainApprovalRequest?.status === "approved" ? "active" : "inactive"
    ) as "active" | "inactive",
  });

  const selectedLocation: VenueLocation | undefined =
    venue.locations.find((loc) => loc.id === selectedLocationId) ??
    defaultLocation;
  const financialSummary =
    selectedLocation?.financialSummary ?? venue.financialSummary;

  const updateMutation = useMutation({
    mutationFn: () =>
      adminVenuesService.updateVenue(venue.id, {
        phone: contact.phone || undefined,
        address: contact.registeredAddress || undefined,
        vat_number: businessDocuments.vatNumber || undefined,
        kyc_status: businessDocuments.kycStatus,
        business_documents: businessDocuments.documentUrl
          ? { document_url: businessDocuments.documentUrl }
          : undefined,
        domain_status: businessDocuments.domainStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venue.id)],
      });
      router.push(`/admin/vendors/${venue.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-6 text-black min-w-0">
      {/* ── 1. Top card: back, title, actions, venue identity (read-only) ── */}
      <Card className="bg-white border-[var(--color-border)] shadow-sm overflow-hidden gap-0 py-0">
        <CardHeader className="py-4 px-4 sm:px-6 border-b border-slate-100">
          <div className="flex flex-row flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col gap-2 min-w-0">
              <Button variant="ghost" size="sm" className="gap-2 w-fit" asChild>
                <Link href={`/admin/vendors/${venue.id}`}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to venue
                </Link>
              </Button>
              <CardTitle className="text-xl title-header font-bold text-left mb-0">
                Edit venue
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {venue.domainApprovalRequest?.status === "approved" && venue.subdomain && (
                <Button
                  asChild
                  variant="event-primary"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                >
                  <a
                    href={`https://${venue.subdomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="hidden sm:inline">View Public Page</span>
                    <span className="sm:hidden">View</span>
                  </a>
                </Button>
              )}
              <span
                className="hidden sm:inline-block w-px h-4 bg-slate-200 mx-0.5"
                aria-hidden
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Messages"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 px-4 sm:px-6 pb-5">
          <div className="flex items-start gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <Image
                src={venue.image}
                alt={venue.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {venue.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span>Venue ID: {venue.venueId}</span>
                <span>Subdomain: {venue.subdomain || "—"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Contact & Business (editable) + Events & Notes (read-only) ── */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-[var(--color-border)] shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base title-header font-semibold text-left">
                  Contact & Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ── Contact (left) ── */}
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Contact
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-name" className="text-sm">
                          Name
                        </Label>
                        <Input
                          id="contact-name"
                          value={venue.contact.name}
                          readOnly
                          className="text-sm bg-muted cursor-not-allowed"
                          aria-readonly="true"
                        />
                        <p className="text-xs text-muted-foreground">
                          Contact name cannot be changed here.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-email" className="text-sm">
                          Email
                        </Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={venue.contact.email}
                          readOnly
                          className="text-sm bg-muted cursor-not-allowed"
                          aria-readonly="true"
                        />
                        <p className="text-xs text-muted-foreground">
                          Contact email cannot be changed here.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-phone" className="text-sm">
                          Phone
                        </Label>
                        <Input
                          id="contact-phone"
                          value={contact.phone}
                          onChange={(e) =>
                            setContact((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="+44 ..."
                          disabled={updateMutation.isPending}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-address" className="text-sm">
                          Registered Address
                        </Label>
                        <Input
                          id="contact-address"
                          value={contact.registeredAddress}
                          onChange={(e) =>
                            setContact((prev) => ({
                              ...prev,
                              registeredAddress: e.target.value,
                            }))
                          }
                          placeholder="Full registered address"
                          disabled={updateMutation.isPending}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Business (right) ── */}
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Business
                    </p>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="vat-number" className="text-sm">
                          VAT Number
                        </Label>
                        <Input
                          id="vat-number"
                          value={businessDocuments.vatNumber}
                          onChange={(e) =>
                            setBusinessDocuments((prev) => ({
                              ...prev,
                              vatNumber: e.target.value,
                            }))
                          }
                          placeholder="e.g. 22AABBCC1234K1Z2"
                          disabled={updateMutation.isPending}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">KYC Status</Label>
                        <Select
                          value={businessDocuments.kycStatus}
                          onValueChange={(v) =>
                            setBusinessDocuments((prev) => ({
                              ...prev,
                              kycStatus:
                                v as VenueDetail["businessDocuments"]["kycStatus"],
                            }))
                          }
                          disabled={updateMutation.isPending}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            businessDocuments.kycStatus === "verified" &&
                              "bg-emerald-100 text-emerald-700",
                            businessDocuments.kycStatus === "pending" &&
                              "bg-amber-100 text-amber-700",
                            businessDocuments.kycStatus === "rejected" &&
                              "bg-red-100 text-red-600",
                          )}
                        >
                          {businessDocuments.kycStatus === "verified"
                            ? "Verified"
                            : businessDocuments.kycStatus === "pending"
                              ? "Pending"
                              : "Rejected"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="domain-status" className="text-sm">
                          Domain Status
                        </Label>
                        <Select
                          value={businessDocuments.domainStatus}
                          onValueChange={(v) =>
                            setBusinessDocuments((prev) => ({
                              ...prev,
                              domainStatus: v as "active" | "inactive",
                            }))
                          }
                          disabled={updateMutation.isPending}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="document-url" className="text-sm">
                          Document URL (optional)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="document-url"
                            value={businessDocuments.documentUrl}
                            onChange={(e) =>
                              setBusinessDocuments((prev) => ({
                                ...prev,
                                documentUrl: e.target.value,
                              }))
                            }
                            placeholder="vendor/documents/file.pdf"
                            disabled={updateMutation.isPending}
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="event-outline"
                            size="icon"
                            aria-label="Attach document"
                            disabled={updateMutation.isPending}
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Must end in .pdf — max 500 chars.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-[var(--color-border)] shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base title-header font-semibold text-left">
                  Events & Admin Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Recently added events
                  </p>
                  {venue.recentEvents.length > 0 ? (
                    <ul className="space-y-2.5 text-sm">
                      {venue.recentEvents.map((evt, i) => (
                        <li key={i}>
                          {evt.title} – {evt.date}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No events added yet.
                    </p>
                  )}
                  <Button
                    variant="event-outline"
                    size="sm"
                    className="mt-3 gap-2"
                    asChild
                  >
                    <Link href={`/admin/vendors/${venue.id}`}>
                      View full venue details
                    </Link>
                  </Button>
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Admin notes
                  </p>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {venue.adminNotes.length
                      ? venue.adminNotes.map((n, i) => (
                          <span key={i}>
                            • {n}
                            {"\n"}
                          </span>
                        ))
                      : "No notes yet."}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2" asChild>
                    <Link href={`/admin/vendors/${venue.id}`}>
                      Add or edit notes on venue page
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Location + Financial Summary (single merged card, read-only) ── */}
          <div className="space-y-0">
            <Card className="bg-white border-[var(--color-border)] shadow-sm overflow-hidden">
              <CardHeader className="space-y-0 pb-5">
                <CardTitle className="text-lg title-header font-semibold text-left">
                  Event Location Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-medium">
                    Location
                  </Label>
                  <Select
                    value={String(selectedLocationId)}
                    onValueChange={(v) => setSelectedLocationId(Number(v))}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {venue.locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedLocation && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm space-y-1">
                    <p className="font-medium text-foreground">
                      {selectedLocation.name}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedLocation.address}
                    </p>
                    {(selectedLocation.city || selectedLocation.postcode) && (
                      <p className="text-muted-foreground">
                        {[selectedLocation.city, selectedLocation.postcode]
                          .filter(Boolean)
                          .join(", ")}
                        {selectedLocation.country
                          ? `, ${selectedLocation.country}`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>

              <div className="border-t border-slate-200 bg-slate-50/30">
                <CardHeader className="space-y-0 py-5">
                  <CardTitle className="text-lg title-header font-semibold text-left">
                    Financial & Event Summary
                  </CardTitle>
                  {selectedLocation && (
                    <p className="text-xs text-muted-foreground font-normal mt-1 text-left">
                      Per: {selectedLocation.name}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Events</p>
                      <p className="font-medium mt-0.5">
                        {financialSummary.totalEvents}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Live Events</p>
                      <p className="font-medium mt-0.5">
                        {financialSummary.liveEvents}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Customers</p>
                      <p className="font-medium mt-0.5">
                        {financialSummary.totalCustomers}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Revenue</p>
                      <p className="font-medium mt-0.5">
                        {formatCurrency(financialSummary.totalRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Commission Earned</p>
                      <p className="font-medium mt-0.5">
                        {formatCurrency(financialSummary.commissionEarned)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payout Released</p>
                      <p className="font-medium mt-0.5">
                        {formatCurrency(financialSummary.payoutReleased)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        Pending commission
                      </p>
                      <p className="font-medium mt-0.5">
                        {formatCurrency(financialSummary.pendingCommission)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="border-t border-slate-100 py-4 px-4 sm:px-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Last login:{" "}
                  {venue.lastLogin?.trim() ? venue.lastLogin : NEVER}
                </p>
                <Button variant="event-outline" size="sm" className="gap-2" asChild>
                  <Link href={`/admin/vendors/${venue.id}`}>
                    Manage login & security
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="event-outline" asChild>
            <Link href={`/admin/vendors/${venue.id}`}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            variant="event-primary"
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
