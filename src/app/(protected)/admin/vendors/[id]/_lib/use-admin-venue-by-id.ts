"use client";

import { useQuery } from "@tanstack/react-query";
import { adminVenuesService } from "@/services/admin/venues/venues.service";
import type { AdminVenueByIdData } from "@/services/admin/venues/type";
import type { VenueDetail, VenueLocation, LocationFinancialSummary } from "./types";

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

  return {
    id: venue.id,
    venueId: venue.venue_id,
    name: venue.venue_name,
    image: venue.logo,
    status: venue.status === "active" ? "active" : "disabled",
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
      title: e.event_name,
      date: e.date ?? e.event_date_raw ?? "—",
    })),
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
