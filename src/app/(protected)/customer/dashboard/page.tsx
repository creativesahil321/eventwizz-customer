import { Suspense } from "react";
import CustomerDashboardContent from "./_components/dashboard-content";
import { CustomerDashboardSkeleton } from "./_components/customer-dashboard-skeleton";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={<CustomerDashboardSkeleton />}>
      <section className="relative flex w-full flex-col space-y-4 sm:space-y-6 lg:space-y-8">
        <ProtectedPageHeader
          title="Customer Dashboard"
          description="Welcome back! Manage your events and bookings."
        />

        <CustomerDashboardContent />
      </section>
    </Suspense>
  );
}
