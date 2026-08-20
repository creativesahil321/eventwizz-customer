"use client";

import { useLayoutEffect, useRef } from "react";

/** CSS var read by the public footer and chatbot so they clear the review bar. */
export const PREVIEW_REVIEW_CHROME_HEIGHT_VAR =
  "--preview-review-chrome-height";

/**
 * Lift a viewport-fixed widget (chatbot launcher / panel) above the review bar.
 * No-op on live pages where the var is unset.
 */
export const previewReviewChromeLiftStyle = {
  marginBottom: `var(${PREVIEW_REVIEW_CHROME_HEIGHT_VAR}, 0px)`,
} as const;

/**
 * Measures the fixed preview review chrome and publishes its height as a
 * document CSS variable. Footer padding and the chatbot use the same var so
 * clearance matches the bar (no clipped launcher, no hidden copyright).
 */
export function usePreviewReviewChromeHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        PREVIEW_REVIEW_CHROME_HEIGHT_VAR,
        `${el.offsetHeight}px`,
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(
        PREVIEW_REVIEW_CHROME_HEIGHT_VAR,
      );
    };
  }, []);

  return ref;
}
