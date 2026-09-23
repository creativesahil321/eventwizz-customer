"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  readPreviewFrameViewport,
  readPreviewThemeVarStyle,
} from "@/lib/preview-device";

type PreviewMobileMenuPortalProps = {
  host: HTMLElement;
  themeFrom: HTMLElement | null;
  onDismiss: () => void;
  children: ReactNode;
  panelClassName?: string;
};

/**
 * Hamburger layer. Brand tokens are copied from the themed root.
 *
 * Live site: a full-viewport sheet (`fixed inset-0`) so the menu covers
 * the phone instead of a short card over the page.
 * Framed previews: pin that same sheet to the *visible* device rectangle
 * so sticky chrome (`Book now`, section nav) cannot paint through.
 */
export function PreviewMobileMenuPortal({
  host,
  themeFrom,
  onDismiss,
  children,
  panelClassName,
}: PreviewMobileMenuPortalProps) {
  const pinToFrame = host !== document.body;
  const [viewport, setViewport] = useState(() =>
    pinToFrame ? readPreviewFrameViewport(host) : null,
  );

  useLayoutEffect(() => {
    if (!pinToFrame) return;
    const update = () => setViewport(readPreviewFrameViewport(host));
    update();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(host);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [host, pinToFrame]);

  const themeStyle = readPreviewThemeVarStyle(themeFrom);
  const pinStyle =
    pinToFrame && viewport && viewport.height > 0
      ? {
          ...themeStyle,
          top: viewport.top,
          left: viewport.left,
          width: viewport.width,
          height: viewport.height,
          borderRadius: viewport.borderRadius || undefined,
        }
      : themeStyle;

  const layer = (
    <div
      className={
        pinToFrame
          ? "fixed z-[300] isolate overflow-hidden"
          : "fixed inset-0 z-[200] isolate"
      }
      style={pinStyle}
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
          "absolute inset-0 z-[1] flex h-full w-full flex-col overflow-y-auto",
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

  return createPortal(layer, pinToFrame ? document.body : host);
}
