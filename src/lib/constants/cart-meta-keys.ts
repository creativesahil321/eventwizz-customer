export const CART_METADATA_KEYS = [
  "event_name",
  "event_slug",
  "event_image",
  "drinks",
  "drink_title",
  "vendor_event_id",
  "payment_gateways",
  // Totals/meta fields from checkout cart API (must NOT be treated as date keys)
  "cart_sub_total",
  "cart_customer_total",
  "vendor_platform_fee",
  // Room system fields (must NOT be treated as date keys)
  "is_rooms",
  "rooms",
  "event_rooms",
  // Pending payment session — cross-device restore field (must NOT be treated as a date key)
  "pending_payment",
  // Location meta from cart GET (must NOT be treated as date keys)
  "location_name",
  "event_location",
  "city",
  // Event-level coupon from cart GET (must NOT be treated as a date key)
  "coupon",
] as const;

export const CART_METADATA_KEYS_SET = new Set<string>(CART_METADATA_KEYS);
