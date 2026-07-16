"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type EventListingHorizontalScrollProps = {
  children: ReactNode;
  /** Re-run overflow checks when the list changes */
  watchKey?: string | number;
  className?: string;
  leftButtonClassName?: string;
  rightButtonClassName?: string;
  scrollAmount?: number;
};

const INTERACTIVE_SEL =
  "a,button,input,textarea,select,[role='button'],[data-no-drag-scroll]";

/**
 * Same interaction model as the event schedule timeline: native overflow-x,
 * scroll-smooth, drag-to-scroll (skips links/buttons), wheel → horizontal, arrows.
 */
export function EventListingHorizontalScroll({
  children,
  watchKey,
  className,
  leftButtonClassName,
  rightButtonClassName,
  scrollAmount = 300,
}: EventListingHorizontalScrollProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftAtDragStart, setScrollLeftAtDragStart] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth + 1;
    setShowArrows(hasOverflow);
    setCanScrollLeft(container.scrollLeft > 1);
    setCanScrollRight(
      container.scrollLeft <
        container.scrollWidth - container.clientWidth - 1,
    );
  }, []);

  useEffect(() => {
    const run = () => checkScrollability();
    const id = requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });
    const handleResize = () => run();
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", handleResize);
    };
  }, [checkScrollability, watchKey]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Native horizontal trackpad/mouse gestures — leave alone.
      if (e.deltaY === 0) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      // No horizontal overflow: never trap the wheel (lets the page scroll).
      if (maxScrollLeft <= 2) return;

      const scrollingRight = e.deltaY > 0;
      const canScrollFurther = scrollingRight
        ? container.scrollLeft < maxScrollLeft - 1
        : container.scrollLeft > 1;

      // At a horizontal edge: release the wheel so the page can scroll.
      if (!canScrollFurther) return;

      e.preventDefault();
      container.scrollLeft += e.deltaY;
      checkScrollability();
    };

    const handleScroll = () => checkScrollability();

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [checkScrollability, watchKey]);

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
    const delta = direction === "right" ? scrollAmount : -scrollAmount;
    container.scrollTo({
      left: container.scrollLeft + delta,
      behavior: "smooth",
    });
    window.setTimeout(() => checkScrollability(), 320);
  };

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <div
        ref={scrollContainerRef}
        className={cn(
          "no-scrollbar relative z-[1] flex min-w-0 cursor-grab select-none items-stretch gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain py-1 [-webkit-overflow-scrolling:touch] sm:gap-5",
          "scroll-smooth",
          showArrows && "px-10 sm:px-12",
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
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={cn(
            leftButtonClassName,
            "z-20",
            !canScrollLeft && "pointer-events-none opacity-30",
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
      ) : null}

      {showArrows ? (
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className={cn(
            rightButtonClassName,
            "z-20",
            !canScrollRight && "pointer-events-none opacity-30",
          )}
          aria-label="Scroll right"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}
