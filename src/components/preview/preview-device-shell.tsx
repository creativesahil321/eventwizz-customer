"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PreviewProvider } from "@/contexts/preview-context";
import { PreviewDeviceToolbar } from "@/components/preview/preview-device-toolbar";
import { PreviewDeviceFrame } from "@/components/preview/preview-device-frame";

type PreviewDeviceShellProps = {
  children: ReactNode;
  className?: string;
  toolbarClassName?: string;
  stageClassName?: string;
  frameClassName?: string;
  /** Icon-only device controls (tight dashboard strips). */
  compactToolbar?: boolean;
  /**
   * Wrap in PreviewProvider so `usePreviewNarrowLayout` / preview chrome work
   * on dashboard embeds that are not under `/preview/…`.
   */
  withPreviewProvider?: boolean;
  /**
   * When false (default), the child owns scrolling — match `/preview/event`
   * + `EventPreview` `embedInShell`.
   */
  scrollable?: boolean;
};

/**
 * Shared Desktop / Tablet / Mobile chrome for onboarding and `/preview/*` surfaces.
 * Vendor dashboard event Preview tab is full-width desktop (no device switcher).
 */
export function PreviewDeviceShell({
  children,
  className,
  toolbarClassName,
  stageClassName,
  frameClassName,
  compactToolbar = false,
  withPreviewProvider = false,
  scrollable = false,
}: PreviewDeviceShellProps) {
  const shell = (
    <section
      className={cn(
        "relative isolate flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2",
          toolbarClassName,
        )}
      >
        <PreviewDeviceToolbar compact={compactToolbar} />
      </div>
      <PreviewDeviceFrame
        scrollable={scrollable}
        stageClassName={cn("bg-slate-950 px-2 pb-2 pt-1 sm:px-3", stageClassName)}
        frameClassName={cn(
          "h-full min-h-0 bg-[color:var(--color-background,#fff)]",
          !scrollable && "flex flex-col",
          frameClassName,
        )}
      >
        {children}
      </PreviewDeviceFrame>
    </section>
  );

  if (withPreviewProvider) {
    return <PreviewProvider isPreviewMode>{shell}</PreviewProvider>;
  }

  return shell;
}
