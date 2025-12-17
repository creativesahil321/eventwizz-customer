"use client";

import { cn } from "@/lib/utils";
import { useDomainStore } from "@/store/domain.store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionStore } from "@/store/permission.store";
import { logout } from "@/lib/auth/logout";

/**
 * Page wrapper component that:
 * 1. Provides layout structure for all protected pages
 * 2. Performs security validation on every page to prevent unauthorized access
 * 3. Handles responsive layout adjustments based on sidebar state
 */
export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed: collapsed } = useDomainStore();
  const { isAuthenticated, isSessionChecked } = useAuthStore();
  const { isLoaded: permissionsLoaded } = usePermissionStore();
  const router = useRouter();

  // Security validation that runs on every protected page
  useEffect(() => {
    // Skip during initial render when session is still being checked
    if (!isSessionChecked) return;

    // Redirect unauthenticated users to login
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Handle security breach: missing permissions with active session
    // This can happen if localStorage is cleared or manipulated
    if (isAuthenticated && !permissionsLoaded) {
      const performSecurityLogout = async () => {
        try {
          // Use the centralized logout utility with security violation flag
          await logout({ securityViolation: true });
        } catch {
          // Fallback redirect in case of errors
          window.location.href = "/auth/login";
        }
      };

      performSecurityLogout();
    }
  }, [isAuthenticated, isSessionChecked, permissionsLoaded, router]);

  return (
    <main
      className={cn(
        "flex-1 min-w-0 bg-default-100 dark:bg-background transition-all duration-300 overflow-hidden",
        collapsed ? "lg:ml-[60px]" : "lg:ml-[264px]"
      )}
    >
      <div className="p-2 sm:p-4 md:p-6 lg:p-8 mb-24 md:mb-0 text-black min-w-0">
        {children}
      </div>
    </main>
  );
}
