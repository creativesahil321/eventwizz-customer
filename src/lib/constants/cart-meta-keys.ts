export const CART_METADATA_KEYS = [
  "event_name",
  "event_slug",
  "event_image",
  "drinks",
  "drink_title",
  "vendor_event_id",
  "payment_gateways",
] as const;

export const CART_METADATA_KEYS_SET = new Set<string>(CART_METADATA_KEYS);
