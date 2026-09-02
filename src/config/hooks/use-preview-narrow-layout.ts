"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
 * True when the preview content should use narrow responsive layout rules.
 */
export function usePreviewNarrowLayout(): boolean {
  const isPreview = useIsPreviewMode();
  const device = usePreviewDeviceStore((s) => s.device);
  const deviceFramesEnabled = usePreviewDeviceFramesEnabled();
  const [previewFrameWidth, setPreviewFrameWidth] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!isPreview || !deviceFramesEnabled) {
      setPreviewFrameWidth(null);
      return;
    }

    const frame = document.querySelector<HTMLElement>(
      "[data-preview-device]",
    );
    if (!frame) return;

    const updateFrameWidth = () => {
      setPreviewFrameWidth(frame.getBoundingClientRect().width);
    };

    updateFrameWidth();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateFrameWidth);
    observer.observe(frame);

    return () => observer.disconnect();
  }, [device, deviceFramesEnabled, isPreview]);

  // A Desktop preset can still be rendered inside a narrow editor panel.
  // Use the actual frame width so it does not inherit desktop layout rules.
  const frameIsNarrow =
    previewFrameWidth !== null && previewFrameWidth < 1024;

  return (
    isPreview &&
    deviceFramesEnabled &&
    (device !== "desktop" || frameIsNarrow)
  );
}

/** True only for the 390px Mobile device frame (not tablet). */
export function usePreviewMobileLayout(): boolean {
  const isPreview = useIsPreviewMode();
  const device = usePreviewDeviceStore((s) => s.device);
  const deviceFramesEnabled = usePreviewDeviceFramesEnabled();
  return isPreview && deviceFramesEnabled && device === "mobile";
}
