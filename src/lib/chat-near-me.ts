import { requestUserLocation } from "@/lib/request-user-location";
import {
  MAX_LIVE_EVENT_CHAT_CHOICES,
  buildNearMeEventsReply,
} from "@/lib/chat-live-events";
import { publicSearchService } from "@/services/common/public-search";
import type { PublicSearchResult } from "@/services/common/public-search";
import type { LiveEvent } from "@/types/theme.types";

/** Same radius the storefront Near Me search uses. */
export const NEAR_ME_CHAT_RADIUS_KM = 50;

export type NearMeChatEvent = LiveEvent & {
  distanceKm?: number | null;
};

export type NearMeChatFetchResult =
  | { status: "ok"; events: NearMeChatEvent[]; radiusKm: number }
  | { status: "no_location"; message: string }
  | { status: "empty"; radiusKm: number }
  | { status: "error"; message: string };

function titleCaseCity(city: string): string {
  return city
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function eventBookSendText(event: LiveEvent): string {
  return `Book ${event.title} in ${titleCaseCity(event.location_city)}`;
}

export function formatNearMeDistanceKm(
  km: number | null | undefined,
): string | null {
  if (typeof km !== "number" || !Number.isFinite(km) || km < 0) return null;
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${rounded} km`;
}

function nearMeChoiceLabel(event: NearMeChatEvent): string {
  const parts = [event.title];
  const city = titleCaseCity(event.location_city);
  if (city) parts.push(city);
  const distance = formatNearMeDistanceKm(event.distanceKm);
  if (distance) parts.push(distance);
  const raw = parts.join(" · ");
  if (raw.length <= 120) return raw;
  return event.title.length <= 120
    ? event.title
    : `${event.title.slice(0, 117)}…`;
}

export function liveEventsFromNearMeResults(
  results: PublicSearchResult[],
): NearMeChatEvent[] {
  const out: NearMeChatEvent[] = [];
  const seen = new Set<string>();
  for (const row of results) {
    const slug = row.event.slug?.trim();
    const title = row.event.name?.trim();
    const locationSlug = row.location.slug?.trim();
    const city = row.location.city?.trim();
    if (!slug || !title || !locationSlug || !city) continue;
    const key = `${slug}|${locationSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const distanceKm =
      row.type === "event" && typeof row.distance_km === "number"
        ? row.distance_km
        : null;
    out.push({
      title,
      slug,
      location_slug: locationSlug,
      location_city: city,
      category_name:
        row.type === "event" ? (row.event.category?.name ?? null) : null,
      distanceKm,
    });
  }
  return out;
}

export function buildNearMeSearchReply(options: {
  events: NearMeChatEvent[];
  radiusKm?: number;
  userName?: string | null;
  siteName?: string | null;
  allLiveEvents: LiveEvent[];
}): { content: string } {
  const radiusKm = options.radiusKm ?? NEAR_ME_CHAT_RADIUS_KM;
  if (options.events.length === 0) {
    return buildNearMeEventsReply({
      allLiveEvents: options.allLiveEvents,
      siteName: options.siteName,
      userName: options.userName,
      reason: "empty",
      radiusKm,
    });
  }

  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const shown = options.events.slice(0, MAX_LIVE_EVENT_CHAT_CHOICES);
  const more =
    options.events.length > shown.length
      ? ` Showing ${shown.length} of ${options.events.length} — tell me the event name if you don’t see it.`
      : "";
  const lines = shown
    .map(
      (event) =>
        `[${nearMeChoiceLabel(event)}](chat:${eventBookSendText(event)})`,
    )
    .join("\n");

  return {
    content: `Here are events within ${radiusKm} km of you${nameBit} — closest first.${more}\n\n${lines}\n\nTap one and I’ll book it here in chat.`,
  };
}

export async function fetchNearMeEventsForChat(
  domain: string,
): Promise<NearMeChatFetchResult> {
  const host = domain.split(":")[0]?.trim();
  if (!host) {
    return {
      status: "error",
      message:
        "I can’t look up Near Me events without this venue’s site.",
    };
  }

  const location = await requestUserLocation();
  if (!location.ok) {
    return { status: "no_location", message: location.message };
  }

  try {
    const data = await publicSearchService.search(host, {
      lat: location.coords.lat,
      lng: location.coords.lng,
      radius_km: NEAR_ME_CHAT_RADIUS_KM,
      sort: "distance",
      mode: "auto",
      per_page: 40,
    });
    const events = liveEventsFromNearMeResults(data.results ?? []);
    const radiusKm =
      typeof data.meta.radius_km === "number" &&
      Number.isFinite(data.meta.radius_km)
        ? data.meta.radius_km
        : NEAR_ME_CHAT_RADIUS_KM;
    if (events.length === 0) {
      return { status: "empty", radiusKm };
    }
    return { status: "ok", events, radiusKm };
  } catch {
    return {
      status: "error",
      message:
        "I couldn’t load events near you just now. Please try again, or tell me a city.",
    };
  }
}
