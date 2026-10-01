"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type HeroBackgroundVideoProps = {
  /** Direct `src` on the `<video>` (omit when passing `<source>` children). */
  src?: string;
  poster?: string;
  className?: string;
  children?: ReactNode;
  /**
   * Position classes for the pause/play toggle. Defaults to bottom-right.
   * The nearest positioned ancestor must span the hero.
   */
  toggleClassName?: string;
};

/**
 * Muted looping hero background video with an accessible pause/play toggle.
 * `autoPlay` is always rendered (SSR + client match); when the user prefers
 * reduced motion the video is paused after mount instead.
 */
export function HeroBackgroundVideo({
  src,
  poster,
  className,
  children,
  toggleClassName,
}: HeroBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!prefersReducedMotion) return;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPaused(true);
  }, [prefersReducedMotion, src]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setPaused(false);
      void video.play().catch(() => setPaused(true));
    } else {
      video.pause();
      setPaused(true);
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      >
        {children}
      </video>
      <button
        type="button"
        data-preview-no-edit=""
        aria-label={paused ? "Play background video" : "Pause background video"}
        aria-pressed={paused}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
        className={cn(
          "absolute z-[21] inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
          toggleClassName ?? "bottom-3 right-3 md:bottom-4 md:right-4",
        )}
      >
        {paused ? (
          <Play className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Pause className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </>
  );
}
