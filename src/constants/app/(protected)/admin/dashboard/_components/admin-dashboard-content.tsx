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
import { useCurrencyFormat } from "@/hooks/use-currency-format";

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
    vendor_page: params.vendor_page ?? 1,
    vendor_per_page: params.vendor_per_page ?? 10,
    vendor_search: params.vendor_search ?? "",
    newly_added_page: params.newly_added_page ?? 1,
    newly_added_per_page: params.newly_added_per_page ?? 10,
    newly_added_search: params.newly_added_search ?? "",
    venues_limit: params.venues_limit ?? 5,
  };
}

export default function AdminDashboardContent() {
  const { formatLocale: formatTenantMoney } = useCurrencyFormat();
  const searchParams = useSearchParams();
  const searchRecord = useMemo(
    () => searchParamsToRecord(searchParams),
    [searchParams]
  );
  const parsedSearch = useMemo(() => toParsedSearch(searchRecord), [searchRecord]);

  const { data: response, isLoading, isFetching, isError, error } = useAdminDashboard(searchRecord);

  const {
    summaryItems,
    performanceData,
    venueCommissions,
    salesChartData,
    salesPeriod,
    vendorOverview,
    newlyAddedVenues,
  } = useMemo(() => {
    const formatCurrency = (value: number | undefined): string => {
      if (value == null || Number.isNaN(value)) return formatTenantMoney(0);
      return formatTenantMoney(value);
    };

    const empty = {
      summaryItems: [
        { id: "total_vendors", label: "Total Vendors", value: 0 },
        { id: "active_vendors", label: "Active Vendors", value: 0 },
        { id: "disabled_vendors", label: "Disabled Vendors", value: 0 },
      ],
      performanceData: {
        totalRevenue: formatTenantMoney(0),
        commissionEarned: formatTenantMoney(0),
        commissionPending: formatTenantMoney(0),
        newVendors: 0,
      },
      venueCommissions: [] as { id: number; name: string; commission: string; value: number; lastUpdated?: string }[],
      salesChartData: [] as { month: string; sales: number }[],
      salesPeriod: "monthly",
      vendorOverview: { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } },
      newlyAddedVenues: { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } },
    };

    if (!response?.status || !response?.data) return empty;

    const d = response.data;
    const summary = d.summary ?? { total_vendors: 0, active_vendors: 0, disabled_vendors: 0 };
    const performance = d.performance_overview ?? {
      total_revenue: 0,
      admin_commission: 0,
      commission_pending: 0,
      new_vendors: 0,
    };
    const salesHistory = d.sales_history ?? { period: "monthly", labels: [], data: [] };
    const venuesCommission = d.venues_highest_commission ?? { venues: [] };
    const vo = d.vendor_overview ?? { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } };
    const nav = d.newly_added_venues ?? { data: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } };

    return {
      summaryItems: [
        { id: "total_vendors", label: "Total Vendors", value: summary.total_vendors },
        { id: "active_vendors", label: "Active Vendors", value: summary.active_vendors },
        { id: "disabled_vendors", label: "Disabled Vendors", value: summary.disabled_vendors },
      ],
      performanceData: {
        totalRevenue: formatCurrency(performance.total_revenue),
        commissionEarned: formatCurrency(performance.admin_commission),
        commissionPending: formatCurrency(performance.commission_pending),
        newVendors: performance.new_vendors,
      },
      venueCommissions: (venuesCommission.venues ?? []).map((venue, index) => ({
        id: venue.vendor_id ?? index + 1,
        name: venue.venue_name,
        commission: formatCurrency(venue.total_commission),
        value: venue.percentage ?? 0,
        lastUpdated: venuesCommission.last_updated_formatted,
      })),
      salesChartData: (salesHistory.labels ?? []).map((label, i) => ({
        month: label,
        sales: (salesHistory.data ?? [])[i] ?? 0,
      })),
      salesPeriod: salesHistory.period,
      vendorOverview: vo,
      newlyAddedVenues: nav,
    };
  }, [response, formatTenantMoney]);

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
          title="Vendor Overview"
          data={vendorOverview.data}
          pagination={vendorOverview.pagination}
          search={parsedSearch}
        />
      </section>

      <section className="w-full gap-6 relative flex flex-col lg:flex-row">
        <section className="w-full lg:w-8/12">
          <SalesHistory
            sales={salesChartData}
            period={salesPeriod}
            isFetching={isFetching}
          />
        </section>
        <section className="w-full lg:w-4/12">
          <VenuesCommission venues={venueCommissions} />
        </section>
      </section>

      <section className="w-full relative">
        <NewCustomers
          venues={newlyAddedVenues.data}
          pagination={newlyAddedVenues.pagination}
          search={parsedSearch}
        />
      </section>
    </section>
  );
}
