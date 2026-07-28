"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PREVIEW_DEVICE_ORDER,
  PREVIEW_DEVICE_PRESETS,
  type PreviewDeviceId,
} from "@/lib/preview-device";
import { usePreviewDeviceStore } from "@/store/preview-device.store";

const ICONS: Record<PreviewDeviceId, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

type PreviewDeviceToolbarProps = {
  className?: string;
  /** Compact icon-only controls (embedded onboarding strip). */
  compact?: boolean;
};

export function PreviewDeviceToolbar({
  className,
  compact = false,
}: PreviewDeviceToolbarProps) {
  const device = usePreviewDeviceStore((s) => s.device);
  const setDevice = usePreviewDeviceStore((s) => s.setDevice);

  return (
    <div
      role="group"
      aria-label="Preview device size"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-slate-950/80 p-0.5 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      {PREVIEW_DEVICE_ORDER.map((id) => {
        const preset = PREVIEW_DEVICE_PRESETS[id];
        const Icon = ICONS[id];
        const active = device === id;
        const sizeHint =
          preset.widthPx != null ? `${preset.widthPx}px` : "Full width";

        return (
          <button
            key={id}
            type="button"
            onClick={() => setDevice(id)}
            title={`${preset.label} · ${sizeHint}`}
            aria-pressed={active}
            aria-label={`${preset.label} preview (${sizeHint})`}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full transition-colors",
              compact ? "h-8 w-8" : "h-8 px-2.5 sm:px-3",
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {!compact ? (
              <span className="hidden text-xs font-medium sm:inline">
                {preset.shortLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
