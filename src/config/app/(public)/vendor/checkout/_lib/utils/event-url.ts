/**
 * Utility functions for generating event-related URLs
 */

export type EventDetailsUrlOptions = {
  /** Optional hash anchor to scroll to (e.g. '#booking') */
  hashAnchor?: string;
  /** Deep-link the public event page to a specific room */
  roomId?: number | null;
};

/**
 * Generate event details page URL with optional room query + hash anchor.
 *
 * @returns `/{location}/events/{event}?roomId={id}#booking` (parts omitted when unset)
 */
export function generateEventDetailsUrl(
  locationSlug: string | null,
  eventSlug: string | null,
  hashAnchorOrOptions?: string | EventDetailsUrlOptions,
): string | null {
  if (!locationSlug || !eventSlug) {
    return null;
  }

  const options: EventDetailsUrlOptions =
    typeof hashAnchorOrOptions === "string"
      ? { hashAnchor: hashAnchorOrOptions }
      : (hashAnchorOrOptions ?? {});

  const params = new URLSearchParams();
  const roomId = Number(options.roomId);
  if (Number.isFinite(roomId) && roomId > 0) {
    params.set("roomId", String(roomId));
  }

  const query = params.toString();
  const baseUrl = `/${locationSlug}/events/${eventSlug}${
    query ? `?${query}` : ""
  }`;
  const hash = options.hashAnchor?.trim();
  if (!hash) return baseUrl;
  return `${baseUrl}${hash.startsWith("#") ? hash : `#${hash}`}`;
}

/**
 * Generate event booking section URL (`#booking`), optionally scoped to a room.
 */
export function generateEventBookingUrl(
  locationSlug: string | null,
  eventSlug: string | null,
  roomId?: number | null,
): string | null {
  return generateEventDetailsUrl(locationSlug, eventSlug, {
    hashAnchor: "#booking",
    roomId,
  });
}
