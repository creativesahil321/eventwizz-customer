/**
 * Vendor Transactions Service
 * Handles API calls related to vendor transaction history
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { VendorBookingFilterMeta } from "@/services/vendor/bookings/bookings.service";

export interface VendorTransactionsResponse {
  status: boolean;
  message: string;
  data: VendorTransactionItem[];
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
    per_page: number;
    to: number | null;
    total: number;
    path: string;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
  };
  earnings: string;
  filter_meta?: VendorBookingFilterMeta;
}

export interface VendorTransactionItem {
  payment_id: number;
  booking_number: string;
  transaction_id: string;
  booking_date: string; // Format: "12-18-2025 05:55PM"
  event_date: string; // Format: "02-14-2026"
  full_name: string;
  email: string;
  card_brand: string | null;
  cardLast4: string | null;
  status: string; // "success", "Pending", "failed", etc.
  amount: string; // Format: "3675.00"
  platform_fee: string; // Format: "201.25"
}

export interface FetchTransactionsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  booking_date?: string;
  from?: string;
  to?: string;
  room_id?: number | string;
}

export interface ExportReceiptsPayload {
  from: string;
  to: string;
}

function omitEmptyParams(
  params: Record<string, string | number | undefined>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ) as Record<string, string | number>;
}

/**
 * Fetch vendor transactions with pagination and filters
 */
export const fetchVendorTransactions = async (
  params: FetchTransactionsParams = {},
): Promise<VendorTransactionsResponse> => {
  const {
    page = 1,
    per_page = 30,
    search = "",
    status = "",
    booking_date = "",
    from = "",
    to = "",
    room_id,
  } = params;

  return api.get<VendorTransactionsResponse>(
    API_ENDPOINTS.VENDOR.TRANSACTIONS.GET_ALL,
    {
      returnFullResponse: true,
      params: omitEmptyParams({
        page,
        per_page,
        search,
        status,
        booking_date,
        from,
        to,
        room_id,
      }),
    },
  );
};

/**
 * Get single transaction receipt (PDF/file) by transaction id
 */
export const getSingleReceipt = async (
  id: number | string,
): Promise<Blob> => {
  const url = API_ENDPOINTS.VENDOR.TRANSACTIONS.GET_SINGLE_RECEIPT.replace(
    "{id}",
    String(id),
  );
  const blob = await api.get<Blob>(url, {
    responseType: "blob",
  });
  return blob;
};

/**
 * Export all receipts as CSV for the given date range (payload: from, to)
 */
export const exportAllReceiptsCSV = async (
  payload: ExportReceiptsPayload,
): Promise<Blob> => {
  const { from, to } = payload;
  const response = await api.get<Blob>(
    API_ENDPOINTS.VENDOR.TRANSACTIONS.EXPORT_ALL_RECEIPTS_CSV,
    {
      params: { from, to },
      responseType: "blob",
      headers: { Accept: "text/csv" },
    },
  );
  return response;
};
