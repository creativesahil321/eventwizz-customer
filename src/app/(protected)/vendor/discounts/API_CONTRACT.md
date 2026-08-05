/**
 * # Discount Management — API contract
 *
 * ## List (wired)
 *
 * `GET /api/v1/vendor/discounts?category=&status=&search=&page=&per_page=&vendor_event_id=`
 *
 * Categories: `discount` | `coupon_code`
 *
 * ## Events for create Scope (wired)
 *
 * `GET /api/v1/vendor/discounts/locations-with-events`
 *
 * Header: `x-venue-location-id`
 *
 * Returns published events for the current header location:
 * event → dates (`date_id`) → optional `rooms`.
 *
 * Create Scope UI: **Event → Date → Room** (room only when that date has rooms).
 *
 * ## Create (wired)
 *
 * `POST /api/v1/vendor/discounts/store`
 *
 * Location comes from header `x-venue-location-id` (not the body).
 *
 * ### Discount — without room
 * ```json
 * {
 *   "category": "discount",
 *   "vendor_event_id": 556,
 *   "date_id": 1974,
 *   "discount_type": "percentage",
 *   "amount": 10,
 *   "name": "10% off",
 *   "valid_from": "2026-08-07",
 *   "expires_at": "2026-08-10",
 *   "status": "inactive"
 * }
 * ```
 *
 * ### Discount — with room
 * ```json
 * {
 *   "category": "discount",
 *   "vendor_event_id": 556,
 *   "date_id": 1974,
 *   "room_id": 114,
 *   "discount_type": "percentage",
 *   "amount": 10,
 *   "name": "10% off",
 *   "valid_from": "2026-08-07",
 *   "expires_at": "2026-08-10",
 *   "status": "inactive"
 * }
 * ```
 *
 * ### Coupon — all active customers
 * ```json
 * {
 *   "category": "coupon_code",
 *   "vendor_event_id": 556,
 *   "coupon_code": "SUMMER20",
 *   "customer_audience": "all_active",
 *   "discount_type": "percentage",
 *   "amount": 20,
 *   "name": "SUMMER20",
 *   "valid_from": "2026-08-07",
 *   "expires_at": "2026-08-31",
 *   "status": "active"
 * }
 * ```
 *
 * ### Coupon — selected customers
 * ```json
 * {
 *   "category": "coupon_code",
 *   "vendor_event_id": 556,
 *   "coupon_code": "VIP15",
 *   "customer_audience": "selected",
 *   "customer_ids": [101, 102],
 *   "discount_type": "flat",
 *   "flat_mode": "total",
 *   "amount": 15,
 *   "name": "VIP15",
 *   "valid_from": "2026-08-07",
 *   "expires_at": "2026-09-30",
 *   "status": "active"
 * }
 * ```
 *
 * Types: `_lib/types.ts` · Mapper: `_lib/build-store-payload.ts` · Service: `discounts.service.ts`
 */
