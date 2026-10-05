"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { PermissionRoute } from "@/components/permission";
import { PageLoader } from "@/components/ui/page-loader";
import { getFirstAccessibleVendorPath } from "@/config/menus/first-accessible-vendor-route";
import { usePermissions } from "@/hooks/usePermission";

export function VendorDashboardGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  // Permissions live in the store (loaded from the API), not the JWT/session.
  const { permissions } = usePermissions();

  const fallbackPath = useMemo(
    () =>
      getFirstAccessibleVendorPath(
        Array.isArray(permissions) ? permissions : undefined,
      ),
    [permissions],
  );

  if (status === "loading") {
    return <PageLoader />;
  }

  return (
    <PermissionRoute
      permissionKey="read-dashboard"
      fallbackPath={fallbackPath}
    >
      {children}
    </PermissionRoute>
  );
}
