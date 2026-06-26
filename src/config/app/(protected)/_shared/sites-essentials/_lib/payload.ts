import { SiteEssentialsFormValues } from "./schema";

/** Read-only API fields — not sent on PATCH. */
export function toSiteEssentialsUpdatePayload(
  values: SiteEssentialsFormValues,
): Partial<SiteEssentialsFormValues> {
  const {
    locations: _locations,
    slug: _slug,
    latest_events: _latestEvents,
    upcoming_events: _upcomingEvents,
    event_gallery: _eventGallery,
    ...payload
  } = values;
  return payload;
}
