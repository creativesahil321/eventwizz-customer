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
};

export type PublicSearchEventCard = {
  name: string;
  slug: string;
  banner_image: string | null;
  lowest_price: number | null;
  category: PublicSearchCategory | null;
  next_available_date: string | null;
};

export type SearchEventResult = {
  type: "event";
  event: PublicSearchEventCard;
  location: PublicSearchLocation;
  href: {
    location: string;
    event: string;
  };
};

export type SearchDateSlotResult = {
  type: "date_slot";
  date: string;
  price: number | null;
  sold_out: boolean;
  event: { name: string; slug: string };
  location: { slug: string; city: string };
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
