/**
 * # Discount Management — API contract for backend
 *
 * Frontend: `/vendor/discounts` (+ entry points on Edit Event & Event Overview)
 *
 * ## UX entry points
 * - Sidebar → Discounts (full hub)
 * - Edit Event header → compact “Promotions for this event”
 * - Event Overview → full discounts panel
 * - Deep links: `/vendor/discounts?eventId=` and `/vendor/discounts/create?eventId=`
 *
 * ## Endpoints
 *
 * | Method | Path | Purpose |
 * |--------|------|---------|
 * | GET | `/api/vendor/discounts` | List + filters (`category`, `status`, `event_id`, `search`, `page`) |
 * | POST | `/api/vendor/discounts` | Create (body = `DiscountFormPayload`) |
 * | GET | `/api/vendor/discounts/{id}` | Show one |
 * | PUT/PATCH | `/api/vendor/discounts/{id}` | Update |
 * | PATCH | `/api/vendor/discounts/{id}/status` | `{ status: "active" \| "inactive" }` |
 * | DELETE | `/api/vendor/discounts/{id}` | Soft/hard delete |
 *
 * ## Create / update body (`DiscountFormPayload`)
 *
 * ```json
 * {
 *   "name": "Summer Festival 15% Off",
 *   "category": "event_specific | date_wise | coupon_code",
 *   "location_id": 1,
 *   "event_id": 101,
 *   "room_id": 11,
 *   "applicable_dates": ["2026-08-15", "2026-08-16"],
 *   "coupon_code": "SUMMER20",
 *   "value_type": "percentage | flat",
 *   "discount_value": 15,
 *   "flat_mode": "flat_on_total | flat_per_person | null",
 *   "min_people": 8,
 *   "valid_from": "2026-08-01",
 *   "expires_at": "2026-08-31",
 *   "status": "active | inactive"
 * }
 * ```
 *
 * ## Category rules
 *
 * - **event_specific** — whole event; `room_id` / `applicable_dates` / `coupon_code` null
 * - **date_wise** — require `room_id` + `applicable_dates[]`
 * - **coupon_code** — require `coupon_code` (unique per vendor, case-insensitive); reusable until expiry
 *
 * ## Value rules
 *
 * - **percentage** — `discount_value` 1–100; `flat_mode` / `min_people` null
 * - **flat** — require `flat_mode`
 *   - `flat_on_total` — amount off order total
 *   - `flat_per_person` — require `min_people`; amount × headcount when min met
 * - Payable must never go below 0
 *
 * ## Types source of truth (frontend)
 * `src/app/(protected)/vendor/discounts/_lib/types.ts`
 */
