import { Suspense } from "react";
import VendorDashboardContent from "./_components/vendor-dashboard-content";
import { VendorDashboardGate } from "./_components/vendor-dashboard-gate";
import { PermissionDebug } from "@/components/permission/PermissionDebug";
import { PageLoader } from "@/components/ui/page-loader";
import { LocationScopedTitle } from "@/components/location-indicator";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

export default function Page() {
  return (
    <VendorDashboardGate>
      <Suspense fallback={<PageLoader />}>
        <PermissionDebug />
        <section className="w-full relative flex flex-col space-y-6 sm:space-y-8">
          <div className={pageCardClassName("min-w-0")}>
            <h1 className="text-xl sm:text-2xl title-header font-bold text-black">
              <LocationScopedTitle title="Dashboard" />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              Overview for this venue. Switch location in the header to view
              another.
            </p>
          </div>

          <VendorDashboardContent />
        </section>
      </Suspense>
    </VendorDashboardGate>
  );
}
