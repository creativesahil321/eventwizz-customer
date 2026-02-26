import { Suspense } from "react";
import { searchParamsCache } from "../../vendor/dashboard/_lib/validations";
import {
  fetchAdminDashboardBestSales,
  fetchAdminDashboardSalesHistory,
  fetchDashboardData,
} from "./_lib/actions";
import DashboardSummary from "./_components/dashboard-summary";
import CustomerOverview from "./_components/customer-overview";
import PerformanceOverview from "./_components/performance-overview";
import SalesHistory from "./_components/sales-history";
import VenuesCommission from "./_components/venues-commission";
import NewCustomers from "./_components/new-customers";
import { PageLoader } from "@/components/ui/page-loader";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function Page(props: PageProps) {
  const rawSearch = await props.searchParams;
  const parsedSearch = searchParamsCache.parse(rawSearch);

  // Fetch all required data in parallel
  const [
    { dashboard },
    // Skip unused value
    salesHistory,
    bestVenues,
    customerData,
    performanceData,
    newCustomers,
  ] = await Promise.all([
    fetchDashboardData({ status: "active" }),
    fetchAdminDashboardSalesHistory(),
    fetchAdminDashboardBestSales(5),
    fetchCustomerOverviewData(),
    fetchPerformanceData(),
    fetchNewCustomersData(),
  ]);

  // Transform dashboard data to match expected SummaryItem format
  const summaryItems = [
    { id: "total_customers", label: "Total Customers", value: 12 },
    { id: "active_customers", label: "Active Customers", value: 10 },
    { id: "disabled_customers", label: "Disabled Customers", value: 2 },
    { id: "support_tickets", label: "Support Tickets", value: 9 },
  ];

  // Transform venue data to match VenueCommission format
  const venueCommissions = bestVenues.map((venue, index) => ({
    id: index + 1,
    name: venue.venue_name,
    commission: venue.price,
    value: 80 - index * 15, // Calculate a decreasing value for progress bars
  }));

  return (
    <Suspense fallback={<PageLoader />}>
      <section className="w-full relative flex flex-col space-y-8">
        {/* Summary Section */}
        <section className="w-full relative">
          <DashboardSummary title="Summary" items={summaryItems} />
        </section>

        {/* Performance Overview */}
        <section className="w-full relative">
          <PerformanceOverview
            title="Performance Overview"
            data={performanceData}
          />
        </section>

        {/* Customer Overview Table */}
        <section className="w-full relative">
          <CustomerOverview
            title="Customer Overview"
            data={customerData}
            search={parsedSearch}
          />
        </section>

        {/* Sales History and Venues Commission */}
        <section className="w-full gap-6 relative flex flex-col lg:flex-row">
          <section className="w-full lg:w-8/12">
            <SalesHistory sales={salesHistory} />
          </section>
          <section className="w-full lg:w-4/12">
            <VenuesCommission venues={venueCommissions} />
          </section>
        </section>

        {/* Newly Added Customers */}
        <section className="w-full relative">
          <NewCustomers customers={newCustomers} />
        </section>
      </section>
    </Suspense>
  );
}

// Placeholder functions - replace these with your actual data fetching functions
async function fetchCustomerOverviewData() {
  // Fetch customer overview data from your API
  return [
    {
      id: 1,
      name: "Blazing Steaks",
      totalEvents: 20,
      totalCommission: "£1000.00",
      totalEarning: "£10000.00",
      commissionEarned: "£1000.00",
      commissionPending: "£0.00",
    },
    {
      id: 2,
      name: "Marvel Lake",
      totalEvents: 15,
      totalCommission: "£1000.00",
      totalEarning: "£8000.00",
      commissionEarned: "£1000.00",
      commissionPending: "£0.00",
    },
    {
      id: 3,
      name: "Amazon Gardens",
      totalEvents: 30,
      totalCommission: "£1000.00",
      totalEarning: "£12000.00",
      commissionEarned: "£1000.00",
      commissionPending: "£0.00",
    },
  ];
}

async function fetchPerformanceData() {
  // Fetch performance metrics
  return {
    totalRevenue: "£9000",
    commissionEarned: "£900",
    newCustomers: 2,
    visitors: 4,
  };
}

async function fetchNewCustomersData() {
  // Fetch newly added customers
  return [
    {
      id: 1,
      name: "Diana Brook",
      registerOn: "14/05/2023",
      status: "Active",
      totalEvents: 5,
      email: "hello@pixel.com",
    },
    {
      id: 2,
      name: "Diana Brook",
      registerOn: "12/05/2023",
      status: "Active",
      totalEvents: 7,
      email: "hello@pixel.com",
    },
    {
      id: 3,
      name: "Diana Brook",
      registerOn: "11/05/2023",
      status: "Active",
      totalEvents: 4,
      email: "hello@pixel.com",
    },
    {
      id: 4,
      name: "Diana Brook",
      registerOn: "10/05/2023",
      status: "Active",
      totalEvents: 3,
      email: "hello@pixel.com",
    },
  ];
}
