import { Suspense } from "react";
import DashboardSummary from "./_components/dashboard-summary";
import DashboardOrders from "./_components/dashboard-orders";
import DashboardBookingsTable from "./_components/_bookings-table";
import SalesHistory from "./_components/_sales-history";
import BestSales from "./_components/_best-sales";
import { searchParamsCache } from "./_lib/validations";
import {
  fetchAdminDashboardBestSales,
  fetchAdminDashboardOrders,
  fetchAdminDashboardSalesHistory,
  fetchDashboardData,
} from "./_lib/actions";
import { PermissionDebug } from "@/components/permission/PermissionDebug";
import { PageLoader } from "@/components/ui/page-loader";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}
export default async function Page(props: PageProps) {
  const rawSearch = await props.searchParams;
  const parsedSearch = searchParamsCache.parse(rawSearch);
  const [
    { dashboard, orders },
    { data: historyData },
    salesHistory,
    bestSales,
  ] = await Promise.all([
    fetchDashboardData({ status: "active" }),
    fetchAdminDashboardOrders(parsedSearch),
    fetchAdminDashboardSalesHistory(),
    fetchAdminDashboardBestSales(10),
  ]);
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <PermissionDebug />
        <section className="w-full relative flex flex-col space-y-8">
          <section className="w-full relative">
            <DashboardSummary title="Summary" items={dashboard} />
          </section>
          <section className="w-full relative">
            <DashboardOrders title="Orders" orderStatus={orders} />
          </section>
          <section className="w-full relative">
            <DashboardBookingsTable
              initialData={historyData}
              search={parsedSearch}
            />
          </section>
          <section className="w-full gap-6 relative flex flex-col lg:flex-row">
            <section className="w-full lg:w-8/12">
              <SalesHistory sales={salesHistory} />
            </section>
            <section className="w-full lg:w-4/12">
              <BestSales sales={bestSales} />
            </section>
          </section>
        </section>
      </Suspense>
    </>
  );
}
