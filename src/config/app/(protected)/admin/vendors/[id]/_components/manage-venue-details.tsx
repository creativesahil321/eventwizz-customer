"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  Paperclip,
  Pencil,
  LogIn,
  KeyRound,
  LogOut,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatVenueLocationLabel,
  formatVenueLocationLocalityLine,
  formatVenueLocationVenueTitle,
  type VenueDetail,
  type VenueLocation,
  type VenueEventCancellationRequest,
} from "../_lib/types";
import { LoginToVenueModal } from "./login-to-venue-modal";
import { ResetPasswordModal } from "./reset-password-modal";
import { ForceLogoutModal } from "./force-logout-modal";
import { adminVenuesService } from "@/services/admin/venues/venues.service";
import { VenueComments } from "./venue-comments";
import { usePermission } from "@/hooks/usePermission";
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
import { Input } from "@/components/ui/input";
import { adminEventsService } from "@/services/admin/events/admin-events.service";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { VenueCommissionCard } from "./venue-commission-card";

/** Permission key for impersonation — must match backend (e.g. impersonate-vendor). */
const IMPERSONATE_VENDOR_PERMISSION = "impersonate-vendor";

interface ManageVenueDetailsProps {
  venue: VenueDetail;
}

const NOT_PROVIDED = "Not provided";
const NEVER = "Never";

function DomainApprovalActions({
  venueId,
  status,
}: {
  venueId: number;
  status: "pending" | "approved" | "rejected";
}) {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: () => adminVenuesService.acceptDomain(venueId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venueId)],
      });
      // Success/error toasts handled by Axios response interceptor
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => adminVenuesService.rejectDomain(venueId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venueId)],
      });
      // Success/error toasts handled by Axios response interceptor
    },
  });

  const isPending = acceptMutation.isPending || rejectMutation.isPending;

  // Pending: like friend request – Accept (primary) + Reject (secondary)
  if (status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => acceptMutation.mutate()}
          disabled={isPending}
        >
          <CheckCircle2 className="h-4 w-4" />
          Accept
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => rejectMutation.mutate()}
          disabled={isPending}
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </div>
    );
  }

  // Accepted: no action – only display approved domain and badge
  if (status === "approved") {
    return null;
  }

  // Rejected: no action – only show "Rejected" badge inline; do not show Accept here
  if (status === "rejected") {
    return null;
  }

  // Pending: show Accept (primary) + Reject (secondary)
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="default"
        size="sm"
        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        onClick={() => acceptMutation.mutate()}
        disabled={isPending}
      >
        <CheckCircle2 className="h-4 w-4" />
        Accept
      </Button>
    </div>
  );
}

export function ManageVenueDetails({ venue }: ManageVenueDetailsProps) {
  const { formatLocale: formatMoney } = useCurrencyFormat();
  const canImpersonateVendor = usePermission(IMPERSONATE_VENDOR_PERMISSION);

  const recentActivityEvents = venue.recentEvents;

  const defaultLocation = venue.locations[0];
  const [selectedLocationId, setSelectedLocationId] = useState<number>(
    defaultLocation?.id ?? 0,
  );

  const [loginToVenueOpen, setLoginToVenueOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [forceLogoutOpen, setForceLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmVenueName, setConfirmVenueName] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [cancellationRequests, setCancellationRequests] = useState<
    VenueEventCancellationRequest[]
  >(venue.eventCancellationRequests || []);
  const [approvingEventDateId, setApprovingEventDateId] = useState<number | null>(
    null,
  );

  const queryClient = useQueryClient();

  const deleteVenueMutation = useMutation({
    mutationFn: () => adminVenuesService.deleteVenue(venue.id),
    onSuccess: () => {
      // Invalidate venue lists so this disappears from tables
      queryClient.invalidateQueries({ queryKey: ["admin", "venues"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venue.id)],
      });
      setDeleteOpen(false);
    },
  });

  const deleteDisabled =
    confirmVenueName.trim() !== venue.name.trim() ||
    confirmPhrase.trim().toLowerCase() !== "delete this venue" ||
    deleteVenueMutation.isPending;

  const selectedLocation: VenueLocation | undefined =
    venue.locations.find((loc) => loc.id === selectedLocationId) ??
    defaultLocation;

  /** Financial summary for the selected location (or venue fallback) */
  const financialSummary =
    selectedLocation?.financialSummary ?? venue.financialSummary;

  const locationLocalityLine = selectedLocation
    ? formatVenueLocationLocalityLine(selectedLocation)
    : null;

  useEffect(() => {
    setCancellationRequests(venue.eventCancellationRequests || []);
  }, [venue.eventCancellationRequests]);

  const approveCancellationMutation = useMutation({
    mutationFn: (args: { eventId: number; eventDateId: number }) =>
      adminEventsService.approveDateCancellation(args.eventId, args.eventDateId),
    onMutate: (variables) => {
      setApprovingEventDateId(variables.eventDateId);
    },
    onSuccess: (_response, variables) => {
      // Remove approved request immediately from the pending list view
      setCancellationRequests((prev) =>
        prev.filter((request) => request.eventDateId !== variables.eventDateId),
      );
      // Keep server state in sync with view model
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venue.id)],
      });
    },
    onSettled: () => {
      setApprovingEventDateId(null);
    },
  });

  return (
    <div className="flex flex-col gap-6 text-black min-w-0">
      {/* ── 1. Venue overview: compact header + identity + domain + security ── */}
      <Card className="bg-white border-[var(--color-border)] shadow-sm overflow-hidden gap-0 py-0">
        <CardHeader className="py-4 px-4 sm:px-6 border-b border-slate-100">
          <div className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h1 className="text-xl font-bold text-foreground tracking-tight title-header">
              Manage Venue Details
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                asChild
                variant="event-outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
              >
                <Link
                  href={`/admin/vendors/${venue.id}/edit`}
                  className="flex items-center gap-1.5"
                >
                  <Pencil className="h-3 w-3 shrink-0" />
                  <span className="hidden xs:inline sm:inline">Edit</span>
                  <span className="hidden sm:inline"> contact & documents</span>
                </Link>
              </Button>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 px-4 sm:px-6 pb-5 space-y-0">
          {/* Venue identity row */}
          <div className="flex items-start gap-4 pb-4">
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
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  {venue.name}
                </h2>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span>Venue ID: {venue.venueId}</span>
                <span>Subdomain: {venue.subdomain || "—"}</span>
                {venue.domainApprovalRequest && (
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium shrink-0",
                      venue.domainApprovalRequest.status === "approved" &&
                        "bg-emerald-100 text-emerald-700",
                      venue.domainApprovalRequest.status === "rejected" &&
                        "bg-red-100 text-red-600",
                      venue.domainApprovalRequest.status === "pending" &&
                        "bg-amber-100 text-amber-700",
                    )}
                  >
                    {venue.domainApprovalRequest.status === "approved"
                      ? "Accepted"
                      : venue.domainApprovalRequest.status === "rejected"
                        ? "Rejected"
                        : "Pending"}
                  </span>
                )}
              </div>
              {venue.domainApprovalRequest?.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <DomainApprovalActions
                    venueId={venue.id}
                    status="pending"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Login & Security row */}
          <div className="border-t border-slate-100 py-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Last login:{" "}
              <span className="font-medium text-foreground">
                {venue.lastLogin?.trim() ? venue.lastLogin : NEVER}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="event-primary"
                size="sm"
                className="gap-2"
                onClick={() => setResetPasswordOpen(true)}
              >
                <KeyRound className="h-4 w-4" />
                Reset Password
              </Button>
              <Button
                variant="event-outline"
                size="sm"
                className="gap-2"
                onClick={() => setForceLogoutOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                Force Logout
              </Button>
              {venue.status !== "active" && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  aria-label="Delete venue"
                  onClick={() => {
                    setConfirmVenueName("");
                    setConfirmPhrase("");
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Venue
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Two columns: consolidated left cards, right card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Contact & Business + Events & Notes (2 merged cards) */}
        <div className="lg:col-span-2 space-y-6 lg:min-h-0">
          <Card className="bg-white border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base title-header font-semibold text-left">
                Contact & Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Contact
                  </p>
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {venue.contact.name || NOT_PROVIDED}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {venue.contact.email || NOT_PROVIDED}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {venue.contact.phone?.trim()
                      ? venue.contact.phone
                      : NOT_PROVIDED}
                  </p>
                  <p className="min-w-0 break-words">
                    <span className="text-muted-foreground">Address:</span>{" "}
                    {venue.contact.registeredAddress?.trim()
                      ? venue.contact.registeredAddress
                      : NOT_PROVIDED}
                  </p>
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Business
                  </p>
                  <p className="min-w-0">
                    <span className="text-muted-foreground">VAT:</span>{" "}
                    <span className="break-all">
                      {venue.businessDocuments.vatNumber?.trim()
                        ? venue.businessDocuments.vatNumber
                        : NOT_PROVIDED}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">KYC:</span>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        venue.businessDocuments.kycStatus === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : venue.businessDocuments.kycStatus === "rejected"
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {venue.businessDocuments.kycStatus === "verified"
                        ? "Verified"
                        : venue.businessDocuments.kycStatus === "rejected"
                          ? "Rejected"
                          : venue.businessDocuments.kycStatus === "pending"
                            ? "Pending"
                            : "Not submitted"}
                    </span>
                  </p>
                  {venue.businessDocuments.documentUrl ||
                  venue.businessDocuments.documentLabel ? (
                    <Button
                      variant="event-outline"
                      size="sm"
                      className="gap-2 mt-1"
                      onClick={() => {
                        const url = venue.businessDocuments.documentUrl;
                        if (!url) return;
                        if (typeof window !== "undefined") {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <Paperclip className="h-4 w-4" />
                      {venue.businessDocuments.documentLabel ?? "View document"}
                    </Button>
                  ) : (
                    <p className="text-muted-foreground text-xs mt-1">
                      No document uploaded
                    </p>
                  )}
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
              <div className="space-y-5">
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-foreground">
                      Event cancellation requests
                    </p>
                    <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {cancellationRequests.length} request
                      {cancellationRequests.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {cancellationRequests.length > 0 ? (
                    <div className="max-h-[420px] overflow-y-auto overflow-x-hidden rounded-md border border-slate-100 bg-slate-50/30 p-2 pr-1">
                      <ul className="space-y-3 text-sm">
                        {cancellationRequests.map((request) => {
                          const isPending = request.status === "pending_review";
                          const canApprove = isPending && request.actions.canApprove;
                          const isApprovingThis =
                            approveCancellationMutation.isPending &&
                            approvingEventDateId === request.eventDateId;
                          return (
                            <li
                              key={`${request.eventId}-${request.eventDateId}`}
                              className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-3"
                            >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">
                                  {request.eventName}
                                  <span className="text-muted-foreground font-normal">
                                    {" "}
                                    - {request.eventDate}
                                  </span>
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Requested by {request.requestedBy} on{" "}
                                  {request.requestedAt}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium shrink-0",
                                  request.status === "pending_review" &&
                                    "bg-amber-100 text-amber-700",
                                  request.status === "approved" &&
                                    "bg-emerald-100 text-emerald-700",
                                )}
                              >
                                {request.status === "pending_review"
                                  ? "Pending review"
                                  : "Approved"}
                              </span>
                            </div>

                            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2.5">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                                Cancellation reason
                              </p>
                              <p className="text-sm text-foreground leading-relaxed">
                                {request.cancellationReason?.trim()
                                  ? request.cancellationReason
                                  : "No reason provided by vendor."}
                              </p>
                            </div>

                              {canApprove ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button
                                    variant="event-primary"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() =>
                                      approveCancellationMutation.mutate({
                                        eventId: request.eventId,
                                        eventDateId: request.eventDateId,
                                      })
                                    }
                                    disabled={isApprovingThis}
                                  >
                                    {isApprovingThis ? "Approving..." : "Approve"}
                                  </Button>
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No cancellation requests yet.
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Approved live events
                  </p>
                  {recentActivityEvents.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto overflow-x-hidden rounded-md border border-slate-100 bg-slate-50/40 px-2 py-2 pr-1">
                      <ul className="space-y-2.5 text-sm">
                        {recentActivityEvents.map((evt) => (
                          <li
                            key={evt.id}
                            className="rounded-md border border-slate-200/80 bg-white/70 px-3 py-2"
                          >
                            <p className="text-foreground">
                              <span className="font-medium">{evt.title}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                – {evt.date}
                              </span>
                            </p>
                            {evt.locationAddress ? (
                              <p className="mt-1 text-xs text-muted-foreground break-words">
                                {evt.locationAddress}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {venue.recentEvents.length === 0
                        ? "No events added yet."
                        : "No approved live events to show."}
                    </p>
                  )}
                </div>

                {canImpersonateVendor && (
                  <Button
                    variant="event-primary"
                    size="sm"
                    className="gap-2"
                    onClick={() => setLoginToVenueOpen(true)}
                  >
                    <LogIn className="h-4 w-4" />
                    Login as Vendor
                  </Button>
                )}
              </div>
              <div className="border-t border-slate-100 pt-5">
                <VenueComments venueId={venue.id} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: stack cards with normal spacing (no flex spacer — avoid huge gap vs tall left column) */}
        <div className="flex min-h-0 flex-col gap-6">
          <Card className="shrink-0 bg-white border-[var(--color-border)] shadow-sm overflow-hidden">
            {/* Event Location Address section */}
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {venue.locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {formatVenueLocationLabel(loc)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedLocation && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm space-y-1">
                  <p className="font-medium text-foreground">
                    {formatVenueLocationVenueTitle(selectedLocation)}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedLocation.address}
                  </p>
                  {locationLocalityLine && (
                    <p className="text-muted-foreground">
                      {locationLocalityLine}
                    </p>
                  )}
                </div>
              )}
            </CardContent>

            {/* Divider + Financial & Event Summary */}
            <div className="border-t border-slate-200 bg-slate-50/30">
              <CardHeader className="space-y-0 py-5">
                <CardTitle className="text-lg title-header font-semibold text-left">
                  Financial & Event Summary
                </CardTitle>
                {selectedLocation && (
                  <p className="text-xs text-muted-foreground font-normal mt-1 text-left">
                    Per: {formatVenueLocationLabel(selectedLocation)}
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
                      {formatMoney(financialSummary.totalRevenue ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Commission Earned</p>
                    <p className="font-medium mt-0.5">
                      {formatMoney(financialSummary.commissionEarned ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payout Released</p>
                    <p className="font-medium mt-0.5">
                      {formatMoney(financialSummary.payoutReleased ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending commission</p>
                    <p className="font-medium mt-0.5">
                      {formatMoney(financialSummary.pendingCommission ?? 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          <VenueCommissionCard venue={venue} />
        </div>
      </div>

      {/* Modals */}
      <LoginToVenueModal
        open={loginToVenueOpen}
        onOpenChange={setLoginToVenueOpen}
        venueName={venue.name}
        vendorId={venue.vendorId}
        contactEmail={venue.contact.email}
      />
      <ResetPasswordModal
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        venueName={venue.name}
        contactEmail={venue.contact.email}
        vendorId={venue.vendorId}
      />
      <ForceLogoutModal
        open={forceLogoutOpen}
        onOpenChange={setForceLogoutOpen}
        venueName={venue.name}
        vendorId={venue.vendorId}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              Delete venue
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm">
              <p>
                This will permanently disable bookings and access for{" "}
                <span className="font-semibold">{venue.name}</span>. Some data
                may be retained for reporting and auditing.
              </p>
              <p className="font-semibold text-red-600">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                To confirm, type the venue name exactly:
              </Label>
              <Input
                autoFocus
                value={confirmVenueName}
                onChange={(e) => setConfirmVenueName(e.target.value)}
                placeholder={venue.name}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                To confirm, type{" "}
                <span className="font-mono font-semibold">
                  delete this venue
                </span>
              </Label>
              <Input
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="delete this venue"
              />
            </div>
            <p className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <XCircle className="h-4 w-4 shrink-0" />
              Deleting {venue.name} cannot be undone.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteVenueMutation.isPending}
              className="min-w-[96px]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteDisabled}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[130px]"
              onClick={(e) => {
                e.preventDefault();
                if (!deleteDisabled) {
                  deleteVenueMutation.mutate();
                }
              }}
            >
              {deleteVenueMutation.isPending ? "Deleting..." : "Delete Venue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
