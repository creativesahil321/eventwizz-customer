"use client";

import {
  forwardRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";
import { PREVIEW_CONTAINER_CLASS } from "@/lib/preview-device";
import { usePreviewDevicePreset } from "@/store/preview-device.store";

type PreviewDeviceFrameProps = {
  children: ReactNode;
  className?: string;
  /** Outer stage behind the framed site (device bezels / centering). */
  stageClassName?: string;
  /** Framed site surface. */
  frameClassName?: string;
  style?: CSSProperties;
  /** When false, the frame sizes to content and the child owns scrolling. */
  scrollable?: boolean;
};

/**
 * Constrains preview content to the globally selected device width.
 * Keeps `@container/preview` on the framed surface so CommonHeader / layouts
 * respond like the live site at that width.
 *
 * Important: do not put `overflow-x-hidden` on ancestors of sticky preview chrome
 * (header / room bar) — that breaks `position: sticky` inside the scroll frame.
 */
export const PreviewDeviceFrame = forwardRef(function PreviewDeviceFrame(
  {
    children,
    className,
    stageClassName,
    frameClassName,
    style,
    scrollable = true,
  }: PreviewDeviceFrameProps,
  ref: Ref<HTMLDivElement>,
) {
  const preset = usePreviewDevicePreset();
  const isFluid = preset.width === "100%";

  return (
    <div
      className={cn(
        // overflow-y-hidden clips tall content to the stage without creating an
        // overflow-x containment that breaks sticky descendants in the frame.
        "flex min-h-0 min-w-0 flex-1 justify-center overflow-y-hidden",
        stageClassName,
        className,
      )}
    >
      <div
        ref={ref}
        className={cn(
          PREVIEW_CONTAINER_CLASS,
          "min-h-0 min-w-0 max-w-full transition-[width,max-width,box-shadow,border-radius] duration-300 ease-out",
          scrollable &&
            "overflow-y-auto overflow-x-clip scroll-smooth no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          !scrollable && "overflow-x-clip",
          isFluid
            ? "h-full w-full"
            : "border border-slate-700/60 bg-white shadow-[0_12px_40px_-18px_rgba(0,0,0,0.55)]",
          // Always fill stage height so embedInShell children can scroll inside.
          "h-full",
          !isFluid && preset.id === "mobile" && "rounded-[1.25rem]",
          !isFluid && preset.id === "tablet" && "rounded-xl",
          frameClassName,
        )}
        style={{
          width: preset.width,
          ...style,
        }}
        data-preview-device={preset.id}
      >
        {children}
      </div>
    </div>
  );
});
