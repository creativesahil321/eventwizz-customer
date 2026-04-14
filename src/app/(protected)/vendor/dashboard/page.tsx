import { Suspense } from "react";
import { PaymentSetupAlert } from "./_components/payment-setup-alert";
import VendorDashboardContent from "./_components/vendor-dashboard-content";
import { VendorDashboardGate } from "./_components/vendor-dashboard-gate";
import { PermissionDebug } from "@/components/permission/PermissionDebug";
import { PageLoader } from "@/components/ui/page-loader";
import { LocationIndicator } from "@/components/location-indicator";

export default function Page() {
  return (
    <VendorDashboardGate>
      <Suspense fallback={<PageLoader />}>
        <PermissionDebug />
        <section className="w-full relative flex flex-col space-y-8">
          <div className="flex items-center justify-between">
            <LocationIndicator variant="default" />
          </div>

          <PaymentSetupAlert />

          <VendorDashboardContent />
        </section>
      </Suspense>
    </VendorDashboardGate>
  );
}
