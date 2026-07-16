"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportMessageScrollerProps {
  children: ReactNode;
  /** Re-scroll to bottom when this changes (e.g. ticket key). */
  resetKey?: string;
  /** Bump when a newly sent message should pin to bottom. */
  stickToBottomKey?: string | number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  emptyState?: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Fixed-pane chat scroller — sticky composer lives outside this component.
 * Loads older history when the user scrolls near the top.
 */
export default function SupportMessageScroller({
  children,
  resetKey,
  stickToBottomKey,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  emptyState,
  className,
  contentClassName,
}: SupportMessageScrollerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const isPrependingRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    if (behavior === "smooth") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  // Open ticket / first paint → jump to latest
  useLayoutEffect(() => {
    stickToBottomRef.current = true;
    scrollToBottom("auto");
  }, [resetKey, scrollToBottom]);

  // New outbound message → pin to bottom
  useEffect(() => {
    if (stickToBottomKey == null) return;
    stickToBottomRef.current = true;
    scrollToBottom("smooth");
  }, [stickToBottomKey, scrollToBottom]);

  // Preserve scroll position when older messages are prepended
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || !isPrependingRef.current) return;
    const delta = el.scrollHeight - prevScrollHeightRef.current;
    if (delta > 0) {
      el.scrollTop += delta;
    }
    isPrependingRef.current = false;
  });

  // Stay pinned for live updates only when user is already near the bottom
  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return;
    scrollToBottom("auto");
  }, [children, scrollToBottom]);

  const handleScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = viewportRef.current;
    if (!sentinel || !root || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || !hasMore || isLoadingMore) return;

        prevScrollHeightRef.current = root.scrollHeight;
        isPrependingRef.current = true;
        onLoadMore();
      },
      {
        root,
        rootMargin: "120px 0px 0px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore, resetKey]);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b from-slate-50/90 to-transparent"
      />
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
      >
        <div
          className={cn(
            "mx-auto flex min-h-full w-full min-w-0 max-w-3xl flex-col px-3 py-2 sm:px-4 sm:py-3",
            contentClassName
          )}
        >
          {/* mt-auto keeps short threads at the bottom without breaking scroll height */}
          <div className="mt-auto flex w-full flex-col space-y-2.5">
            <div ref={topSentinelRef} className="h-px w-full shrink-0" />

            {hasMore || isLoadingMore ? (
              <div className="flex justify-center py-0.5">
                {isLoadingMore ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-slate-200/80">
                    <Loader2 className="size-3 animate-spin" />
                    Loading earlier messages…
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/80">
                    Scroll up for earlier messages
                  </span>
                )}
              </div>
            ) : null}

            {emptyState}
            {children}
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-slate-50/80 to-transparent"
      />
    </div>
  );
}
