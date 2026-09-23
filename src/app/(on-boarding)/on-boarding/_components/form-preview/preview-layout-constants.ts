import { EVENT_HEADER_OFFSET } from "@/lib/event-sticky-scroll-offset";

/** Sticky CommonHeader height — follows the measured bar, not a fixed desktop rem. */
export const ONBOARDING_PREVIEW_HEADER_OFFSET = EVENT_HEADER_OFFSET;

/** ~2–3 wheel scrolls in the preview panel before the room pill bar fades in. */
export const ONBOARDING_ROOM_SELECTOR_SCROLL_THRESHOLD_PX = 280;

export { PREVIEW_CONTAINER_CLASS } from "@/lib/preview-device";
