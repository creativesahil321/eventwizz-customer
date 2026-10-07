"use client";

import { cn } from "@/lib/utils";
import { useDomainStore } from "@/store/domain.store";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionStore } from "@/store/permission.store";
import { logout } from "@/lib/auth/logout";
import { usePermissionLoadTimeout } from "@/hooks/use-permission-load-timeout";
import {
  isSupportConversationPath,
  isSupportWorkspacePath,
} from "@/app/(protected)/_shared/support/support-workspace";
import { protectedSidebarOffsetClass } from "../protected-shell";

/**
 * Page wrapper component that:
 * 1. Provides layout structure for all protected pages
 * 2. Performs security validation on every page to prevent unauthorized access
 * 3. Handles responsive layout adjustments based on sidebar state
 * Note: Customers do not use roles/permissions; only vendor/admin do.
 */
export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed: collapsed } = useDomainStore();
  const { isAuthenticated, isSessionChecked, account_type } = useAuthStore();
  const { isLoaded: permissionsLoaded } = usePermissionStore();
  const router = useRouter();
  const pathname = usePathname();
  const isCustomer = account_type === "customer";
  const isDoorScan = pathname?.startsWith("/vendor/door-scan");
  const isSupport = isSupportWorkspacePath(pathname);
  const isSupportThread = isSupportConversationPath(pathname);

  // Security validation that runs on every protected page
  useEffect(() => {
    if (!isSessionChecked) return;
    if (isDoorScan) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, isSessionChecked, isDoorScan, router]);

  // Vendor/admin: permissions load from the API after login, so wait for them
  // and only log out if they never arrive (customers don't use permissions).
  // This is the ONLY permission watchdog — PageWrapper wraps every protected page.
  usePermissionLoadTimeout(
    isSessionChecked &&
      !isDoorScan &&
      isAuthenticated &&
      !isCustomer &&
      !permissionsLoaded,
    () => {
      console.warn(
        "[PageWrapper] Security violation: permissions never loaded",
      );
      void logout({ reason: "security_violation" });
    },
  );

  return (
    <main
      className={cn(
        "flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-default-100 dark:bg-background transition-all duration-300",
        protectedSidebarOffsetClass(collapsed),
      )}
    >
      <div
        className={cn(
          "min-w-0 text-black",
          isSupport
            ? cn(
                "px-3 pt-4 pb-4 sm:pt-5 md:pb-6",
                isSupportThread && "max-xl:px-0 max-xl:pt-0 max-xl:pb-0",
              )
            : "px-3 pt-4 pb-32 sm:pt-5 md:pb-6",
        )}
      >
        {children}
      </div>
    </main>
  );
}
