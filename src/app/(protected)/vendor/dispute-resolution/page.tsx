import { Shell } from "@/components/shell";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { PermissionRoute } from "@/components/permission";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { AllLocationsBadge } from "@/components/location-indicator";

export default function Page() {
  return (
    <PermissionRoute
      permissionKey="read-dispute"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page">
        <Shell className="gap-2">
          <Suspense fallback={<PageLoader />}>
            <div className={pageCardClassName("min-w-0")}>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-black title-header sm:text-2xl">
                  Dispute Resolution
                </h1>
                <AllLocationsBadge />
              </div>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
                Payment and booking disputes across every venue on your account.
                This section is being prepared.
              </p>
            </div>
          </Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
