"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useAdminDashboard, buildAdminDashboardParams } from "@/services/admin/dashboard";
import DashboardSummary from "./dashboard-summary";
import CustomerOverview from "./customer-overview";
import PerformanceOverview from "./performance-overview";
import SalesHistory from "./sales-history";
import VenuesCommission from "./venues-commission";
import NewCustomers from "./new-customers";
import { PageLoader } from "@/components/ui/page-loader";

function searchParamsToRecord(
  searchParams: ReturnType<typeof useSearchParams>
): Record<string, string | string[] | undefined> {
  if (!searchParams) return {};
  const record: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    const prev = record[key];
    if (prev === undefined) record[key] = value;
    else if (Array.isArray(prev)) prev.push(value);
    else record[key] = [prev, value];
  });
  return record;
}

/** Parsed search for components that need pagination/period (same shape as validations). */
function toParsedSearch(
  search: Record<string, string | string[] | undefined>
) {
  const params = buildAdminDashboardParams(search);
  return {
    period: params.period ?? "monthly",
    from_date: params.from_date ?? "",
    to_date: params.to_date ?? "",
    sales_period: params.sales_period ?? "monthly",
    customer_page: params.customer_page ?? 1,
    customer_per_page: params.customer_per_page ?? 10,
    customer_search: params.customer_search ?? "",
    newly_added_page: params.newly_added_page ?? 1,
    newly_added_per_page: params.newly_added_per_page ?? 10,
    newly_added_search: params.newly_added_search ?? "",
    venues_limit: params.venues_limit ?? 5,
  };
}

export default function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const searchRecord = useMemo(
    () => searchParamsToRecord(searchParams),
    [searchParams]
  );
  const parsedSearch = useMemo(() => toParsedSearch(searchRecord), [searchRecord]);

  const { data: response, isLoading, isError, error } = useAdminDashboard(searchRecord);

  const {
    summaryItems,
    performanceData,
    venueCommissions,
    salesChartData,
    salesPeriod,
    customerOverview,
    newlyAdded,
  } = useMemo(() => {
    const empty = {
      summaryItems: [
        { id: "total_customers", label: "Total Customers", value: 0 },
        { id: "active_customers", label: "Active Customers", value: 0 },
        { id: "disabled_customers", label: "Disabled Customers", value: 0 },
        { id: "support_tickets", label: "Support Tickets", value: 0 },
      ],
      performanceData: {
        totalRevenue: "£0.00",
        commissionEarned: "£0.00",
        commissionPending: "£0.00",
        newCustomers: 0,
        visitors: 0,
      },
      venueCommissions: [] as { id: number; name: string; commission: string; value: number; lastUpdated?: string }[],
      salesChartData: [] as { month: string; sales: number }[],
      salesPeriod: "monthly",
      customerOverview: { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } },
      newlyAdded: { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } },
    };

    if (!response?.status || !response?.data) return empty;

    const d = response.data;
    const summary = d.summary ?? { total_customers: 0, active_customers: 0, disabled_customers: 0 };
    const performance = d.performance_overview ?? {
      total_revenue_formatted: "£0.00",
      admin_commission_formatted: "£0.00",
      commission_pending_formatted: "£0.00",
      new_customers: 0,
    };
    const salesHistory = d.sales_history ?? { period: "monthly", labels: [], data: [] };
    const venuesCommission = d.venues_highest_commission ?? { venues: [], last_updated_formatted: "" };
    const co = d.customer_overview ?? { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } };
    const na = d.newly_added_customers ?? { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } };

    return {
      summaryItems: [
        { id: "total_customers", label: "Total Customers", value: summary.total_customers },
        { id: "active_customers", label: "Active Customers", value: summary.active_customers },
        { id: "disabled_customers", label: "Disabled Customers", value: summary.disabled_customers },
        { id: "support_tickets", label: "Support Tickets", value: 0 },
      ],
      performanceData: {
        totalRevenue: performance.total_revenue_formatted,
        commissionEarned: performance.admin_commission_formatted,
        commissionPending: performance.commission_pending_formatted,
        newCustomers: performance.new_customers,
        visitors: 0,
      },
      venueCommissions: (venuesCommission.venues ?? []).map((venue, index) => ({
        id: index + 1,
        name: venue.venue_name,
        commission: venue.total_commission_formatted,
        value: venue.percentage,
        lastUpdated: venuesCommission.last_updated_formatted,
      })),
      salesChartData: (salesHistory.labels ?? []).map((label, i) => ({
        month: label,
        sales: (salesHistory.data ?? [])[i] ?? 0,
      })),
      salesPeriod: salesHistory.period,
      customerOverview: co,
      newlyAdded: na,
    };
  }, [response]);

  if (isLoading && !response) {
    return <PageLoader />;
  }

  if (isError) {
    return (
      <section className="w-full relative flex flex-col space-y-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error instanceof Error ? error.message : "Failed to load dashboard data."}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full relative flex flex-col space-y-8">
      <section className="w-full relative">
        <DashboardSummary title="Summary" items={summaryItems} />
      </section>

      <section className="w-full relative">
        <PerformanceOverview
          title="Performance Overview"
          data={performanceData}
          period={parsedSearch.period}
        />
      </section>

      <section className="w-full relative">
        <CustomerOverview
          title="Customer Overview"
          data={customerOverview.data}
          pagination={customerOverview.pagination}
          search={parsedSearch}
        />
      </section>

      <section className="w-full gap-6 relative flex flex-col lg:flex-row">
        <section className="w-full lg:w-8/12">
          <SalesHistory sales={salesChartData} period={salesPeriod} />
        </section>
        <section className="w-full lg:w-4/12">
          <VenuesCommission venues={venueCommissions} />
        </section>
      </section>

      <section className="w-full relative">
        <NewCustomers
          customers={newlyAdded.data}
          pagination={newlyAdded.pagination}
          search={parsedSearch}
        />
      </section>
    </section>
  );
}
