"use client";

import { Suspense } from "react";
import { PermissionRoute } from "@/components/permission";
import { DoorScanWorkspace } from "./_components/door-scan-workspace";
import { DoorScanAuthGate } from "./_components/door-scan-auth-gate";
import { Skeleton } from "@/components/ui/skeleton";

function DoorScanFallback() {
  return (
    <section className="page min-w-0 text-black">
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    </section>
  );
}

export default function VendorDoorScanPage() {
  return (
    <Suspense fallback={<DoorScanFallback />}>
      <DoorScanAuthGate>
        <PermissionRoute
          permissionKey="read-booking"
          fallbackPath="/vendor/dashboard"
        >
          <section className="page min-w-0 text-black">
            <DoorScanWorkspace />
          </section>
        </PermissionRoute>
      </DoorScanAuthGate>
    </Suspense>
  );
}
