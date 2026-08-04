/**
 * # Discount Management — API contract
 *
 * ## List (wired)
 *
 * `GET /api/v1/vendor/discounts?category=&status=&search=&page=&per_page=&vendor_event_id=`
 *
 * ## Locations + events for create dropdowns (wired)
 *
 * `GET /api/v1/vendor/discounts/locations-with-events`
 *
 * Returns locations with nested `events` → `rooms` → `dates` — used for Location,
 * Event, Room, and Applicable dates selects on create/edit.
 *
 * ```json
 * {
 *   "status": true,
 *   "message": "Success",
 *   "data": [
 *     {
 *       "id": 3,
 *       "city": "kangra",
 *       "events": [
 *         {
 *           "id": 12,
 *           "name": "Jazz Evening",
 *           "rooms": [
 *             {
 *               "id": 5,
 *               "name": "Lounge A",
 *               "dates": [
 *                 { "id": 101, "date": "2026-07-31" },
 *                 { "id": 102, "date": "2026-08-08" }
 *               ]
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ],
 *   "errors": []
 * }
 * ```
 *
 * ## Create (wired)
 *
 * `POST /api/v1/vendor/discounts/store`
 *
 * ### 1) Event specific
 * ```json
 * {
 *   "category": "event_specific",
 *   "vendor_location_ids": [3, 7],
 *   "vendor_event_ids": [12, 21],
 *   "discount_type": "percentage",
 *   "amount": 15,
 *   "name": "Summer Festival 15% Off",
 *   "valid_from": "2026-06-01",
 *   "expires_at": "2026-08-31",
 *   "status": "active"
 * }
 * ```
 *
 * ### 2) Date wise
 * ```json
 * {
 *   "category": "date_wise",
 *   "vendor_location_ids": [3],
 *   "vendor_event_ids": [12],
 *   "room_ids": [5, 6],
 *   "applicable_date_ids": [101, 102],
 *   "discount_type": "flat",
 *   "flat_mode": "per_person",
 *   "amount": 10,
 *   "min_people": 8,
 *   "name": "Weekday Lounge Deal",
 *   "valid_from": null,
 *   "expires_at": "2026-09-30",
 *   "status": "active"
 * }
 * ```
 * Flat on total uses `"flat_mode": "on_total"` (no `min_people`).
 *
 * ### 3) Coupon code
 * ```json
 * {
 *   "category": "coupon_code",
 *   "vendor_location_ids": [3],
 *   "vendor_event_ids": [12],
 *   "coupon_code": "SUMMER20",
 *   "customer_audience": "selected",
 *   "customer_ids": [101, 102, 103],
 *   "discount_type": "percentage",
 *   "amount": 20,
 *   "name": "SUMMER20",
 *   "valid_from": "2026-06-01",
 *   "expires_at": "2026-08-31",
 *   "status": "active"
 * }
 * ```
 * All active customers: `"customer_audience": "all_active"` (omit `customer_ids`).
 * If status is `active` on a coupon, emails are queued on submit.
 *
 * ## Assumed (not confirmed)
 * GET/PUT/PATCH status/DELETE by id
 *
 * Types: `_lib/types.ts` · Mapper: `_lib/build-store-payload.ts` · Service: `discounts.service.ts`
 */
