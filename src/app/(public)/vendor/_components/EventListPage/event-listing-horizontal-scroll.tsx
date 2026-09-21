"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { eventCarouselNavButtonClass } from "./event-carousel-classes";

type EventListingHorizontalScrollProps = {
  children: ReactNode;
  /** Re-run overflow checks when the list changes */
  watchKey?: string | number;
  className?: string;
  leftButtonClassName?: string;
  rightButtonClassName?: string;
  /** Fallback delta when card width cannot be measured */
  scrollAmount?: number;
};

const INTERACTIVE_SEL =
  "a,button,input,textarea,select,[role='button'],[data-no-drag-scroll]";

/**
 * Same interaction model as the event schedule timeline: native overflow-x,
 * scroll-smooth, drag-to-scroll (skips links/buttons), wheel → horizontal, arrows.
 *
 * Exposes `--event-scroll-slot` (usable track width) so child cards can size
 * as one full mobile slide without relying on `vw` or fragile % flex math.
 */
export function EventListingHorizontalScroll({
  children,
  watchKey,
  className,
  leftButtonClassName,
  rightButtonClassName,
  scrollAmount = 300,
}: EventListingHorizontalScrollProps) {
  const arrowClass = eventCarouselNavButtonClass("shrink-0");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftAtDragStart, setScrollLeftAtDragStart] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [slotPx, setSlotPx] = useState<number | null>(null);

  const measure = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth + 1;
    setShowArrows(hasOverflow);
    setCanScrollLeft(container.scrollLeft > 1);
    setCanScrollRight(
      container.scrollLeft <
        container.scrollWidth - container.clientWidth - 1,
    );

    // Usable width inside horizontal padding — one full card + tiny peek.
    const styles = window.getComputedStyle(container);
    const padL = Number.parseFloat(styles.paddingLeft) || 0;
    const padR = Number.parseFloat(styles.paddingRight) || 0;
    const inner = Math.max(0, container.clientWidth - padL - padR);
    setSlotPx(inner > 0 ? Math.round(inner) : null);
  }, []);

  const getStep = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return scrollAmount;
    const first = container.firstElementChild as HTMLElement | null;
    if (!first) return scrollAmount;
    const styles = window.getComputedStyle(container);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }, [scrollAmount]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const run = () => measure();
    const id = requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => run())
        : null;
    ro?.observe(container);
    window.addEventListener("resize", run);

    return () => {
      cancelAnimationFrame(id);
      ro?.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [measure, watchKey]);

  // Padding for arrows changes usable width — remeasure after toggle.
  useEffect(() => {
    const id = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(id);
  }, [showArrows, measure]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 2) return;

      const scrollingRight = e.deltaY > 0;
      const canScrollFurther = scrollingRight
        ? container.scrollLeft < maxScrollLeft - 1
        : container.scrollLeft > 1;

      if (!canScrollFurther) return;

      e.preventDefault();
      container.scrollLeft += e.deltaY;
      measure();
    };

    const handleScroll = () => measure();

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [measure, watchKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(INTERACTIVE_SEL)) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeftAtDragStart(container.scrollLeft);
    container.style.cursor = "grabbing";
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    const container = scrollContainerRef.current;
    if (container) container.style.cursor = "grab";
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const container = scrollContainerRef.current;
    if (container) container.style.cursor = "grab";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const container = scrollContainerRef.current;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2;
    container.scrollLeft = scrollLeftAtDragStart - walk;
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const step = getStep();
    const delta = direction === "right" ? step : -step;
    container.scrollTo({
      left: container.scrollLeft + delta,
      behavior: "smooth",
    });
    window.setTimeout(() => measure(), 320);
  };

  const slotStyle = {
    ["--event-scroll-slot" as string]:
      slotPx != null ? `${slotPx}px` : "100%",
  } as CSSProperties;

  return (
    <div className={cn("flex w-full min-w-0 items-center gap-2 sm:gap-3", className)}>
      {showArrows ? (
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={cn(
            arrowClass,
            leftButtonClassName,
            !canScrollLeft && "invisible pointer-events-none",
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
      ) : null}

      <div
        ref={scrollContainerRef}
        style={slotStyle}
        className={cn(
          "no-scrollbar relative z-[1] flex min-w-0 flex-1 cursor-grab select-none items-stretch gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain py-1 [-webkit-overflow-scrolling:touch] sm:gap-5",
          "snap-x snap-mandatory scroll-smooth",
          !showArrows && "justify-center",
        )}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {children}
      </div>

      {showArrows ? (
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className={cn(
            arrowClass,
            rightButtonClassName,
            !canScrollRight && "invisible pointer-events-none",
          )}
          aria-label="Scroll right"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}
