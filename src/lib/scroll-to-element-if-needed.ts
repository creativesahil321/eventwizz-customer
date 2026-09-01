/**
 * Smooth-scroll to `el` only when it sits outside a comfortable viewport band
 * (below the sticky header, and not too far down the fold).
 *
 * Supports window scroll (live event page) and nested scroll containers
 * (onboarding / vendor in-panel previews).
 */
export function scrollToElementIfNeeded(
  el: HTMLElement | null,
  options?: {
    headerOffsetPx?: number;
    scrollContainer?: HTMLElement | null;
    /** Framed onboarding / vendor previews — scroll the panel even before overflow is measurable. */
    trustEmbeddedScrollContainer?: boolean;
  },
): void {
  if (!el) return;

  const headerOffsetPx = options?.headerOffsetPx ?? 72;
  const container = options?.scrollContainer;
  const useContainer =
    !!container &&
    (options?.trustEmbeddedScrollContainer ||
      container.scrollHeight > container.clientHeight + 1);

  if (useContainer && container) {
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const offsetWithinViewport = elRect.top - cRect.top;
    const inComfortZone =
      offsetWithinViewport >= headerOffsetPx &&
      offsetWithinViewport <= container.clientHeight * 0.42;

    if (inComfortZone) return;

    const top =
      offsetWithinViewport + container.scrollTop - headerOffsetPx;
    container.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    return;
  }

  const rect = el.getBoundingClientRect();
  const inComfortZone =
    rect.top >= headerOffsetPx && rect.top <= window.innerHeight * 0.42;

  if (inComfortZone) return;

  const top = rect.top + window.scrollY - headerOffsetPx;
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
}
