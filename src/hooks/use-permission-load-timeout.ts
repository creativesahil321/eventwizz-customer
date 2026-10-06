"use client";

import { useEffect, useRef } from "react";

/** How long to wait for API-loaded permissions before treating it as a violation. */
export const PERMISSION_LOAD_TIMEOUT_MS = 15_000;

/**
 * Vendor/admin permissions are not in the session/JWT — they load
 * asynchronously from the API (PermissionProvider → /auth/user/permissions).
 * Right after login there is a normal window where the user is authenticated
 * but permissions are still in flight.
 *
 * Guards that used to log out as soon as `!isLoaded` kicked every fresh login
 * out during that window. Use this instead: `onTimeout` only runs if
 * permissions are still missing after PERMISSION_LOAD_TIMEOUT_MS, and the
 * timer is cancelled as soon as `waiting` turns false.
 */
export function usePermissionLoadTimeout(
  waiting: boolean,
  onTimeout: () => void,
) {
  const callbackRef = useRef(onTimeout);
  callbackRef.current = onTimeout;

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(
      () => callbackRef.current(),
      PERMISSION_LOAD_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [waiting]);
}
