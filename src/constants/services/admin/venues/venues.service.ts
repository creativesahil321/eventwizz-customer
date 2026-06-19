/**
 * Admin venues service – fetches venue list from API.
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminVenuesResponse,
  AdminVenuesParams,
  AdminVenueByIdResponse,
  AdminVenueDomainActionResponse,
  AdminVenueUpdatePayload,
  AdminVenueUpdateResponse,
  AdminVenueCommentsResponse,
  AdminVenueCommentResponse,
  AdminVenueCommentDeleteResponse,
  AdminVenueCommissionUpdatePayload,
  AdminVenueCommissionUpdateResponse,
} from "./type";

function buildUrl(params: AdminVenuesParams): string {
  const base = API_ENDPOINTS.ADMIN.VENUES.ALL;
  const status = params.status ?? "";
  const search = params.search ?? "";
  return base
    .replace("{status}", String(status))
    .replace("{search}", String(search));
}

export const adminVenuesService = {
  /**
   * Fetch venues with optional filters and pagination.
   */
  getVenues: async (
    params: AdminVenuesParams = {}
  ): Promise<AdminVenuesResponse> => {
    const url = buildUrl(params);
    const requestParams: Record<string, string | number> = {};
    if (params.page != null) requestParams.page = params.page;
    if (params.per_page != null) requestParams.per_page = params.per_page;

    return api.get<AdminVenuesResponse>(url, {
      params: Object.keys(requestParams).length ? requestParams : undefined,
      returnFullResponse: true,
    });
  },

  /**
   * Fetch a single venue by ID.
   */
  getVenueById: async (id: number | string): Promise<AdminVenueByIdResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.GET_BY_ID.replace("{id}", String(id));
    return api.get<AdminVenueByIdResponse>(url, { returnFullResponse: true });
  },

  /**
   * Accept domain request for a venue.
   * Calls API approve endpoint; returns { status, message, data: { id, domain_status, status } }.
   */
  acceptDomain: async (
    id: number | string
  ): Promise<AdminVenueDomainActionResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.APPROVE_DOMAIN.replace("{id}", String(id));
    return api.post<AdminVenueDomainActionResponse>(url, {}, { returnFullResponse: true });
  },

  /**
   * Reject domain request for a venue.
   */
  rejectDomain: async (
    id: number | string
  ): Promise<AdminVenueDomainActionResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.DISAPPROVE_DOMAIN.replace("{id}", String(id));
    return api.post<AdminVenueDomainActionResponse>(url, {}, { returnFullResponse: true });
  },

  /**
   * Update contact & business details for a venue.
   * PUT /admin/venues/{id}
   */
  updateVenue: async (
    id: number | string,
    payload: AdminVenueUpdatePayload
  ): Promise<AdminVenueUpdateResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.UPDATE.replace("{id}", String(id));
    return api.put<AdminVenueUpdateResponse>(url, payload, { returnFullResponse: true });
  },

  /**
   * Set per-venue Stripe Connect application fee (custom commission).
   * PUT /admin/venues/{id}/venue-commission
   */
  updateVenueCommission: async (
    id: number | string,
    payload: AdminVenueCommissionUpdatePayload
  ): Promise<AdminVenueCommissionUpdateResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.VENUE_COMMISSION.replace(
      "{id}",
      String(id)
    );
    return api.put<AdminVenueCommissionUpdateResponse>(url, payload, {
      returnFullResponse: true,
    });
  },

  /**
   * Update venue with a document file (multipart/form-data).
   * Same pattern as onboarding/vendor brochure upload: FormData with key business_documents (file) + other fields.
   * PUT /admin/venues/{id} — backend expects file under key business_documents.
   */
  updateVenueWithDocument: async (
    id: number | string,
    payload: Omit<AdminVenueUpdatePayload, "business_documents"> & {
      document: File;
    }
  ): Promise<AdminVenueUpdateResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.UPDATE.replace("{id}", String(id));
    const formData = new FormData();
    // Backend expects the file in payload key business_documents (not document)
    formData.append("business_documents", payload.document);
    formData.append("phone", payload.phone ?? "");
    formData.append("address", payload.address ?? "");
    formData.append("vat_number", payload.vat_number ?? "");
    formData.append("kyc_status", payload.kyc_status ?? "");
    formData.append("domain_status", payload.domain_status ?? "");
    // Unset Content-Type for this request so axios sends multipart/form-data with boundary
    // (api client defaults to application/json, which would serialize the file as {})
    return api.put<AdminVenueUpdateResponse>(url, formData, {
      returnFullResponse: true,
      headers: { "Content-Type": false } as unknown as Record<string, string>,
    });
  },

  /**
   * Soft delete a venue (moves it to trash but can be restored).
   * DELETE /admin/venues/delete/{id}
   */
  deleteVenue: async (id: number | string) => {
    const url = API_ENDPOINTS.ADMIN.VENUES.DELETE.replace("{id}", String(id));
    return api.delete<{ status: boolean; message: string }>(url, {
      returnFullResponse: true,
    });
  },

  // ── Comment system ────────────────────────────────────────────────────────

  /** GET /admin/venues/{id}/comments */
  getComments: async (
    id: number | string
  ): Promise<AdminVenueCommentsResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.COMMENTS.replace("{id}", String(id));
    return api.get<AdminVenueCommentsResponse>(url, { returnFullResponse: true });
  },

  /** POST /admin/venues/{id}/comments */
  addComment: async (
    id: number | string,
    body: string
  ): Promise<AdminVenueCommentResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.COMMENTS.replace("{id}", String(id));
    return api.post<AdminVenueCommentResponse>(url, { body }, { returnFullResponse: true });
  },

  /** DELETE /admin/venues/{id}/comments/{commentId} */
  deleteComment: async (
    id: number | string,
    commentId: number | string
  ): Promise<AdminVenueCommentDeleteResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.COMMENT
      .replace("{id}", String(id))
      .replace("{commentId}", String(commentId));
    return api.delete<AdminVenueCommentDeleteResponse>(url, { returnFullResponse: true });
  },

  /**
   * Generate a new random password for the vendor account and email it to the contact email.
   * POST /admin/venues/{id}/reset-password — {id} is vendor_id (user id), not venue id.
   */
  resetVendorPassword: async (vendorId: number | string) => {
    const url = API_ENDPOINTS.ADMIN.VENUES.RESET_PASSWORD.replace("{id}", String(vendorId));
    return api.post<{ status: boolean; message: string; data?: unknown; errors: unknown[] }>(
      url,
      {},
      { returnFullResponse: true }
    );
  },

  /**
   * Force logout the vendor from all sessions.
   * POST /admin/venues/{id}/force-logout — {id} is vendor_id (user id), not venue id.
   */
  forceVendorLogout: async (vendorId: number | string) => {
    const url = API_ENDPOINTS.ADMIN.VENUES.FORCE_LOGOUT.replace("{id}", String(vendorId));
    return api.post<{ status: boolean; message: string; data?: unknown; errors: unknown[] }>(
      url,
      {},
      { returnFullResponse: true }
    );
  },
};
