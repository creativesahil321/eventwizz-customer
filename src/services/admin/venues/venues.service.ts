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

  /** PUT /admin/venues/{id}/comments/{commentId} */
  updateComment: async (
    id: number | string,
    commentId: number | string,
    body: string
  ): Promise<AdminVenueCommentResponse> => {
    const url = API_ENDPOINTS.ADMIN.VENUES.COMMENT
      .replace("{id}", String(id))
      .replace("{commentId}", String(commentId));
    return api.put<AdminVenueCommentResponse>(url, { body }, { returnFullResponse: true });
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
};
