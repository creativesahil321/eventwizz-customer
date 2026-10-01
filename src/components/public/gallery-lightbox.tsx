"use client";

import { useCallback, useEffect, useId } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

type GalleryLightboxProps = {
  images: string[];
  open: boolean;
  activeIndex: number;
  onOpenChange: (open: boolean) => void;
  onActiveIndexChange: (index: number) => void;
  title?: string;
};

/**
 * Full-screen image viewer for public galleries.
 * Uses a custom portal surface (not DialogContent) so desktop is not capped
 * by the shared dialog `sm:max-w-lg` layout.
 */
export function GalleryLightbox({
  images,
  open,
  activeIndex,
  onOpenChange,
  onActiveIndexChange,
  title = "Gallery",
}: GalleryLightboxProps) {
  const titleId = useId();
  const count = images.length;
  const safeIndex =
    count === 0 ? 0 : Math.min(Math.max(activeIndex, 0), count - 1);
  const currentSrc = count > 0 ? images[safeIndex] : null;

  const goPrev = useCallback(() => {
    if (count < 2) return;
    onActiveIndexChange((safeIndex - 1 + count) % count);
  }, [count, onActiveIndexChange, safeIndex]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    onActiveIndexChange((safeIndex + 1) % count);
  }, [count, onActiveIndexChange, safeIndex]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goPrev, goNext, onOpenChange]);

  if (count === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogPortal>
        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close gallery backdrop"
            className="fixed inset-0 z-[300] bg-black/80 animate-in fade-in-0 duration-200"
          />
        </DialogClose>

        <DialogPrimitive.Content
          aria-labelledby={titleId}
          className={cn(
            // Above `/preview/event` review chrome (z-100) and hamburger (z-200).
            "fixed inset-0 z-[301] flex h-[100dvh] w-screen max-w-none flex-col gap-0 border-0 bg-transparent p-0 shadow-none outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200",
          )}
        >
          <DialogTitle id={titleId} className="sr-only">
            {title} — image {safeIndex + 1} of {count}
          </DialogTitle>

          <div className="relative flex h-full w-full flex-col bg-black/95">
            <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <p className="text-sm font-medium text-white/80">
                {safeIndex + 1} / {count}
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close gallery"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-20"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  onOpenChange(false);
                }
              }}
            >
              {count > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous image"
                    className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:left-6"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next image"
                    className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:right-6"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              ) : null}

              {currentSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- external / cache-busted gallery URLs
                <img
                  key={currentSrc}
                  src={addCacheBusting(currentSrc)}
                  alt={`${title} image ${safeIndex + 1}`}
                  className="max-h-full max-w-full object-contain select-none animate-in fade-in-0 duration-200"
                  draggable={false}
                />
              ) : null}
            </div>

            {count > 1 ? (
              <div className="relative z-10 shrink-0 overflow-x-auto px-4 py-3 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto flex w-max items-center gap-2">
                  {images.map((src, index) => {
                    const isActive = index === safeIndex;
                    return (
                      <button
                        key={`${src}-${index}`}
                        type="button"
                        onClick={() => onActiveIndexChange(index)}
                        aria-label={`View image ${index + 1}`}
                        aria-current={isActive}
                        className={cn(
                          "h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-16 sm:w-16",
                          isActive
                            ? "border-white opacity-100"
                            : "border-transparent opacity-55 hover:opacity-90",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={addCacheBusting(src)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
