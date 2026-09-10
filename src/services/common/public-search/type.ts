/** Public vendor search & availability — `/domain/{domain}/search` contracts */

export type PublicSearchMode = "auto" | "events" | "dates" | "categories";

export type PublicSearchMatchType = "none" | "category" | "event" | "mixed";

export type PublicSearchResultType = "events" | "dates";

export type PublicSearchCategory = {
  id: number;
  name: string;
  slug: string;
};

export type PublicSearchLocation = {
  slug: string;
  city: string;
  address?: string;
  /** Exact event pin address from the event page (Near Me). */
  event_address?: string | null;
  /** Event pin latitude (Near Me). */
  lat?: number | null;
  /** Event pin longitude (Near Me). */
  lng?: number | null;
};

export type PublicSearchEventCard = {
  name: string;
  slug: string;
  banner_image: string | null;
  lowest_price: number | null;
  category: PublicSearchCategory | null;
  next_available_date: string | null;
  start_time: string | null;
  end_time: string | null;
};

export type SearchEventResult = {
  type: "event";
  event: PublicSearchEventCard;
  location: PublicSearchLocation;
  href: {
    location: string;
    event: string;
  };
  /** Present when Near Me geo search is active — km from customer to event pin. */
  distance_km?: number | null;
};

export type SearchDateSlotResult = {
  type: "date_slot";
  date: string;
  price: number | null;
  sold_out: boolean;
  /**
   * Remaining bookable inventory for this date (and room, when present).
   * Omitted when sold out or no tickets/tables left.
   */
  booking_option?: "tickets" | "tables" | "both";
  event: { name: string; slug: string };
  location: {
    slug: string;
    city: string;
    /** Event pin from the event page — shared by all rooms of this event. */
    event_address?: string | null;
  };
  room?: { room_id: number | null; room_name: string | null };
  href: { event: string };
  bookable: {
    slug: string;
    event_date: string;
    room_id?: number;
  };
};

export type PublicSearchResult = SearchEventResult | SearchDateSlotResult;

export type PublicSearchMeta = {
  domain: string;
  q: string | null;
  city: string | null;
  location_slug: string | null;
  date: string | null;
  match_type: PublicSearchMatchType;
  matched_category: PublicSearchCategory | null;
  result_type: PublicSearchResultType;
  mode: string;
  page: number;
  per_page: number;
  total: number;
  /** Near Me geo search enrichments (only when lat+lng were sent). */
  near_me?: boolean;
  lat?: number | null;
  lng?: number | null;
  radius_km?: number | null;
  sort?: string | null;
  coordinate_source?: "event_pin" | string | null;
};

export type PublicSearchData = {
  meta: PublicSearchMeta;
  results: PublicSearchResult[];
};

export type PublicSearchParams = {
  q?: string;
  city?: string;
  location_slug?: string;
  date?: string;
  mode?: PublicSearchMode;
  page?: number;
  per_page?: number;
  /** Customer GPS — activates Near Me event-pin ranking when both are set. */
  lat?: number;
  lng?: number;
  /** Defaults to 50 on the backend when omitted. */
  radius_km?: number;
  /** Backend defaults to `distance` when geo is active. */
  sort?: "distance" | string;
};

export type PublicAvailabilityRoom = {
  room_id: number | null;
  room_name: string | null;
  price: number | null;
  sold_out: boolean;
};

export type PublicAvailabilityEvent = {
  slug: string;
  name: string;
  rooms: PublicAvailabilityRoom[];
  /** Explicit seasonal theme when the API provides it. */
  event_theme?: string | null;
  eventTheme?: string | null;
  category?: string | null;
};

export type PublicAvailabilityLocation = {
  slug: string;
  city: string;
  events: PublicAvailabilityEvent[];
};

export type PublicAvailabilityDay = {
  date: string;
  slot_count: number;
  locations: PublicAvailabilityLocation[];
};

export type PublicAvailabilityData = {
  from: string;
  to: string;
  days: PublicAvailabilityDay[];
};

export type PublicAvailabilityParams = {
  from: string;
  to: string;
  q?: string;
  city?: string;
  location_slug?: string;
  event_slug?: string;
  group_by?: "date";
};
