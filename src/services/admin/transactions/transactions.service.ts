/**
 * Admin Transactions Service
 *
 * GET  /api/v1/admin/transactions
 * GET  /api/v1/admin/transactions/{payment_id}/receipt
 * GET  /api/v1/admin/transactions/export?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminTransactionsExportParams,
  AdminTransactionsParams,
  AdminTransactionsResponse,
} from "./types";

function omitEmptyParams(
  params: Record<string, string | number | undefined>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ) as Record<string, string | number>;
}

export const adminTransactionsService = {
  /**
   * Fetch admin transactions (all vendors) with pagination and filters.
   */
  getTransactions: async (
    params: AdminTransactionsParams = {},
  ): Promise<AdminTransactionsResponse> => {
    const {
      page = 1,
      per_page = 30,
      search = "",
      status = "",
      from_date = "",
      to_date = "",
    } = params;

    return api.get<AdminTransactionsResponse>(
      API_ENDPOINTS.ADMIN.TRANSACTIONS.ALL,
      {
        returnFullResponse: true,
        params: omitEmptyParams({
          page,
          per_page,
          search,
          status,
          from_date,
          to_date,
        }),
      },
    );
  },

  /**
   * Download a single transaction receipt (PDF) by its payment id.
   */
  downloadReceipt: async (paymentId: number | string): Promise<Blob> => {
    const url = API_ENDPOINTS.ADMIN.TRANSACTIONS.RECEIPT.replace(
      "{payment_id}",
      String(paymentId),
    );
    return api.get<Blob>(url, {
      responseType: "blob",
      returnFullResponse: true,
    });
  },

  /**
   * Export transactions as CSV for the given date range (and optional filters).
   */
  exportTransactions: async (
    params: AdminTransactionsExportParams,
  ): Promise<Blob> => {
    return api.get<Blob>(API_ENDPOINTS.ADMIN.TRANSACTIONS.EXPORT_TRANSACTIONS, {
      params: omitEmptyParams({
        from_date: params.from_date,
        to_date: params.to_date,
        search: params.search,
        status:
          params.status && params.status !== "all" ? params.status : undefined,
      }),
      responseType: "blob",
      returnFullResponse: true,
      headers: { Accept: "text/csv" },
    });
  },
};
