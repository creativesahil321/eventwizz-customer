"use client";

import { usePathname } from "next/navigation";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { usePreviewDeviceStore } from "@/store/preview-device.store";

/**
 * True when a Desktop/Tablet/Mobile device frame is active.
 * Only onboarding (+ `/preview/onboarding`) uses device frames — Sites Essentials
 * `/preview/site` and other embeds stay full-width desktop.
 */
export function usePreviewNarrowLayout(): boolean {
  const isPreview = useIsPreviewMode();
  const device = usePreviewDeviceStore((s) => s.device);
  const pathname = usePathname();
  const deviceFramesEnabled =
    Boolean(pathname?.includes("/on-boarding")) ||
    Boolean(pathname?.includes("/preview/onboarding"));
  return isPreview && deviceFramesEnabled && device !== "desktop";
}
