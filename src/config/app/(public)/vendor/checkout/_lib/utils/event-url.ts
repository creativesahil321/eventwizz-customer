/**
 * Utility functions for generating event-related URLs
 */

/**
 * Generate event details page URL with optional hash anchor
 *
 * @param locationSlug - The location slug
 * @param eventSlug - The event slug
 * @param hashAnchor - Optional hash anchor to scroll to (e.g., '#booking')
 * @returns Complete event details page URL or null if slugs are missing
 */
export function generateEventDetailsUrl(
  locationSlug: string | null,
  eventSlug: string | null,
  hashAnchor?: string
): string | null {
  if (!locationSlug || !eventSlug) {
    return null;
  }

  const baseUrl = `/${locationSlug}/events/${eventSlug}`;
  return hashAnchor ? `${baseUrl}${hashAnchor}` : baseUrl;
}

/**
 * Generate event booking section URL
 * Shorthand for generating URL with #booking hash
 *
 * @param locationSlug - The location slug
 * @param eventSlug - The event slug
 * @returns Event details page URL with #booking anchor or null
 */
export function generateEventBookingUrl(
  locationSlug: string | null,
  eventSlug: string | null
): string | null {
  return generateEventDetailsUrl(locationSlug, eventSlug, "#booking");
}
