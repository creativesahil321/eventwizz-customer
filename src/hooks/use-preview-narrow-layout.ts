"use client";

import { usePathname } from "next/navigation";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { usePreviewDeviceStore } from "@/store/preview-device.store";

/**
 * True when a Desktop/Tablet/Mobile device frame is active (onboarding / `/preview/*`).
 * Vendor dashboard embeds are always full-width desktop — ignore persisted device.
 */
export function usePreviewNarrowLayout(): boolean {
  const isPreview = useIsPreviewMode();
  const device = usePreviewDeviceStore((s) => s.device);
  const pathname = usePathname();
  const deviceFramesEnabled =
    Boolean(pathname?.includes("/on-boarding")) ||
    Boolean(pathname?.includes("/preview/"));
  return isPreview && deviceFramesEnabled && device !== "desktop";
}
