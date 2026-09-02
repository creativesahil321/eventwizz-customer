"use client";

import { useQuery } from "@tanstack/react-query";
import { adminVenuesService } from "@/services/admin/venues/venues.service";
import type { AdminVenueByIdData } from "@/services/admin/venues/type";
import type {
  VenueDetail,
  VenueLocation,
  LocationFinancialSummary,
  VenueEventCancellationRequest,
} from "./types";

function mapDomainStatus(
  value: string | null | undefined
): "pending" | "approved" | "rejected" {
  if (value == null || value === "") return "pending";
  const v = value.toLowerCase().trim();
  // Backend sends "active"/"inactive" from domain_status field
  if (v === "active" || v === "approved" || v === "accepted") return "approved";
  if (v === "inactive" || v === "disapproved" || v === "rejected") return "rejected";
  return "pending";
}

function mapKycStatus(
  value: string | null
): "verified" | "pending" | "rejected" {
  if (value == null || value === "") return "pending";
  const v = value.toLowerCase();
  if (v === "verified") return "verified";
  if (v === "rejected") return "rejected";
  return "pending";
}

function mapFinancialSummary(
  s: AdminVenueByIdData["financial_summary"]
): LocationFinancialSummary {
  return {
    totalEvents: s.total_events,
    totalCustomers: s.total_customers,
    commissionEarned: s.commission_earned,
    pendingCommission: s.pending_commission,
    liveEvents: s.live_events,
    totalRevenue: s.total_revenue,
    payoutReleased: s.payout_released,
  };
}

function mapApiToVenueDetail(data: AdminVenueByIdData): VenueDetail {
  const venue = data.venue;
  const fs = mapFinancialSummary(data.financial_summary);

  const locations: VenueLocation[] = data.all_locations.map((loc) => {
    const financialSummary =
      loc.id === data.financial_summary.location_id ? fs : undefined;
    return {
      id: loc.id,
      name: loc.name,
      address: loc.address,
      city: loc.city,
      financialSummary,
    };
  });

  const adminNotes: string[] = Array.isArray(data.admin_notes.raw)
    ? (data.admin_notes.raw as string[])
    : data.admin_notes.notes
      ? [data.admin_notes.notes]
      : [];

  const eventCancellationRequests: VenueEventCancellationRequest[] =
    data.event_cancellation_requests?.map((req) => ({
      eventId: req.event_id,
      eventDateId: req.event_date_id,
      eventName: req.event_name,
      eventDate: req.event_date ?? req.event_date_raw ?? "—",
      requestedBy: req.requested_by,
      requestedAt: req.requested_at,
      requestedAtRaw: req.requested_at_raw,
      cancellationReason: req.cancellation_reason ?? undefined,
      status:
        req.status === "approved"
          ? "approved"
          : req.status === "disapproved"
          ? "disapproved"
          : "pending_review",
      actions: {
        canApprove: req.actions?.can_approve === true,
        canDisapprove: req.actions?.can_disapprove === true,
      },
    })) ?? [];

  return {
    id: venue.id,
    vendorId: venue.vendor_id,
    venueId: venue.venue_id,
    name: venue.venue_name,
    image: venue.logo,
    status: venue.status === "active" ? "active" : "inactive",
    subdomain: venue.subdomain,
    locations,
    contact: {
      name: data.contact_information.name,
      email: data.contact_information.email,
      phone: data.contact_information.phone ?? "",
      registeredAddress: data.contact_information.registered_address ?? "",
    },
    businessDocuments: {
      vatNumber: data.business_documents.vat_number ?? "",
      kycStatus: mapKycStatus(data.business_documents.kyc_status),
      documentUrl: data.business_documents.document_url ?? undefined,
    },
    recentEvents: data.recently_added_events.map((e) => ({
      id: e.id,
      title: e.event_name,
      date: e.date ?? e.event_date_raw ?? "—",
      locationAddress: e.location_address?.trim() || undefined,
    })),
    eventCancellationRequests,
    adminNotes,
    financialSummary: fs,
    lastLogin: data.login_security.last_login ?? undefined,
    domainApprovalRequest: (() => {
      // API: domain_status "pending" → Accept + Reject; "approved"/"accepted" → Accepted (no action); "disapproved"/"rejected" → Rejected + Accept
      const status = mapDomainStatus(data.venue.domain_status);
      const requestedDomain =
        (data.venue.domain ?? data.venue.subdomain ?? "").trim();
      return {
        requestedDomain,
        status,
      };
    })(),
    commissionSettings: (() => {
      const vc = data.venue_commission;
      if (vc != null && typeof vc === "object" && !Array.isArray(vc)) {
        const modeRaw = vc.mode;
        const mode =
          typeof modeRaw === "string" ? modeRaw.toLowerCase().trim() : "";
        const rawVal = vc.venue_commission_value;
        const numVal =
          typeof rawVal === "number" && Number.isFinite(rawVal) ? rawVal : null;
        if (mode === "percentage" && numVal != null && numVal > 0) {
          return {
            useCustomCommission: true,
            commissionPercentage: numVal,
            commissionFlatFee: null,
          };
        }
        if (mode === "flat" && numVal != null && numVal > 0) {
          return {
            useCustomCommission: true,
            commissionPercentage: null,
            commissionFlatFee: numVal,
          };
        }
      }

      const c = data.commission_settings;
      if (c == null) {
        return {
          useCustomCommission: false,
          commissionPercentage: null,
          commissionFlatFee: null,
        };
      }
      return {
        useCustomCommission: c.use_custom_commission === true,
        commissionPercentage:
          typeof c.commission_percentage === "number"
            ? c.commission_percentage
            : null,
        commissionFlatFee:
          typeof c.commission_flat_fee === "number"
            ? c.commission_flat_fee
            : null,
      };
    })(),
  };
}

export function useAdminVenueById(id: string | null) {
  const query = useQuery({
    queryKey: ["admin", "venue", id],
    queryFn: () => adminVenuesService.getVenueById(id!),
    enabled: id != null && id !== "",
  });

  const venue: VenueDetail | undefined =
    query.data?.data != null ? mapApiToVenueDetail(query.data.data) : undefined;

  return {
    venue,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
