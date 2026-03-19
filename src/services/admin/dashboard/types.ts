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
  vendor_page?: number;
  vendor_per_page?: number;
  vendor_search?: string;
  newly_added_page?: number;
  newly_added_per_page?: number;
  newly_added_search?: string;
  venues_limit?: number; // 1-20
}

export interface AdminDashboardSummary {
  total_vendors: number;
  active_vendors: number;
  disabled_vendors: number;
}

export interface AdminDashboardPerformanceOverview {
  period_start?: string;
  period_end?: string;
  total_revenue: number;
  total_revenue_formatted?: string;
  admin_commission: number;
  admin_commission_formatted?: string;
  commission_pending: number;
  commission_pending_formatted?: string;
  new_vendors: number;
}

export interface AdminDashboardSalesHistory {
  period: string;
  labels: string[];
  data: number[];
}

export interface VenueCommissionItem {
  vendor_id?: number;
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

export interface VendorOverviewRow {
  s_no: number;
  vendor_id: number;
  vendor_name: string;
  total_events: number;
  total_earning: number;
  total_earning_formatted?: string;
  commission_earned: number;
  commission_earned_formatted?: string;
  commission_pending: number;
  commission_pending_formatted?: string;
  action?: { view?: boolean };
}

export interface AdminDashboardVendorOverview {
  data: VendorOverviewRow[];
  pagination: PaginationMeta;
}

export interface NewlyAddedVenueRow {
  s_no: number;
  venue_id: number;
  venue_name: string;
  vendor_name: string;
  vendor_id: number | null;
  register_on: string;
  register_on_iso?: string | null;
  account_status: string;
  total_events: number;
  email: string;
  action?: { view?: boolean };
}

export interface AdminDashboardNewlyAddedVenues {
  data: NewlyAddedVenueRow[];
  pagination: PaginationMeta;
}

export interface AdminDashboardData {
  summary: AdminDashboardSummary;
  performance_overview: AdminDashboardPerformanceOverview;
  sales_history: AdminDashboardSalesHistory;
  venues_highest_commission: AdminDashboardVenuesHighestCommission;
  vendor_overview: AdminDashboardVendorOverview;
  newly_added_venues: AdminDashboardNewlyAddedVenues;
}

export interface AdminDashboardResponse {
  status: boolean;
  message: string;
  data: AdminDashboardData;
  errors?: string[];
}
