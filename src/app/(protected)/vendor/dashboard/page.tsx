import { Suspense } from "react";
import VendorDashboardContent from "./_components/vendor-dashboard-content";
import { VendorDashboardGate } from "./_components/vendor-dashboard-gate";
import { PermissionDebug } from "@/components/permission/PermissionDebug";
import { PageLoader } from "@/components/ui/page-loader";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { DoorScanLink } from "@/app/(protected)/_components/door-scan-link";

export default function Page() {
  return (
    <VendorDashboardGate>
      <Suspense fallback={<PageLoader />}>
        <PermissionDebug />
        <section className="w-full relative flex flex-col space-y-6 sm:space-y-8">
          <ProtectedPageHeader
            locationScope="venue"
            title="Dashboard"
            description="Overview for this venue. Switch location in the header to view another."
            actions={<DoorScanLink />}
          />

          <VendorDashboardContent />
        </section>
      </Suspense>
    </VendorDashboardGate>
  );
}
