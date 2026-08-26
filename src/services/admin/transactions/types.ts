/**
 * Admin Transactions Service Types
 *
 * GET  /api/v1/admin/transactions
 * GET  /api/v1/admin/transactions/{payment_id}/receipt
 * GET  /api/v1/admin/transactions/export?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
 */

export interface AdminTransactionItem {
  payment_id: number;
  booking_number: string;
  transaction_id: string;
  booking_date: string;
  event_date: string;
  full_name: string;
  email: string;
  card_brand: string | null;
  /** API field (snake_case). */
  card_last4?: string | null;
  /** Legacy camelCase alias some payloads may still send. */
  cardLast4?: string | null;
  /** e.g. stripe | paypal | bank_transfer */
  payment_method?: string | null;
  status: string;
  amount: string;
  platform_fee: string;
}

export interface AdminTransactionsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  /** Single booking day (`YYYY-MM-DD`). Do not send with from_date/to_date. */
  booking_date?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: "booking_date" | "event_date" | "amount" | "platform_fee";
  sort_dir?: "asc" | "desc";
}

export interface AdminTransactionsResponse {
  status: boolean;
  message: string;
  data: AdminTransactionItem[];
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
  earnings_formatted?: string;
}

/** Filters accepted by the transactions CSV export endpoint. Date is required. */
export interface AdminTransactionsExportParams {
  /** Single booking day (`YYYY-MM-DD`). Do not send with from_date/to_date. */
  booking_date?: string;
  /** Inclusive start date, format: YYYY-MM-DD */
  from_date?: string;
  /** Inclusive end date, format: YYYY-MM-DD */
  to_date?: string;
  search?: string;
  status?: string;
}
