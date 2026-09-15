"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { saveAuthCallbackUrl } from "@/lib/auth/safe-callback-url";
import {
  doorScanPathForToken,
  extractDoorEntryToken,
  platformDoorScanUrl,
} from "@/app/(protected)/vendor/door-scan/_lib/door-entry-token";

/**
 * Other scanners (Google Lens, Camera) open a URL. Vendor dashboard Door Scan
 * lives on the EventWizz platform host, not the customer-facing venue site.
 * Always send them there.
 */
export function DoorEntryLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("t") || searchParams.get("token") || "";
  const token = extractDoorEntryToken(rawQuery);

  useEffect(() => {
    const path = token ? doorScanPathForToken(token) : "/vendor/door-scan";
    saveAuthCallbackUrl(path);

    try {
      const target = new URL(platformDoorScanUrl(token));
      if (target.origin === window.location.origin) {
        router.replace(path);
        return;
      }
      window.location.replace(target.toString());
    } catch {
      router.replace(path);
    }
  }, [router, token]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-16">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );
}
