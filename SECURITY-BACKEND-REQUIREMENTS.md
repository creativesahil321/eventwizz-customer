# EventWizz — Backend (Laravel) Security Requirements

**Audience:** Backend/Laravel developer.
**Context:** The frontend (Next.js) security review is complete and the frontend-owned fixes are applied (see `SECURITY-FIXES-APPLIED.md`). The items below **cannot be fixed on the frontend** — they are the server-side half of the security model. The backend is the real security boundary; the frontend now assumes you enforce everything here.

The golden rule for every item: **derive identity, tenant, role, permissions, and price from the authenticated token on the server. Never trust anything the client sends in the body or in headers.**

---

## Why API calls are visible in DevTools (and what actually matters)

You will see every backend call (e.g. `GET /api/v1/blogs?per_page=5&page=1`) in the browser's **Network tab**. This is **normal and not a vulnerability**:

- EventWizz is a client-side app — the browser calls the Laravel API **directly** (`NEXT_PUBLIC_API_URL`). DevTools shows **every** request a browser makes; this is true of every web app.
- **You cannot hide API endpoints** from anyone who controls their own browser (DevTools, `curl`, a proxy). The backend URL is public by necessity — the browser must connect to it.
- Therefore **security is NOT achieved by hiding endpoints.** It is achieved by the server **authorizing every request**.

**The only questions that matter for each endpoint are:**

1. **Is it supposed to be public?** Public content (e.g. `/blogs`, public event/vendor pages) being visible and callable is fine.
2. **If it returns private or tenant-scoped data, does it enforce auth + ownership server-side?** Anyone can call it with any ID or any token — so the server must reject unauthorized access (→ **B1** IDOR, **B2** tenant isolation, **B3** trust model).
3. **Does CORS only allow our own origins?** (→ **B10**.)

**Quick self-test:** open DevTools on a logged-in session, copy a request to a *private* resource as `curl`, then (a) replay it with **no token** and (b) replay it with **another user's / another vendor's ID**. Both must return **401/403/404 with no data**. If either returns data, that's the real bug — not the fact that the call was visible.

> Takeaway: a visible request is expected. A visible request that returns data it shouldn't is the vulnerability. Fix it server-side (B1–B3), never by trying to hide the call.

---

## B1 — Enforce object-level authorization on every resource (IDOR) — CRITICAL

**Problem:** The frontend addresses resources by ID (`booking_id`, `event_id`, `location_id`, `room_id`, `table_id`, `ticket_id`, `support_ticket_id`, `payment_id`, `transaction_id`, media IDs). The frontend has **no** authorization — it's all UI. If the API returns a record just because the ID exists, any logged-in user can read/modify another user's or another vendor's data.

**Required:**
- For every `GET/PUT/PATCH/DELETE /…/{id}` endpoint, verify the authenticated user owns or is scoped to that object **before** returning or mutating it. Use Laravel Policies / Gates (`$this->authorize('view', $booking)`), not controller `if` checks only.
- Scope all Eloquent queries by the authenticated identity: `Booking::where('customer_id', $user->id)` / `->where('vendor_id', $vendor->id)`, or a global scope. Never `Booking::find($id)` and return it.
- Return `403`/`404` with **no** record data in the body, error, related objects, or pagination.

**Acceptance test:** As Customer A capture `GET /bookings/{A_id}`; replay with Customer B's token → must be 403/404 with no data. Repeat Vendor A → Vendor B for events/locations/rooms/tables/tickets/support/media.

---

## B2 — Tenant isolation: ignore client-supplied tenant/location — CRITICAL

**Problem:** The frontend sends these on every request and **cannot be trusted**:
- `X-Domain` — derived from the browser hostname (and from a `?domain=` query param in dev).
- `X-Venue-Location-Id` — read from client `localStorage`; a vendor can set any value.
- `X-Impersonating: true` — a client-set flag.
- `domain_name` — sent in the login body.

**Required:**
- Resolve the tenant/vendor and the **set of locations the user may access** from the authenticated token server-side.
- Treat `X-Venue-Location-Id` as a *selection hint only*: validate it is within the user's allowed locations; reject otherwise. Never use it to scope data without that ownership check.
- Cross-check `X-Domain` against the authenticated user's tenant; reject mismatches (you already return `"Invalid domain access"` for some cases — ensure it covers **all** read and write paths, not just a few).
- Never grant impersonation based on `X-Impersonating`. Determine impersonation from the token/session server-side; use the header only as an untrusted audit hint (or drop it).

**Acceptance test:** As Vendor A, replay a valid request changing only `X-Venue-Location-Id` (and `X-Domain`) to Vendor B's → must be rejected, for both reads and writes.

---

## B3 — Do not trust client-supplied role / permissions / account_type — CRITICAL

**Problem:** The NextAuth session is minted partly from client-supplied fields (a `token`-based login path and impersonation restore pass `account_type`, `active_role`, `permissions` from the browser). So the session's role/permissions are **not authoritative**. A user can claim `account_type: "admin"` with any permission set.

**Required:**
- Authorization decisions on the API must use the user resolved from the **bearer token**, and the role/permissions stored **server-side** for that user — never a role/permission/account_type value sent by the client.
- Provide a trustworthy identity endpoint (e.g. `GET /me`) that returns the authoritative `account_type`, `active_role`, and `permissions` for the token. (The frontend can then stop trusting its own client-set claims — see B8.)
- Enforce every permission server-side (Policies/Gates/Form Request `authorize()`), even for actions the UI already hides.

**Acceptance test:** Take a low-privilege user's valid token; call an admin-only endpoint directly (bypassing the UI) → must be 403 regardless of any role/permission fields in the request.

---

## B4 — Payments must be server-authoritative + webhook-verified — CRITICAL

**Problem:** A malicious client could try to set amount, currency, deposit, `payment_status`, `booking_status`, or flip paid/unpaid. The frontend cannot guarantee any of this.

**Required:**
- Compute **all** amounts/totals/deposits server-side from your own prices by ID. Ignore any price/amount/total in the request body.
- Set `payment_status` / `booking_status` **only** from verified Stripe **webhooks** with signature verification (`Stripe-Signature`, `Webhook::constructEvent`). Never mark a booking paid from a client call.
- Make the Stripe `PaymentIntent` amount server-derived; verify the returned intent matches before confirming the booking.

**Acceptance test:** Attempt to confirm/flip a booking to paid by calling the API directly → must fail. Tamper the posted amount → server recomputes and ignores it.

---

## B5 — Booking business rules enforced server-side — HIGH

Enforce all of these on the server (the frontend checks are UX only and bypassable):
- min/max persons per table, table/ticket quantity limits, event availability/capacity, expired/unavailable event rejection.
- Duplicate-booking / replay protection (idempotency key or state check).
- Discounts: validity window, active flag, usage limits, ownership/tenant scope, **no negative values**, no unauthorized stacking, server-side percentage/fixed computation.

**Acceptance test:** Tamper quantity/guest counts/min-persons, book an expired event, apply an expired/negative/stacked discount → all rejected.

---

## B6 — Race conditions / atomic allocation — HIGH

**Problem:** Concurrent requests can double-allocate the last table/ticket or reuse a single-use coupon.

**Required:** Use DB transactions + row locking (`lockForUpdate`) or atomic conditional updates / unique constraints for: table & ticket allocation, coupon redemption, payment initiation.

**Acceptance test:** Fire ~5–10 concurrent requests for the last unit / single-use coupon → exactly one succeeds.

---

## B7 — Input validation, mass assignment, SQL injection — HIGH

- Validate every endpoint with Form Requests (types, ranges, enums) — especially IDs, search, filter, sort, pagination, slug, domain.
- Use parameterized queries / Eloquent bindings everywhere; never interpolate request input into raw SQL (`DB::raw`, `whereRaw`, `orderByRaw` with user input are the danger spots — audit these).
- Lock down mass assignment: explicit `$fillable` (not broad `$guarded = []`). Ensure fields like `vendor_id`, `customer_id`, `role`, `permissions`, `status`, `price`, `is_admin` can **never** be set from request input.

**Acceptance test:** Send extra fields (`vendor_id`, `role`, `price`, `status`) in create/update bodies → they must be ignored. Inject SQL meta-characters into search/sort/filter → no SQL error / no injection.

---

## B8 — Enable a token model that lets the frontend stop storing the token in localStorage — HIGH (coordination)

**Problem (frontend):** The Laravel bearer token is currently mirrored into `localStorage`, so any XSS can steal a 7-day token. We want to remove it from web storage, but that needs a backend-supported mechanism.

**Pick one and we'll wire the frontend to it:**
- **(Preferred) HttpOnly cookie / BFF:** allow the Next.js server to hold the token and call you server-side; or issue an HttpOnly, Secure, SameSite cookie the browser never exposes to JS. Requires CORS `Access-Control-Allow-Credentials: true` with an exact origin allowlist (never `*`).
- **Short-lived access token + refresh:** issue a short TTL (e.g. 15 min) access token + a refresh endpoint, so a stolen token has a small window.

Also: expose `POST /auth/verify-token` or `GET /me` (see B3) so the frontend can refresh authoritative role/permissions instead of trusting its own client-set session.

---

## B9 — API-level rate limiting & abuse protection — MEDIUM

- Throttle `login`, `password reset`, `registration`, `OTP/email verification` (Laravel `throttle` middleware) to stop brute force and user-enumeration.
- Ensure password-reset tokens are single-use, short-lived, unpredictable, and invalidated after use/expiry.
- Ensure login/reset responses do **not** reveal whether an email exists (uniform messaging/timing).

---

## B10 — CORS, file storage, and headers — MEDIUM

- **CORS:** do not reflect arbitrary `Origin` with `Access-Control-Allow-Credentials: true`. Use an exact allowlist (the customer + admin/vendor app origins).
- **Uploads:** validate type by magic bytes (not just extension/MIME); store user files on a separate domain or serve with `Content-Type` + `X-Content-Type-Options: nosniff` + `Content-Disposition: attachment`; **never** serve user-uploaded SVG inline from the app origin. Use unpredictable object keys / signed URLs for private files.
- **Sanitize rich text on write:** the frontend now sanitizes HTML on render (DOMPurify), but you should **also** sanitize/validate stored HTML (event descriptions, blog, CMS, support) on write as defense-in-depth.
- Verify any server-side URL fetching you do (image import, webhooks) blocks internal/metadata addresses (SSRF), mirroring the frontend `safeFetch` guard.

---

## Priority order

1. **B1, B2, B3, B4** (CRITICAL) — authorization, tenant isolation, trust model, payments.
2. **B5, B6, B7, B8** (HIGH) — business rules, concurrency, input/mass-assignment, token model.
3. **B9, B10** (MEDIUM) — rate limiting, CORS/uploads/headers, write-side sanitization.

> Single most important change: **every endpoint authorizes the token-resolved user against the specific object/tenant/location/price — client-sent role, permissions, location, domain, and amounts are ignored.**
