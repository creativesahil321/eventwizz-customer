import type { Event, GalleryImage } from "@/services/common/events/type";
import type { SiteEssentials } from "@/services/common/site-essentials/type";
import { normalizePublicBookingType } from "@/components/public/booking-type-icons";
import type { SiteEssentialsFormValues } from "./schema";

function isEventLike(value: unknown): value is Event {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.name === "string" &&
    typeof row.slug === "string" &&
    typeof row.banner_image === "string"
  );
}

export function normalizeSiteEssentialsEvents(
  value: unknown,
): Event[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isEventLike).map((event) => {
    const bookingOption =
      normalizePublicBookingType(event.booking_option) ??
      normalizePublicBookingType(event.booking_type);

    return {
      name: event.name,
      slug: event.slug,
      banner_image: event.banner_image,
      lowest_price: Number(event.lowest_price) || 0,
      event_category_name: event.event_category_name ?? null,
      event_category: event.event_category ?? null,
      category: event.category ?? null,
      event_date: event.event_date ?? null,
      next_available_date: event.next_available_date ?? null,
      next_event_date: event.next_event_date ?? null,
      formatted_date: event.formatted_date ?? null,
      date: event.date ?? null,
      start_date: event.start_date ?? null,
      start_time: event.start_time ?? null,
      end_time: event.end_time ?? null,
      event_time: event.event_time ?? null,
      formatted_time: event.formatted_time ?? null,
      time: event.time ?? null,
      event_address: event.event_address ?? null,
      ...(bookingOption ? { booking_option: bookingOption } : {}),
    };
  });
}

export function normalizeSiteEssentialsGallery(
  value: unknown,
): GalleryImage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === "string" && item.trim()) {
        return { id: index + 1, url: item.trim() };
      }
      if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof (item as GalleryImage).url === "string"
      ) {
        const row = item as GalleryImage;
        return {
          id: row.id ?? index + 1,
          url: row.url,
        };
      }
      return null;
    })
    .filter((row): row is GalleryImage => row !== null);
}

/** Prefer editor listing rows; copy `booking_option` from the API when the snapshot omitted it. */
export function mergeSiteEssentialsListingEvents(
  formEvents: unknown,
  apiEvents: unknown,
): Event[] {
  const preferred = normalizeSiteEssentialsEvents(formEvents);
  const fallback = normalizeSiteEssentialsEvents(apiEvents);
  if (preferred.length === 0) return fallback;

  const optionBySlug = new Map(
    fallback.flatMap((event) =>
      event.booking_option ? [[event.slug, event.booking_option] as const] : [],
    ),
  );

  return preferred.map((event) => {
    if (event.booking_option) return event;
    const fromApi = optionBySlug.get(event.slug);
    return fromApi ? { ...event, booking_option: fromApi } : event;
  });
}

export function pickPreviewEventsFromSiteEssentials(
  values: SiteEssentialsFormValues | SiteEssentials,
): {
  latestEvents: Event[];
  upcomingEvents: Event[];
  galleryImages: GalleryImage[];
  locationSlug: string;
} {
  const record = values as SiteEssentialsFormValues &
    Pick<
      SiteEssentials,
      "latest_events" | "upcoming_events" | "event_gallery" | "slug"
    >;

  return {
    latestEvents: normalizeSiteEssentialsEvents(record.latest_events),
    upcomingEvents: normalizeSiteEssentialsEvents(record.upcoming_events),
    galleryImages: normalizeSiteEssentialsGallery(record.event_gallery),
    locationSlug:
      typeof record.slug === "string" ? record.slug.trim() : "",
  };
}
