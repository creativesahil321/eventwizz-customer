"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_PREVIEW_DEVICE,
  type PreviewDeviceId,
  PREVIEW_DEVICE_PRESETS,
} from "@/lib/preview-device";

type PreviewDeviceState = {
  device: PreviewDeviceId;
  setDevice: (device: PreviewDeviceId) => void;
};

export const usePreviewDeviceStore = create<PreviewDeviceState>()(
  persist(
    (set) => ({
      device: DEFAULT_PREVIEW_DEVICE,
      setDevice: (device) => {
        if (!(device in PREVIEW_DEVICE_PRESETS)) return;
        set({ device });
      },
    }),
    {
      name: "preview-device-storage",
      version: 1,
    },
  ),
);

export function usePreviewDevicePreset() {
  const device = usePreviewDeviceStore((s) => s.device);
  return PREVIEW_DEVICE_PRESETS[device] ?? PREVIEW_DEVICE_PRESETS.desktop;
}
