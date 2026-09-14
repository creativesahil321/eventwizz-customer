import type { SiteEssentials } from "@/services/common/site-essentials/type";
import type { EventPayload } from "@/services/common/events/type";

/**
 * Site-essentials onboarding preview: `data` plus `data.event` (same EventPayload
 * as GET /domain/{domain}/events/{slug}, plus `event_id`).
 */
export type OnboardingPreviewEventData = SiteEssentials & {
  event?: EventPayload & { event_id?: number };
};
