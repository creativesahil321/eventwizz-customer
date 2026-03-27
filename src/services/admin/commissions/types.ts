/**
 * Admin commissions API types.
 */

export type CommissionPeriod = "today" | "weekly" | "monthly" | "yearly";
export type CommissionStatusTab = "settled" | "due";
export type PaidStatus = "paid" | "pending";

export interface AdminCommissionsParams {
  period?: CommissionPeriod;
  from_date?: string;
  to_date?: string;
  status?: CommissionStatusTab;
  paid_status?: PaidStatus;
  search?: string;
  per_page?: number;
  page?: number;
}

export interface VendorCommissionBreakdown {
  vendor_id: number;
  vendor_name: string;
  total_commission: number;
  total_commission_formatted: string;
  entries_count: number;
}

export interface CommissionOverview {
  period_start: string;
  period_end: string;
  total_commission_earned: number;
  total_commission_earned_formatted: string;
  total_commission_received: number;
  total_commission_received_formatted: string;
  total_commission_due: number;
  total_commission_due_formatted: string;
  total_revenue: number;
  total_revenue_formatted: string;
  entries_count: number;
  breakdown_by_vendor: VendorCommissionBreakdown[];
}

export type CommissionEntryAction =
  | "Paid"
  | "Pending"
  | "Refunded"
  | "Due (Offline)";

export type CommissionEntryType =
  | "payment_allocation"
  | "refund"
  | "offline";

export interface CommissionEntry {
  id: number;
  s_no: number;
  date: string;
  date_iso: string;
  booking_id: number;
  booking_number: string;
  venue_name: string;
  commission_settled: number;
  commission_settled_formatted: string;
  paid_date: string | null;
  paid_date_iso: string | null;
  action: CommissionEntryAction;
  type: CommissionEntryType;
}

export interface PaginationLinkMeta {
  url: string | null;
  label: string;
  active: boolean;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  links: PaginationLinkMeta[];
  path: string;
}

export interface CommissionsEntries {
  data: CommissionEntry[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

export interface AdminCommissionsData {
  overview: CommissionOverview;
  entries: CommissionsEntries;
}

export interface AdminCommissionsResponse {
  status: boolean;
  message: string;
  data: AdminCommissionsData;
  errors?: string[];
}
