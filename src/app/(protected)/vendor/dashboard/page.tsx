import { Suspense } from "react";
import { PaymentSetupAlert } from "./_components/payment-setup-alert";
import VendorDashboardContent from "./_components/vendor-dashboard-content";
import { PermissionDebug } from "@/components/permission/PermissionDebug";
import { PageLoader } from "@/components/ui/page-loader";
import { LocationIndicator } from "@/components/location-indicator";
import { PermissionRoute } from "@/components/permission";

export default function Page() {
  return (
    <PermissionRoute
      permissionKey="read-dashboard"
      fallbackPath="/unauthorized"
    >
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
    </PermissionRoute>
  );
}
