/**
 * Vendor Transactions Service
 * Handles API calls related to vendor transaction history
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

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
}

export interface VendorTransactionItem {
  payment_id: number;
  booking_number: string;
  transaction_id: string;
  booking_date: string; // Format: "12-18-2025 05:55PM"
  event_date: string; // Format: "02-14-2026"
  full_name: string;
  email: string;
  card_brand: string;
  cardLast4: string;
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
}

/**
 * Fetch vendor transactions with pagination and filters
 */
export const fetchVendorTransactions = async (
  params: FetchTransactionsParams = {}
): Promise<VendorTransactionsResponse> => {
  const {
    page = 1,
    per_page = 30,
    search = "",
    status = "",
    booking_date = "",
  } = params;

  const endpoint = API_ENDPOINTS.VENDOR.TRANSACTIONS.GET_ALL.replace(
    "{page}",
    String(page)
  )
    .replace("{per_page}", String(per_page))
    .replace("{search}", search)
    .replace("{status}", status)
    .replace("{booking_date}", booking_date);

  return api.get<VendorTransactionsResponse>(endpoint, {
    returnFullResponse: true,
  });
};

/**
 * Export transactions to CSV
 */
export const exportTransactionsCSV = async (
  params: FetchTransactionsParams = {}
): Promise<Blob> => {
  const {
    page = 1,
    per_page = 30,
    search = "",
    status = "",
    booking_date = "",
  } = params;

  // Assuming there's an export endpoint
  const endpoint = API_ENDPOINTS.VENDOR.TRANSACTIONS.GET_ALL.replace(
    "{page}",
    String(page)
  )
    .replace("{per_page}", String(per_page))
    .replace("{search}", search)
    .replace("{status}", status)
    .replace("{booking_date}", booking_date);

  const response = await api.get<Blob>(endpoint, {
    headers: {
      Accept: "text/csv",
    },
    responseType: "blob",
  });

  return response;
};
