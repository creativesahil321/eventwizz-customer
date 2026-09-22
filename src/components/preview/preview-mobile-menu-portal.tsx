"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { readPreviewThemeVarStyle } from "@/lib/preview-device";

type PreviewMobileMenuPortalProps = {
  host: HTMLElement;
  themeFrom: HTMLElement | null;
  onDismiss: () => void;
  children: ReactNode;
  panelClassName?: string;
};

/**
 * Full-frame hamburger layer. The device frame is outside `[data-preview-theme-root]`,
 * so brand tokens are copied onto this wrapper. `isolate` + `z-[200]` keeps the
 * drawer above sticky preview chrome (`z-[80]`).
 */
export function PreviewMobileMenuPortal({
  host,
  themeFrom,
  onDismiss,
  children,
  panelClassName,
}: PreviewMobileMenuPortalProps) {
  const pinToFrame = host !== document.body;
  const layer = (
    <div
      className={
        pinToFrame
          ? "absolute inset-0 z-[200] isolate"
          : "fixed inset-0 z-[200] isolate"
      }
      style={readPreviewThemeVarStyle(themeFrom)}
      data-preview-mobile-menu=""
    >
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/50"
        onClick={onDismiss}
      />
      <div
        className={cn(
          "absolute top-0 left-0 z-[1] flex h-auto max-h-full w-[70%] max-w-xs flex-col overflow-hidden shadow-2xl",
          pinToFrame
            ? "bg-[color:var(--color-surface,#ffffff)] text-[color:var(--color-text,#0f172a)]"
            : "bg-[color:var(--color-header)] text-[var(--color-on-header)]",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(layer, host);
}
