import type {
  Discount,
  DiscountEventOption,
  DiscountLocationOption,
  DiscountRoomOption,
} from "./types";

/** Dummy lookups for create wizard until location/event/room APIs are wired */
export const DUMMY_LOCATIONS: DiscountLocationOption[] = [
  { id: 1, name: "London" },
  { id: 2, name: "Manchester" },
  { id: 3, name: "Birmingham" },
];

export const DUMMY_EVENTS: DiscountEventOption[] = [
  { id: 101, location_id: 1, name: "Summer Music Festival" },
  { id: 102, location_id: 1, name: "Corporate Gala Night" },
  { id: 201, location_id: 2, name: "Jazz Evening" },
  { id: 301, location_id: 3, name: "New Year Ball" },
];

export const DUMMY_ROOMS: DiscountRoomOption[] = [
  { id: 11, event_id: 101, name: "Main Hall" },
  { id: 12, event_id: 101, name: "Garden Room" },
  { id: 21, event_id: 102, name: "Grand Ballroom" },
  { id: 31, event_id: 201, name: "Lounge A" },
  { id: 41, event_id: 301, name: "Ballroom East" },
];

/** Fallback sample — list page uses live GET /vendor/discounts */
export const DUMMY_DISCOUNTS: Discount[] = [
  {
    id: 1,
    name: "Summer Festival 15% Off",
    category: "event_specific",
    coupon_code: null,
    discount_type: "percentage",
    flat_mode: null,
    amount: 15,
    min_people: null,
    customer_audience: null,
    status: "active",
    stored_status: "active",
    value_label: "15% off",
    summary:
      "Event Specific - London - Summer Music Festival - Expires 2026-08-31",
    vendor_location_id: 3,
    vendor_event_id: 12,
    room_id: null,
    location: { id: 3, name: "London" },
    event: { id: 12, name: "Summer Music Festival" },
    room: null,
    applicable_dates: [],
    valid_from: "2026-06-01",
    expires_at: "2026-08-31",
    redemption_count: 0,
    emails_sent_at: null,
    created_at: "2026-07-30 17:00:00",
    updated_at: "2026-07-30 17:00:00",
  },
];
