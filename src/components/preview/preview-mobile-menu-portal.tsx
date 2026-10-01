"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  /** Accessible name for the menu dialog. */
  ariaLabel?: string;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  ariaLabel = "Menu",
}: PreviewMobileMenuPortalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  // Callers mount this only while the menu is open: Escape closes, focus moves
  // into the panel on open and returns to the opener (hamburger) on close.
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const firstFocusable =
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panelRef.current)?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismissRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  const pinToFrame = host !== document.body;
  const [viewport, setViewport] = useState(() =>
    pinToFrame ? readPreviewFrameViewport(host) : null,
  );

  useLayoutEffect(() => {
    if (!pinToFrame) return;
    // The frame can move without resizing (editor side panel toggles, CSS
    // transitions), which no observer reports — track its box every frame.
    let rafId = 0;
    const track = () => {
      const next = readPreviewFrameViewport(host);
      setViewport((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.borderRadius === next.borderRadius
          ? prev
          : next,
      );
      rafId = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(rafId);
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
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        onClick={onDismiss}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
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
