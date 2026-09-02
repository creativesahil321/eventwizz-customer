/**
 * Admin Transactions Service
 *
 * GET  /api/v1/admin/transactions
 * GET  /api/v1/admin/transactions/{payment_id}/receipt
 * GET  /api/v1/admin/transactions/export
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminTransactionsExportParams,
  AdminTransactionsParams,
  AdminTransactionsResponse,
} from "./types";

const ALLOWED_SORT_BY = new Set([
  "booking_date",
  "event_date",
  "amount",
  "platform_fee",
]);
const ALLOWED_SORT_DIR = new Set(["asc", "desc"]);

function omitEmptyParams(
  params: Record<string, string | number | undefined>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ) as Record<string, string | number>;
}

function dateQueryParams(params: {
  booking_date?: string;
  from_date?: string;
  to_date?: string;
}): { booking_date?: string; from_date?: string; to_date?: string } {
  if (params.booking_date && !params.from_date && !params.to_date) {
    return { booking_date: params.booking_date };
  }

  if (params.from_date && params.to_date) {
    if (params.from_date === params.to_date) {
      return { booking_date: params.from_date };
    }
    return { from_date: params.from_date, to_date: params.to_date };
  }

  if (params.from_date) return { booking_date: params.from_date };
  if (params.to_date) return { booking_date: params.to_date };
  return {};
}

function filterQueryParams(params: {
  search?: string;
  status?: string;
  booking_date?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: AdminTransactionsParams["sort_by"];
  sort_dir?: AdminTransactionsParams["sort_dir"];
}): Record<string, string | number> {
  const search = params.search?.trim().slice(0, 255);
  const status = params.status?.trim().toLowerCase();
  const sortBy =
    params.sort_by && ALLOWED_SORT_BY.has(params.sort_by)
      ? params.sort_by
      : undefined;
  const sortDir =
    params.sort_dir && ALLOWED_SORT_DIR.has(params.sort_dir)
      ? params.sort_dir
      : undefined;

  return omitEmptyParams({
    search: search || undefined,
    status: status || undefined,
    ...dateQueryParams(params),
    sort_by: sortBy,
    sort_dir: sortBy ? sortDir : undefined,
  });
}

export function buildAdminTransactionQuery(
  params: AdminTransactionsParams,
): Record<string, string | number> {
  return omitEmptyParams({
    page: Math.max(1, params.page ?? 1),
    per_page: Math.min(100, Math.max(1, params.per_page ?? 30)),
    ...filterQueryParams(params),
  });
}

export const adminTransactionsService = {
  /**
   * Fetch admin transactions (all vendors) with pagination and filters.
   */
  getTransactions: async (
    params: AdminTransactionsParams = {},
  ): Promise<AdminTransactionsResponse> => {
    return api.get<AdminTransactionsResponse>(
      API_ENDPOINTS.ADMIN.TRANSACTIONS.ALL,
      {
        returnFullResponse: true,
        params: buildAdminTransactionQuery(params),
      },
    );
  },

  /**
   * Download a single transaction receipt (PDF) by payment id or txn id.
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
   * Export transactions as CSV. Date range (or a single booking_date) is required.
   */
  exportTransactions: async (
    params: AdminTransactionsExportParams,
  ): Promise<Blob> => {
    return api.get<Blob>(API_ENDPOINTS.ADMIN.TRANSACTIONS.EXPORT_TRANSACTIONS, {
      params: filterQueryParams({
        search: params.search,
        status: params.status,
        booking_date: params.booking_date,
        from_date: params.from_date,
        to_date: params.to_date,
      }),
      responseType: "blob",
      returnFullResponse: true,
      headers: { Accept: "text/csv" },
    });
  },
};
