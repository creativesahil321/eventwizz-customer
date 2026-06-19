"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { PermissionRoute } from "@/components/permission";
import { PageLoader } from "@/components/ui/page-loader";
import { getFirstAccessibleVendorPath } from "@/config/menus/first-accessible-vendor-route";

export function VendorDashboardGate({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const fallbackPath = useMemo(
    () =>
      getFirstAccessibleVendorPath(
        Array.isArray(session?.user?.permissions)
          ? session.user.permissions
          : undefined,
      ),
    [session?.user?.permissions],
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
