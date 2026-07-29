"use client";

import { usePathname } from "next/navigation";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { usePreviewDeviceStore } from "@/store/preview-device.store";

/**
 * Desktop/Tablet/Mobile device frames — onboarding (+ `/preview/onboarding`) only.
 * Sites Essentials `/preview/site` and `/preview/event` stay full-width (no frame).
 */
export function usePreviewDeviceFramesEnabled(): boolean {
  const pathname = usePathname();
  return (
    Boolean(pathname?.includes("/on-boarding")) ||
    Boolean(pathname?.includes("/preview/onboarding"))
  );
}

/**
 * True when a Tablet/Mobile device frame is active (hamburger / narrow chrome).
 */
export function usePreviewNarrowLayout(): boolean {
  const isPreview = useIsPreviewMode();
  const device = usePreviewDeviceStore((s) => s.device);
  const deviceFramesEnabled = usePreviewDeviceFramesEnabled();
  return isPreview && deviceFramesEnabled && device !== "desktop";
}
