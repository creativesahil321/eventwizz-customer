/**
 * Admin venues API response types (snake_case from backend).
 */

export interface AdminVenueItem {
  id: number;
  venue_name: string;
  logo: string;
  address: string;
  status: string;
  domain_status?: string;
  live_events: number;
  total_events: number;
  total_bookings: number;
  total_earnings: string;
  total_earnings_raw: number;
  admin_commission: string;
  admin_commission_raw: number;
  commission_pending: string;
  commission_pending_raw: number;
  net_payout: string;
  net_payout_raw: number;
  vendor_id: number;
}

export interface AdminVenuesResponse {
  status: boolean;
  message: string;
  data: AdminVenueItem[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
  };
  total_venues: number;
  errors: unknown[];
}

export interface AdminVenuesParams {
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

/** GET /admin/venues/{id} response (snake_case from backend). */
export interface AdminVenueByIdVenue {
  id: number;
  vendor_id: number;
  venue_name: string;
  logo: string;
  venue_id: string;
  subdomain: string;
  domain?: string;
  domain_status?: string;
  status: string;
}

export interface AdminVenueByIdContact {
  name: string;
  email: string;
  phone: string;
  registered_address: string;
}

export interface AdminVenueByIdBusinessDocuments {
  vat_number: string | null;
  kyc_status: string | null;
  document_url: string | null;
}

export interface AdminVenueByIdRecentEvent {
  id: number;
  event_name: string;
  location_address?: string | null;
  date: string | null;
  event_date_raw: string | null;
  /** When set: draft | pending | approved | rejected | changes_requested (backend contract). */
  approval_status?: string | null;
}

export interface AdminVenueByIdLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  full_address: string;
  status: string;
  status_value: number;
  is_default: boolean;
}

export interface AdminVenueByIdFinancialSummary {
  total_events: number;
  live_events: number;
  total_customers: number;
  total_revenue: number;
  total_revenue_formatted: string;
  commission_earned: number;
  commission_earned_formatted: string;
  pending_commission: number;
  pending_commission_formatted: string;
  payout_released: number;
  payout_released_formatted: string;
  location_id: number;
  per_location_name: string;
  is_default_location: boolean;
}

export interface AdminVenueByIdAdminNotes {
  notes: string | null;
  raw: unknown[];
}

export interface AdminVenueByIdLoginSecurity {
  last_login: string | null;
}

export interface AdminVenueByIdCancellationRequestActions {
  can_approve: boolean;
  can_disapprove: boolean;
}

export interface AdminVenueByIdCancellationRequest {
  event_id: number;
  event_date_id: number;
  event_name: string;
  event_date: string | null;
  event_date_raw: string | null;
  requested_by: string;
  requested_at: string;
  requested_at_raw: string;
  cancellation_reason: string | null;
  status: string;
  actions: AdminVenueByIdCancellationRequestActions;
}

/** Optional: when backend supports domain approval workflow */
export interface AdminVenueByIdDomainApproval {
  requested_domain: string;
  status: "pending" | "approved" | "rejected";
}

export interface AdminVenueByIdData {
  venue: AdminVenueByIdVenue;
  contact_information: AdminVenueByIdContact;
  business_documents: AdminVenueByIdBusinessDocuments;
  recently_added_events: AdminVenueByIdRecentEvent[];
  all_locations: AdminVenueByIdLocation[];
  event_locations: AdminVenueByIdLocation[];
  financial_summary: AdminVenueByIdFinancialSummary;
  admin_notes: AdminVenueByIdAdminNotes;
  event_cancellation_requests?: AdminVenueByIdCancellationRequest[];
  login_security: AdminVenueByIdLoginSecurity;
  domain_approval_request?: AdminVenueByIdDomainApproval;
}

export interface AdminVenueByIdResponse {
  status: boolean;
  message: string;
  data: AdminVenueByIdData;
  errors: unknown[];
}

/** PUT /admin/venues/{id} — update contact & business details. */
export interface AdminVenueUpdatePayload {
  phone?: string;
  address?: string;
  vat_number?: string;
  /** Exact values only: "pending" | "verified" | "rejected" */
  kyc_status?: "verified" | "pending" | "rejected";
  /** Optional; send as object with document_url. Use FormData for file uploads. */
  business_documents?: { document_url?: string };
  /** Exact values only (case-sensitive): "active" | "inactive" */
  domain_status?: "active" | "inactive";
}

export interface AdminVenueUpdateResponse {
  status: boolean;
  message: string;
  data: Partial<AdminVenueByIdData>;
  errors: unknown[];
}

/** Venue comment author (admin user). */
export interface AdminVenueCommentAuthor {
  id: number;
  name: string;
  avatar?: string | null;
}

/** Single venue comment. */
export interface AdminVenueComment {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  author?: AdminVenueCommentAuthor;
}

/** GET /admin/venues/{id}/comments */
export interface AdminVenueCommentsResponse {
  status: boolean;
  message: string;
  data: AdminVenueComment[];
  errors: unknown[];
}

/** POST / PUT /admin/venues/{id}/comments[/{commentId}] */
export interface AdminVenueCommentResponse {
  status: boolean;
  message: string;
  data: AdminVenueComment;
  errors: unknown[];
}

/** DELETE /admin/venues/{id}/comments/{commentId} */
export interface AdminVenueCommentDeleteResponse {
  status: boolean;
  message: string;
  errors: unknown[];
}

/** Response from POST approve/disapprove domain. */
export interface AdminVenueDomainActionData {
  id: number;
  domain_status: string;
  status: string;
}

export interface AdminVenueDomainActionResponse {
  status: boolean;
  message: string;
  data: AdminVenueDomainActionData;
  errors: unknown[];
}
