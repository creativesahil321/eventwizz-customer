"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import {
  usePermissionStore,
  getPermissionStatus,
} from "@/store/permission.store";
import { useSession } from "next-auth/react";
import { useLoadPermissions } from "@/services/common/permissions/hooks";

interface PermissionProviderProps {
  children: ReactNode;
}

/**
 * Provider component that ensures permissions are loaded and properly hydrated
 * This should be included in your app's providers
 */
export function PermissionProvider({ children }: PermissionProviderProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { setPermissions, reset, permissions, isLoaded } = usePermissionStore();
  const [handled, setHandled] = useState(false);
  const prevStatusRef = useRef(sessionStatus);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Use the API fallback mechanism when needed (only for vendor/admin)
  const { refetchPermissions } = useLoadPermissions();

  const isCustomer = session?.user?.account_type === "customer";

  // Effect to sync permissions – completely skipped for customers
  useEffect(() => {
    if (sessionStatus === "loading") return;

    const isInitialLoad =
      prevStatusRef.current === "loading" &&
      (sessionStatus === "authenticated" ||
        sessionStatus === "unauthenticated");
    prevStatusRef.current = sessionStatus;

    // Customers never need permissions; mark as loaded once and bail out
    if (sessionStatus === "authenticated" && isCustomer) {
      if (!isLoaded || !handled) {
        setPermissions([]);
        setHandled(true);
      }
      return;
    }

    const status = getPermissionStatus();
    const isBrowser = typeof window !== "undefined";

    if (sessionStatus === "authenticated") {
      if (
        session?.user?.permissions &&
        Array.isArray(session.user.permissions) &&
        session.user.permissions.length > 0
      ) {
        setPermissions(session.user.permissions);
        setHandled(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      if (status.hasPermissions && permissions.length > 0 && !isInitialLoad) {
        setHandled(true);
        return;
      }
    }

    if (isBrowser && !handled) {
      try {
        const backupPermissions = sessionStorage.getItem("permissions-backup");
        if (backupPermissions) {
          const parsedPermissions = JSON.parse(backupPermissions);
          if (Array.isArray(parsedPermissions) && parsedPermissions.length > 0) {
            setPermissions(parsedPermissions);
            setHandled(true);
            return;
          }
        }
      } catch { /* silent */ }

      try {
        const storedPermissions = localStorage.getItem("permission-storage");
        if (storedPermissions) {
          const parsed = JSON.parse(storedPermissions);
          if (
            parsed?.state?.permissions &&
            Array.isArray(parsed.state.permissions) &&
            parsed.state.permissions.length > 0
          ) {
            setPermissions(parsed.state.permissions);
            setHandled(true);
            return;
          }
        }
      } catch { /* silent */ }

      // API fallback – vendor/admin only
      if (sessionStatus === "authenticated" && !handled) {
        refetchPermissions()
          .then(({ data }) => {
            if (data && Array.isArray(data) && data.length > 0) {
              setPermissions(data);
              setHandled(true);
            }
          })
          .catch(() => { /* silent */ });
        return;
      }
    }

    if (sessionStatus === "unauthenticated" && !handled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (sessionStatus === "unauthenticated") {
          reset();
          setHandled(true);
        }
        timerRef.current = null;
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    session,
    sessionStatus,
    isCustomer,
    isLoaded,
    setPermissions,
    reset,
    permissions,
    handled,
    refetchPermissions,
  ]);

  return <>{children}</>;
}
