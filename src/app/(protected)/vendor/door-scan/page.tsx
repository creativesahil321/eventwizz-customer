"use client";

import { PermissionRoute } from "@/components/permission";
import { DoorScanWorkspace } from "./_components/door-scan-workspace";

export default function VendorDoorScanPage() {
  return (
    <PermissionRoute
      permissionKey="read-booking"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page text-black min-w-0">
        <DoorScanWorkspace />
      </section>
    </PermissionRoute>
  );
}
