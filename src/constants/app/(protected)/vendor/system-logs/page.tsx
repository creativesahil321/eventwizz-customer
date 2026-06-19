"use client";

import { Shell } from "@/components/shell";
import { LocationIndicator } from "@/components/location-indicator";
import { PermissionRoute } from "@/components/permission";
import { SystemLogsTable } from "./_components/system-logs-table";

export default function VendorSystemLogsPage() {
  return (
    <PermissionRoute
      permissionKey="read-system-logs"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0 max-w-full overflow-x-hidden pb-20 sm:pb-4">
        <Shell className="gap-2 overflow-x-hidden">
          <div className="flex flex-col gap-4 min-w-0 max-w-full">
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-4 min-w-0 max-w-full overflow-hidden">
              <div className="flex flex-col gap-4">
                <div className="min-w-0 flex flex-col gap-3">
                  <h1 className="text-xl sm:text-2xl title-header font-bold text-black break-words">
                    System Logs
                  </h1>
                  <LocationIndicator variant="card" />
                  <p className="text-muted-foreground break-words">
                    View system activity and events for your account. This data
                    is for reference only.
                  </p>
                </div>
            </div>
          </div>

          <div className="relative">
            <SystemLogsTable />
          </div>
        </div>
      </Shell>
    </section>
    </PermissionRoute>
  );
}
