/**
 * Admin dashboard API types.
 * GET /api/v1/admin/dashboard with optional query params.
 */

export type DashboardPeriod = "today" | "weekly" | "monthly" | "yearly";
export type SalesPeriod = "daily" | "weekly" | "monthly";

export interface AdminDashboardParams {
  period?: DashboardPeriod;
  from_date?: string; // Y-m-d
  to_date?: string; // Y-m-d
  sales_period?: SalesPeriod;
  customer_page?: number;
  customer_per_page?: number;
  customer_search?: string;
  newly_added_page?: number;
  newly_added_per_page?: number;
  newly_added_search?: string;
  venues_limit?: number; // 1-20
}

export interface AdminDashboardSummary {
  total_customers: number;
  active_customers: number;
  disabled_customers: number;
}

export interface AdminDashboardPerformanceOverview {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_revenue_formatted: string;
  admin_commission: number;
  admin_commission_formatted: string;
  commission_pending: number;
  commission_pending_formatted: string;
  new_customers: number;
}

export interface AdminDashboardSalesHistory {
  period: string;
  labels: string[];
  data: number[];
}

export interface VenueCommissionItem {
  venue_name: string;
  total_commission: number;
  total_commission_formatted: string;
  percentage: number;
}

export interface AdminDashboardVenuesHighestCommission {
  period_start?: string;
  period_end?: string;
  last_updated?: string;
  last_updated_formatted?: string;
  venues: VenueCommissionItem[];
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface CustomerOverviewRow {
  s_no: number;
  vendor_id: number;
  customer_name: string;
  total_events: number;
  total_earning: number;
  total_earning_formatted: string;
  commission_earned: number;
  commission_earned_formatted: string;
  commission_pending: number;
  commission_pending_formatted: string;
  action?: { view?: boolean };
}

export interface AdminDashboardCustomerOverview {
  data: CustomerOverviewRow[];
  pagination: PaginationMeta;
}

export interface NewlyAddedCustomerRow {
  s_no: number;
  id: number;
  customer_name: string;
  register_on: string;
  register_on_iso?: string;
  account_status: string;
  total_events: number;
  email: string;
  action?: { view?: boolean };
}

export interface AdminDashboardNewlyAddedCustomers {
  data: NewlyAddedCustomerRow[];
  pagination: PaginationMeta;
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary;
  performance_overview: AdminDashboardPerformanceOverview;
  sales_history: AdminDashboardSalesHistory;
  venues_highest_commission: AdminDashboardVenuesHighestCommission;
  customer_overview: AdminDashboardCustomerOverview;
  newly_added_customers: AdminDashboardNewlyAddedCustomers;
}

export interface AdminDashboardResponse {
  status: boolean;
  message: string;
  data: AdminDashboardData;
  errors?: string[];
}
