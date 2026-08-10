import { Shell } from "@/components/shell";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { PermissionRoute } from "@/components/permission";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { LocationScopedTitle } from "@/components/location-indicator";

export default function Page() {
  return (
    <PermissionRoute
      permissionKey="read-marketing"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page">
        <Shell className="gap-2">
          <Suspense fallback={<PageLoader />}>
            <div className={pageCardClassName("min-w-0")}>
              <h1 className="text-xl font-bold text-black title-header sm:text-2xl">
                <LocationScopedTitle title="Marketing" />
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
                Campaigns and promotions for this venue. This section is being
                prepared — switch location in the header to work on another
                venue when available.
              </p>
            </div>
          </Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
