"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import {
  usePermissionStore,
  getPermissionStatus,
  hydratePermissionsSync,
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
  const { setPermissions, reset, permissions } = usePermissionStore();
  const [handled, setHandled] = useState(false);
  const prevStatusRef = useRef(sessionStatus);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Use the API fallback mechanism when needed
  const { refetchPermissions } = useLoadPermissions();

  // Synchronously hydrate permissions on mount
  // This helps prevent flashing of unauthorized menu items
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Try to synchronously hydrate from storage
      hydratePermissionsSync();
    }
  }, []);

  // Effect to sync permissions with session and handle backup sources
  useEffect(() => {
    // Don't do anything if we're still loading
    if (sessionStatus === "loading") {
      return;
    }

    // Check if this is a transition from loading to another state
    const isInitialLoad =
      prevStatusRef.current === "loading" &&
      (sessionStatus === "authenticated" ||
        sessionStatus === "unauthenticated");
    prevStatusRef.current = sessionStatus;

    // Check the current state first
    const status = getPermissionStatus();
    const isBrowser = typeof window !== "undefined";

    if (sessionStatus === "authenticated") {
      // If session exists and has permissions, update the store
      if (
        session?.user?.permissions &&
        Array.isArray(session.user.permissions) &&
        session.user.permissions.length > 0
      ) {
        setPermissions(session.user.permissions);
        setHandled(true);

        // Clear any pending reset timer
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      // If permissions are already loaded, don't overwrite them
      if (status.hasPermissions && permissions.length > 0 && !isInitialLoad) {
        setHandled(true);
        return;
      }
    }

    // Try to load from backup in sessionStorage
    if (isBrowser && !handled) {
      try {
        const backupPermissions = sessionStorage.getItem("permissions-backup");
        if (backupPermissions) {
          const parsedPermissions = JSON.parse(backupPermissions);
          if (
            Array.isArray(parsedPermissions) &&
            parsedPermissions.length > 0
          ) {
            setPermissions(parsedPermissions);
            setHandled(true);
            return;
          }
        }
      } catch {
        // Silent error - fallback to next source
      }

      // Try to load permissions from localStorage directly
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
      } catch {
        // Silent error - fallback to next source
      }

      // If authenticated but no permissions found in storage, try API fallback
      if (sessionStatus === "authenticated" && !handled) {
        refetchPermissions()
          .then(({ data }) => {
            if (data && Array.isArray(data) && data.length > 0) {
              setPermissions(data);
              setHandled(true);
            }
          })
          .catch(() => {
            // Silently fail - we've tried our best to get permissions
          });
        return;
      }
    }

    // Only reset if definitely logged out and we haven't already handled permissions
    // Add a delay to ensure NextAuth has fully initialized
    if (sessionStatus === "unauthenticated" && !handled) {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set a new timer with delay to ensure NextAuth is fully initialized
      timerRef.current = setTimeout(() => {
        // Double-check session status before resetting
        if (sessionStatus === "unauthenticated") {
          reset();
          setHandled(true);
        }
        timerRef.current = null;
      }, 1000); // Wait a second to be sure
    }

    // Cleanup function to clear the timer if the component unmounts
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    session,
    sessionStatus,
    setPermissions,
    reset,
    permissions,
    handled,
    refetchPermissions,
  ]);

  return <>{children}</>;
}
