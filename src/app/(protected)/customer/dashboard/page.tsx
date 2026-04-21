import { Suspense } from "react";
import CustomerDashboardContent from "./_components/dashboard-content";
import { CustomerDashboardSkeleton } from "./_components/customer-dashboard-skeleton";

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={<CustomerDashboardSkeleton />}>
      <section className="w-full relative flex flex-col space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6">
          <div className="flex justify-between items-start sm:items-center flex-wrap gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl title-header font-bold text-black">
                Customer Dashboard
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Welcome back! Manage your events and bookings.
              </p>
            </div>
          </div>
        </div>

        <CustomerDashboardContent />
      </section>
    </Suspense>
  );
}
