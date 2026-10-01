# EventWizz Security Audit

> **Assessment type:** Authorized, **read-only source-code security review** of the EventWizz Next.js frontend (`event-wizz`, this repository).
> **Method:** Static analysis of the codebase (auth, API client, route handlers, stores, middleware, config, dependencies). **No active/network attacks were run against the live Vercel deployments.** Findings that require the Laravel backend or a live request to confirm are explicitly marked **POTENTIAL** vs **CONFIRMED (from code)**.
> **Why code review over blackbox:** The backend (`https://eventwizz-admin.socreativesupport.com/api/v1`) is the true security boundary and is **not in this repo**. Several of the most serious items below are frontend design facts (confirmed from code); their *exploitability* depends on whether the Laravel API re-validates. Those are flagged so you can confirm server-side.

---

## Executive Summary

EventWizz is a multi-tenant, white-label events/booking platform. The reviewed component is the **Next.js 16 App Router frontend** that authenticates via **NextAuth v4 (JWT strategy)** and calls a **Laravel REST API** with a bearer token.

The frontend is generally well-structured and has *some* real server-side controls (NextAuth HttpOnly cookies, `getServerSession` layout guards, an authoritative backend location-switch). However, the security model has one recurring architectural weakness that drives most high findings:

**Client-supplied values are used as if they were trusted authority.** Specifically:
1. The **Laravel API bearer token is mirrored into `localStorage`** (JS-readable), so any XSS = full account takeover of a 7-day token.
2. **Tenant/location context (`X-Domain`, `X-Venue-Location-Id`, `X-Impersonating`, `domain_name`) is derived client-side and sent as headers** the backend may trust.
3. **Role & permissions in the NextAuth session can be set by the client** (unverified `token`-credentials path), and **all fine-grained permission gating is client-side** and editable in `localStorage`.
4. Several **unauthenticated Next.js API routes** perform **server-side URL fetches (SSRF)** and act as **open LLM proxies**.
5. **No sanitization** is applied to ~20 `dangerouslySetInnerHTML` sinks that render vendor/blog/CMS content.

The single most important architectural fix: **stop treating the frontend session/headers/permissions as authoritative — enforce identity, tenant, role and price on the Laravel side for every request**, and **remove the API token from `localStorage`**.

---

## Scope

| In scope | Notes |
|---|---|
| `eventWizz-v2` Next.js frontend (this repo) | Full static review |
| NextAuth config, API client, Zustand stores, `src/proxy.ts` middleware | Reviewed |
| `src/app/api/**` route handlers | Reviewed |
| Dependencies (`package.json` / `package-lock.json`) | `npm audit` run |
| Laravel backend source | **Not available** — behaviour inferred from client calls only |
| Live attacks against `eventwizz.vercel.app` / `eventwizz-customer.vercel.app` | **Not performed** (per responsible-testing constraints) |

---

## Test Environment

- **Customer app:** `https://eventwizz-customer.vercel.app/`
- **Admin/Vendor app:** `https://eventwizz.vercel.app/`
- **Backend API:** `https://eventwizz-admin.socreativesupport.com/api/v1` (`NEXT_PUBLIC_API_URL`)
- **Prod config facts:** `NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING=false`, `NEXT_PUBLIC_WHITE_LABEL_URL=eventwizz.vercel.app`
- **Versions:** Next.js `16.2.1`, next-auth `^4.24.11` (v4), axios `1.13.2`, sharp `0.34.5`, @faker-js/faker `9.6.0`

---

## Attack Surface

**Frontend routes** (App Router groups): `(public)` (home, vendor pages, location/event pages, blog, CMS, about), `(auth)` (login/register/reset), `(on-boarding)`, `(protected)` (`/admin/**`, `/vendor/**`, `/customer/**`), `(payment-return)`, `/preview`, plus debug pages `/debug-permissions`, `/permission-debug`, `/theme-test`.

**Next.js API routes** (`src/app/api`): `auth/[...nextauth]`, `auth/error`, `contact`, `blog-media`, `logo/process`, and AI routes `ai/{chat,color-theme,domain-suggestions,generate-event,generate-onboarding,import-event,import-website,import-website/image,list-models,summary}`.

**Backend API** (via `api-client.ts`): all business operations — auth, bookings, cart, checkout/payment, events, locations, rooms, tables, tickets, drinks, discounts, support, media, impersonation, vendor/admin/customer resources.

**Trust-boundary map (frontend → backend):** every browser→Laravel call carries `Authorization: Bearer <token>` + client-controlled `X-Domain` / `X-Venue-Location-Id` / `X-Impersonating`. The Next.js middleware (`src/proxy.ts`) is **bypassed for protected routes in production** (single-domain mode), so server-side gating in prod = NextAuth layout guards only.

---

## Authentication Findings

### AUTH-01 — Laravel API bearer token stored in `localStorage` (XSS → account takeover)
- **Severity:** HIGH *(CRITICAL when chained with any XSS — see XSS-01)*
- **Status:** CONFIRMED (from code)
- **OWASP:** A07:2021 Identification & Authentication Failures / A05 Misconfiguration
- **Affected component:** `src/store/auth.store.ts:401-413` (persist `token` to `localStorage` key `auth-storage`), `src/services/core/api-client.ts:156-201` (`getToken()` reads `auth-storage`, legacy `localStorage["token"]`), `src/providers/session-provider/session-sync-provider.tsx`
- **Detail:** The NextAuth session cookie is correctly HttpOnly, but the **same Laravel bearer token** (`session.user.token`) is copied into the Zustand auth store, which is persisted to `localStorage` and also read back on every API call. A 7-day, long-lived backend token is therefore readable by any JavaScript running on the origin.
- **Impact:** Any XSS (see XSS-01) or malicious dependency can exfiltrate the token and fully impersonate the user against the Laravel API for up to 7 days. The HttpOnly cookie provides a false sense of protection.
- **Fix:** Do not persist the API token in `localStorage`. Keep it only in the HttpOnly NextAuth cookie and proxy API calls through Next.js server routes (or a BFF) that read the token server-side, **or** use a short-lived token + silent refresh. Remove the legacy `localStorage["token"]` and `auth-storage.token` paths.

### AUTH-02 — Unverified `token`-based NextAuth credentials path (client sets its own role/permissions)
- **Severity:** HIGH
- **Status:** CONFIRMED (from code)
- **OWASP:** A01 Broken Access Control / A07
- **Affected:** `src/lib/auth/authOptions.ts:216-252` (token branch), consumed at `src/services/core/api-client.ts:324-337` (impersonation restore)
- **Detail:** `authorize()` has a branch that, when given `token` + `email` in credentials, builds a **fully authenticated session with no backend verification** — `account_type`, `active_role`, `permissions` (`JSON.parse(credentials.permissions)`), `vendor_location_id`, `uuid` are taken verbatim from the client. Because `signIn("credentials", {...})` is callable from browser JS, a user holding *any* valid backend token can mint a session claiming any role/permission set.
- **Impact:** The NextAuth JWT's `account_type` / `active_role` / `permissions` are **not trustworthy**. Any frontend decision (UI, layout role guards that read `account_type`, Next API routes that read the session) can be influenced by the client. Becomes CRITICAL if the Laravel backend ever trusts these session claims instead of re-deriving from the token.
- **Fix:** Remove the client-trusting token branch, or verify the supplied token against the backend and **derive role/permissions server-side** from the backend response. Never `JSON.parse` client-supplied permissions into the session.

### AUTH-03 — Admin bearer token persisted to `sessionStorage` during impersonation
- **Severity:** MEDIUM
- **Status:** CONFIRMED (from code)
- **Affected:** `src/store/impersonation.store.ts:9-21,55-110` (`AdminSessionBackup.token` in `sessionStorage` key `impersonation-session`), restore at `api-client.ts:310-361`
- **Detail:** When an admin impersonates a vendor, the **admin's own token** is stored in `sessionStorage` for later restore. Same XSS-exposure class as AUTH-01, but for a higher-privilege token.
- **Fix:** Keep the admin restore token server-side (e.g. an HttpOnly cookie the backend can validate), not in web storage.

### AUTH-04 — `X-Impersonating` is a client-set header
- **Severity:** LOW
- **Status:** CONFIRMED (from code)
- **Affected:** `api-client.ts:282-289`
- **Detail:** The client sets `X-Impersonating: true`. If the backend uses this only for audit-log tagging, a client can **suppress it to evade audit logging** (or falsely assert it). Do not derive any trust or audit truth from a client header — the backend should determine impersonation from the token/session.

### AUTH-05 — Server-side global mutable OAuth tenant state (cross-request bleed)
- **Severity:** MEDIUM
- **Status:** CONFIRMED (from code)
- **OWASP:** A04 Insecure Design
- **Affected:** `src/lib/auth/oauth-utils.ts:19-52` (`global.__OAUTH_TENANT_INFO`, `global.__OAUTH_ERROR_MESSAGE`), used in `authOptions.ts:476-604`, `src/app/api/auth/error/route.ts`
- **Detail:** OAuth tenant/domain/error context is stored in **process-global mutable variables**. In a concurrent serverless/multi-instance environment, one user's OAuth flow can read or overwrite another's tenant/account_type/domain.
- **Impact:** Tenant/domain bleed and race conditions in the social-login path; a user could be associated with the wrong tenant/redirect.
- **Fix:** Carry OAuth tenant context in the signed `state` param / PKCE flow, not in module globals.

### AUTH-06 — Session cookie scoped to all subdomains when subdomain routing is enabled
- **Severity:** LOW *(not active in current prod config)*
- **Status:** CONFIRMED (conditional)
- **Affected:** `authOptions.ts:716-781` — `domain: ".<WHITE_LABEL_URL>"` set only when `NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING` is true. Currently `false` in `.env.production`, so the cookie stays host-only. **Flagged for when subdomain routing is turned on** for real white-label tenants: a compromised/malicious tenant subdomain would then read the session cookie for all tenants. Prefer per-tenant cookie isolation.

### Positive (auth)
- NextAuth cookies (`sessionToken`, `callbackUrl`, `csrfToken`, `state`, `pkce`) are `httpOnly: true`, `sameSite: "lax"`, `secure` in production (`authOptions.ts:716-781`).
- OAuth `signIn` prioritizes the **backend** `active_role` over client tenant info (`authOptions.ts:544`).

---

## Authorization Findings

### AUTHZ-01 — All fine-grained permission enforcement is client-side and spoofable
- **Severity:** HIGH *(frontend bypass; CRITICAL if backend relies on it)*
- **Status:** CONFIRMED (from code)
- **OWASP:** A01 Broken Access Control
- **Affected:** `src/store/permission.store.ts:150-217` (persisted to `localStorage["permission-storage"]` + `sessionStorage["permissions-backup"]`), `src/hooks/usePermission.ts`, `src/components/permission/PermissionGuard.tsx`, `src/components/permission/PermissionRoute.tsx:50-64`, `src/providers/permission-provider/permission-provider.tsx:86-113`
- **Detail:** `hasPermission()` is `permissions.includes(key)` against a client-stored array. `PermissionProvider` seeds from the (client-settable) session and even **falls back to `sessionStorage`/`localStorage`** before any API refetch. `PermissionRoute` only redirects after `setTimeout(…,100)`, briefly rendering gated content.
- **Impact:** A user can edit `localStorage["permission-storage"]` to grant themselves any permission string and unlock all `PermissionGuard`/`PermissionRoute`-gated UI and actions. Whether the *action* succeeds depends entirely on the Laravel API.
- **Fix:** Treat permission gating as UX only (which it is), and **enforce every permission on the backend**. Confirm no Laravel endpoint authorizes based on client-sent role/permission fields.

### AUTHZ-02 — Middleware skips protected-route auth in production (single-domain mode)
- **Severity:** MEDIUM
- **Status:** CONFIRMED (active in prod)
- **Affected:** `src/proxy.ts:308-344` — when `NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING` is false (it is, in prod), `/vendor`, `/customer`, `/admin` are passed through with **no token check** ("EMERGENCY FIX … page-level protection will handle security").
- **Detail:** In production the middleware is *not* an auth boundary. Protection relies solely on layout-level `getServerSession` guards (`src/app/(protected)/layout.tsx:24-33`, `src/components/auth/ServerRoleGuard.tsx`). Those guards exist and check `account_type`, but any protected route/segment that lacks a proper server-side guard (e.g. a client-only page, a route without a guarding layout) is exposed.
- **Impact:** Defense-in-depth is reduced to a single layer; a missing/incorrect layout guard becomes a direct access-control gap.
- **Fix:** Re-enable a real middleware auth check for protected prefixes even in single-domain mode (verify `getToken()` and role→prefix match), instead of `NextResponse.next()`.

### AUTHZ-03 — IDOR / horizontal & vertical escalation (backend-dependent)
- **Severity:** POTENTIAL HIGH — **requires backend confirmation**
- **OWASP:** A01 Broken Access Control
- **Detail:** The frontend addresses resources by numeric/opaque IDs (`booking_id`, `event_id`, `location_id`, `room_id`, `table_id`, `ticket_id`, `support_ticket_id`, `payment_id`, media IDs) via `api-client`. Since authorization is not enforced on the frontend, **the entire IDOR surface lives on Laravel**. This audit cannot confirm/deny it without the backend or authorized live testing.
- **Retest (safe, with your own test accounts):** For each resource type, log in as CUSTOMER_A / VENDOR_A, capture a `GET /…/{id}`, then replay with CUSTOMER_B's / VENDOR_B's ID and confirm the API returns 403/404 and leaks no data in the body, errors, related objects, or pagination.

---

## Multi-Tenant Findings

### TENANT-01 — Tenant/location context is client-controlled and sent as trusted headers
- **Severity:** HIGH (POTENTIAL — depends on backend enforcement)
- **Status:** CONFIRMED client-side; backend enforcement UNVERIFIED
- **OWASP:** A01 / A04
- **Affected:** `src/services/core/api-client.ts:247-289`, `src/lib/domain.ts:14-45`, `src/providers/domain-provider/domain-provider.tsx:85-165`, `src/store/domain.store.ts`, `src/store/location.store.ts`
- **Detail:**
  - `X-Domain` = `useDomainStore.domain`, derived from `window.location.hostname` — and on `localhost`/`127.0.0.1` from the **`?domain=` query parameter** (`domain.ts:14-26`), i.e. fully attacker-chosen in dev.
  - `X-Venue-Location-Id` = location store → `auth.vendor_location_id` → **legacy `localStorage["vendor_location_id"]`** — all client-writable.
  - `domain_name` is also passed to the login call (`authOptions.ts:269`).
- **Impact:** If Laravel scopes data or authorization by these headers **without verifying the authenticated user actually owns that domain/location**, a vendor can set `X-Venue-Location-Id` / `X-Domain` to another tenant's and read/write cross-tenant data (Vendor A → Vendor B events/bookings/customers/files/discounts). There is *partial* evidence the backend does check domain (the client handles an `"Invalid domain access"` 403 with a corrective `data.domain`, `api-client.ts:591-655`) — but this must be confirmed for **location** scoping and **write** paths too.
- **Fix:** The backend must derive tenant + allowed locations from the authenticated token and **reject or ignore** client `X-Domain`/`X-Venue-Location-Id` that don't belong to the user. Treat these headers as hints, never authority.
- **Retest (safe):** As VENDOR_A, send a legitimate request, then replay changing only `X-Venue-Location-Id` (and `X-Domain`) to VENDOR_B's values; confirm the API refuses.

### TENANT-02 — OAuth tenant global-state bleed
- See **AUTH-05** (cross-request tenant contamination in the social-login path).

---

## API Security Findings

### API-01 — `ai/list-models`: SSRF + credential reflection, unauthenticated
- **Severity:** HIGH
- **Status:** CONFIRMED (from code)
- **OWASP:** A10 SSRF / A01
- **Affected:** `src/app/api/ai/list-models/route.ts:42-48,64-90,92-116`
- **Detail:** POST, **no auth**. Fetches `${base_url}/models` where `base_url` (and `api_key`) come from the request body, with **no host validation** — full SSRF to any internal/cloud endpoint. Upstream response body/message is reflected in the error response (`error.message.slice(0,280)`), leaking internal service responses. A supplied key can also be forwarded to an attacker-chosen `base_url`.
- **Fix:** Require admin auth; allowlist `base_url`; stop reflecting upstream bodies.

### API-02 — `ai/color-theme`: SSRF via `websiteUrl`, unauthenticated, error leakage
- **Severity:** HIGH
- **Status:** CONFIRMED (from code)
- **OWASP:** A10 SSRF
- **Affected:** `src/app/api/ai/color-theme/route.ts:36-56,599-605`
- **Detail:** POST, **no auth**. Fetches an arbitrary `websiteUrl` with only an `isValidHttpUrl()` protocol check (no SSRF guard, `redirect: "follow"`). Can hit `http://169.254.169.254/…`, `http://localhost`, internal hosts. Failures return the raw upstream error in `details`, and extracted colors partially exfiltrate internal page content.
- **Fix:** Use the shared `assertSafeLogoUrl` guard + manual redirect re-validation; require auth; remove `details`.

### API-03 — SSRF guard bypassable via HTTP redirects
- **Severity:** MEDIUM (HIGH combined with API-01/02)
- **Status:** CONFIRMED (from code)
- **Affected:** `src/lib/logo/fetch-logo-from-url.ts:40-88` (guard validates only the initial URL string; `redirect: "follow"`), callers: `ai/import-website/route.ts:82-92,412`, `logo/process/route.ts:65`, `blog-media/route.ts:27-31`, `ai/import-website/extract.ts:585-594`
- **Detail:** `assertSafeLogoUrl` checks the *initial* hostname only; it does not resolve DNS (DNS-rebinding possible) and callers using `redirect: "follow"` never re-validate the redirect target. An allowlisted/public host that 302s to `169.254.169.254` or an internal host is followed.
- **Good pattern to copy:** `ai/import-event/route.ts:121-144` and `ai/import-website/image/route.ts:113-135` use `redirect: "manual"` + per-hop re-validation.
- **Fix:** Switch all fetchers to manual redirects with per-hop `assertSafeLogoUrl`; add DNS-resolution IP allow/deny to close DNS-rebinding.

### API-04 — `ai/chat`: RBAC/tenant checks are fully client-controlled, unauthenticated
- **Severity:** HIGH
- **Status:** CONFIRMED (from code)
- **OWASP:** A01 / LLM01
- **Affected:** `src/app/api/ai/chat/route.ts:106-132,222-244,393-412`
- **Detail:** POST, **no server auth**. All identity/authz signals (`accountType`, `permissions`, `activeRole`, `isAuthenticated`, `vendorLiveStats`, `eventBookingBrief`) come from the client `context`. The "STRICT RBAC" guard relies on `context.permissions`, so any caller can claim `admin` and receive admin-oriented output; any "live stats" are forgeable.
- **Fix:** Derive identity/role from a server session (`getServerSession`) and backend data, not from the request body.

### API-05 — Unauthenticated open LLM proxies (cost/abuse)
- **Severity:** MEDIUM
- **Status:** CONFIRMED (from code)
- **OWASP:** A04 / API4:2023 Unrestricted Resource Consumption
- **Affected:** `ai/{chat,color-theme,domain-suggestions,generate-event,generate-onboarding,summary,import-website,import-website/image,list-models}` — all POST/GET with **no auth** (only `ai/import-event` gates on a session, `route.ts:559-572`).
- **Detail:** Anyone can drive the platform's LLM provider key for free general-purpose generation / quota exhaustion / bill inflation.
- **Fix:** Require auth on all AI routes; add per-user/IP rate limiting and CAPTCHA on public-facing ones.

### API-06 — Internal error/detail leakage in AI routes
- **Severity:** LOW
- **Affected:** `ai/color-theme` (`details: error.message`, `:600-605,1225-1237`), `ai/list-models` (`:42-48,64-90`), `ai/generate-event` (`:596-606`), `ai/generate-onboarding` (`:624-632`) — return `details`/`lastError`/raw-model `preview` on failure.
- **Fix:** Return generic errors to clients; log detail server-side.

### Positive (API)
- `contact/route.ts` uses zod `safeParse` (`:9-20`). `import-event` and `import-website/image` enforce content-type + magic-byte checks, bounded streaming reads, and untrusted-content fencing. AI keys are loaded server-side (`ai/lib/provider-config.ts`) and not returned to clients. No `Access-Control-Allow-*` wildcards set in Next routes.

---

## Input Validation Findings

- **Prompt injection (LLM):** scraped page content is injected into prompts without untrusted-data fencing in `ai/import-website` (`route.ts:199-217,492-499`); `ai/import-event` does it correctly (`<source>` fencing, `:206-208,265-275`). **Severity: MEDIUM** (LLM01). Fix: fence untrusted content in import-website.
- **SQL/NoSQL injection:** not assessable from the frontend — all queries run in Laravel. Parameterization must be verified there. **POTENTIAL** — retest IDs/search/filter/sort/pagination/slug params against the backend with safe payloads.
- **Type confusion / mass assignment:** IDs are passed to the backend as-is; mass-assignment protection (`$fillable`/`$guarded`) must be verified in Laravel. **POTENTIAL.**

---

## XSS Findings

### XSS-01 — Unsanitized `dangerouslySetInnerHTML` on vendor/blog/CMS content (stored XSS)
- **Severity:** HIGH (POTENTIAL — depends on backend/editor sanitization)
- **Status:** CONFIRMED no frontend sanitization; execution path plausible
- **OWASP:** A03 Injection (XSS)
- **Affected (20 sinks; highest-risk):** `src/app/(public)/blog/[slug]/_components/blog-article-content.tsx:82-86` (`post.content`), event `About-hero-sec`/`About-event-sec`/`menu-section`/`drink-section`/`Time-line` under `on-boarding/_components/form-preview`, `vendor/email-logs/_components/_email-log-show`, `(public)/…/cms-page` admin/vendor contact pages, `components/chat/chat-bot.tsx`, `components/public/cms-policies-view.tsx`.
- **Detail:** There is **no HTML sanitizer anywhere** in the codebase (no DOMPurify / sanitize-html — verified). Rich-text (TipTap) and CMS/blog/event content is rendered raw. `<script>` won't run from `innerHTML`, but `<img src=x onerror=…>` / `<svg onload=…>` will. Content authored by a vendor (or injected via the API bypassing the editor) executes in **customer browsers and admin/vendor dashboards**.
- **Chain:** XSS-01 + AUTH-01/AUTHZ-01 = steal the `localStorage` bearer token or elevate → **account/tenant takeover**. This is the most serious realistic chain.
- **Fix:** Sanitize all HTML at render with DOMPurify (allowlist tags/attrs, strip event handlers), **and** sanitize server-side on write. Note `@tiptap/core` itself has a known DOM-attribute-injection advisory (see DEP findings) — upgrade it.
- **Retest (safe):** As VENDOR_A, set an event description / blog body to `<img src=x onerror="document.title='xss'">` via the API and confirm whether it executes when a customer/admin views it.

---

## File Upload Findings

- Image import/processing paths (`logo/process`, `ai/import-website/image`, `blog-media`) apply content-type + magic-byte checks and size bounds in the good cases (`import-event`, `image`), but `blog-media/route.ts:48-54` enforces `MAX_BYTES` only **after** downloading the whole body (no pre-download cap). **Severity: LOW.**
- **SVG XSS:** if SVG uploads are permitted and later served/rendered inline, they can carry script — verify the upload allowlist and that user files are served with `Content-Type` + `Content-Disposition: attachment` / a sandboxed domain. **POTENTIAL** (backend storage not in scope).
- `sharp 0.34.5` has known libvips CVEs (see DEP) — malicious images could trigger them during processing.

---

## CSRF Findings

- **Laravel API:** calls authenticate via `Authorization: Bearer` read from `localStorage` (not cookies), so cross-site requests can't ride ambient credentials → **not CSRF-able** for the main API (a positive side effect of the token model, though it trades CSRF for the XSS exposure in AUTH-01).
- **NextAuth:** uses its own CSRF token cookie for auth flows (`authOptions.ts:743-754`). OK.
- **Unauthenticated AI routes:** CSRF is moot (no auth) but they're directly abusable (API-05).
- **Verdict:** No CSRF finding for state-changing API calls, contingent on the backend not also accepting cookie auth. Confirm the Laravel API does **not** accept session-cookie auth for state-changing routes.

---

## CORS Findings

- Next.js API routes set **no** `Access-Control-Allow-Origin`/`-Credentials` headers (verified) → same-origin only. Good.
- **Backend CORS is out of scope** (Laravel). Retest: confirm the API does not reflect arbitrary `Origin` with `Access-Control-Allow-Credentials: true`.

---

## Business Logic Findings

### BIZ-01 — Client-side price-validation control is broken (compares server price to itself)
- **Severity:** MEDIUM *(as an ineffective control; real impact depends on backend)*
- **Status:** CONFIRMED (from code)
- **Affected:** `src/lib/security/price-validation.ts:143-144,172-175`
- **Detail:** For tables and tickets, both `clientPrice` and `serverPrice` are computed from **`serverTable.price` / `serverTicket.price`** — the *same* value. The client-submitted price is never compared, so `Math.abs(diff) > 0.01` is never true and **table/ticket price manipulation can never be detected** by this guard. Only drinks are actually compared (`:202-203`), and `sanitizeCartPrices` overwrites drink prices with server values before submission (`:258-273`).
- **Impact:** The named "security layer" is theater for tables/tickets. Real protection must be the backend recomputing every total from authoritative prices. If it does, impact is low; if it trusts any client price, this is the gap that hides it.
- **Fix:** Either fix the comparison (`clientTable.price` vs `serverTable.price`) or delete the control and rely on (and verify) server-side recomputation.

### BIZ-02 — Booking/quantity/guest-count/discount rules (backend-dependent)
- **Severity:** POTENTIAL — requires backend/live testing
- **Detail:** min/max persons, table/ticket quantity, availability, expired-event booking, duplicate/replay, discount validity/stacking/negative values, and booking ownership are all enforced (or not) on Laravel. Not assessable statically.
- **Retest (safe, per section 15/23 of the brief):** with test accounts, attempt quantity/guest/min-person tampering, expired-event booking, discount stacking/negative values, and concurrent (race) booking of the last table/ticket — confirm the backend rejects and there's no double-allocation.

---

## Payment Security Findings

- Stripe integration present (`@stripe/react-stripe-js`, `@stripe/stripe-js`, `src/lib/stripe`, `src/components/payment`). Client-side Stripe is expected.
- **Critical requirement (verify on backend):** the **backend must be the sole authority** for amount, currency, deposit, `payment_status`, `booking_status`, provider and paid/unpaid state — driven by Stripe webhooks with **signature verification**, never by client-reported status. This audit cannot confirm the webhook/verification since it's server-side.
- Related: BIZ-01 (client prices), AUTH-02 (client role) mean the frontend cannot be trusted to gate payment logic.
- **Retest:** confirm payment confirmation is webhook-driven + signature-verified, and that a client cannot flip booking→paid by calling an API directly.

---

## AI Security Findings

- **API-01..06** above are the AI findings: SSRF (`list-models`, `color-theme`, redirect bypass), client-controlled RBAC (`chat`), open unauthenticated proxies, prompt injection (`import-website`), and error leakage.
- **Cross-tenant AI data access:** because `ai/chat` trusts client `context` for identity/permissions and `vendorLiveStats`, the AI does **not** independently enforce tenant/role boundaries — it must derive them server-side (ties to API-04). **POTENTIAL cross-tenant disclosure** if the route (or its backend calls) fetch data using client-claimed identity.
- **Indirect prompt injection:** scraped/imported event/website content flows into prompts; fence it (API/input-validation section).

---

## Infrastructure / Configuration Findings

### CONF-01 — No security headers configured
- **Severity:** MEDIUM
- **Status:** CONFIRMED (from code)
- **Affected:** `next.config.ts` (no `headers()`), no `vercel.json`
- **Detail:** No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` are set anywhere.
- **Impact:** No CSP to blunt XSS-01 token exfiltration; dashboards are clickjackable (no `frame-ancestors`); no HSTS.
- **Fix:** Add a `headers()` block (or `vercel.json`) with a strict CSP (no `unsafe-inline` for scripts), `frame-ancestors 'self'`, HSTS with preload, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a minimal `Permissions-Policy`.

### CONF-02 — TypeScript build errors ignored
- **Severity:** LOW (INFO)
- **Affected:** `next.config.ts:16-18` (`typescript.ignoreBuildErrors: true`)
- **Detail:** Type errors are suppressed at build, which can let type-confusion/logic bugs (including security-relevant ones) ship. Consider enabling in CI.

### CONF-03 — Debug/permission routes present
- **Severity:** LOW
- **Affected:** `src/app/debug-permissions`, `src/app/permission-debug`, `src/app/theme-test`
- **Fix:** Ensure these are not reachable in production (or gated), as they may expose permission internals.

---

## Dependency Findings

`npm audit --omit=dev`: **53 vulnerabilities — 2 critical, 11 high, 35 moderate, 5 low.** Highlights (verify exploitability in context before upgrading):

| Package | Installed | Severity | Advisory (relevance) |
|---|---|---|---|
| `next` | 16.2.1 | **Critical** | DoS via Server Components (fixed >16.3.2). Upgrade Next. |
| `next-auth` | v4 (`^4.24.11`) | **Critical** | Homoglyph `@` email-normalization bypass + others (≤4.24.14). Directly auth-relevant. |
| `axios` | 1.13.2 | High | SSRF via NO_PROXY normalization + auth-bypass via prototype pollution (≤1.17.0). Compounds SSRF findings. |
| `@faker-js/faker` | 9.6.0 | High | `helpers.fake` → arbitrary code execution (CWE-95). **Shipped in `dependencies`, not `devDependencies`** — move it to dev/remove from prod. |
| `@tiptap/core` (+extensions) | — | Moderate | `mergeAttributes()` turns `__proto__` into inherited executable DOM attributes (CWE-79/1321). **Directly relevant to XSS-01.** |
| `sharp` | 0.34.5 | High | Inherited libvips CVEs — relevant to server-side image processing. |
| `lodash`, `immutable`, `preact`, `postcss`, `nanoid`, `form-data`, `picomatch`, `linkify-it` | — | High/Moderate | Prototype pollution / ReDoS / injection — mostly transitive; patch via upgrades. |

**Actions:** move `@faker-js/faker` out of production deps; upgrade `next`, `next-auth`, `axios`, `@tiptap/*`, `sharp`; run `npm audit fix` selectively and re-test.

---

## Information Disclosure Findings

- **INFO-01 (LOW):** Verbose `console.log` of tenant/domain/PII and full error responses — `authOptions.ts:489-570` (email, permissions, tenant info; token is masked `***TOKEN***`) and `api-client.ts:254,599-654` (domain header on every request, hostnames, full domain-access error). Reduce logging; never log tokens/PII in production.
- **INFO-02 (INFO):** `.env`, `.env.production`, `.env.development` are present in the working tree but **correctly gitignored** (`.gitignore:76-81,146-147`). Ensure they were never committed historically and that secrets (NEXTAUTH_SECRET, Google/Facebook secrets, AI_RUNTIME_SECRET, REMOVE_BG_API_KEY) live only in Vercel env, not the repo.
- **INFO-03 (INFO):** No `NEXT_PUBLIC_` misuse found — all secret-named vars (`NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_SECRET`, `AI_RUNTIME_SECRET`, `REMOVE_BG_API_KEY`) are server-only in `src/env.ts`. Only the backend base URL / maps key / white-label URL are public (expected).
- **INFO-04 (INFO):** Production browser source maps default off (`productionBrowserSourceMaps` not set). Good.
- Backend URL `eventwizz-admin.socreativesupport.com` and Vercel org/project IDs (`.vercel/project.json`) are discoverable; not secrets, but note for attack-surface awareness.

---

## Rate Limiting Findings

- No application-level rate limiting is implemented in the Next.js layer for login, password reset, registration, OTP/verification, support creation, or the AI routes. AI routes (API-05) are unauthenticated and unthrottled. **Severity: MEDIUM** for AI cost-abuse; **POTENTIAL** for auth endpoints (backend may throttle — verify). **Fix:** add per-IP/user rate limiting (and CAPTCHA on public auth + AI endpoints).

---

## Race Condition Findings

- Not assessable statically (allocation atomicity lives in Laravel). **POTENTIAL** double-booking / coupon-reuse / double-payment. **Retest (safe):** fire a small number (e.g. 5–10) of concurrent requests to book the last table/ticket or redeem a single-use coupon with test data and confirm exactly one succeeds.

---

## Security Headers

| Header | Status |
|---|---|
| Content-Security-Policy | ❌ Missing (CONF-01) |
| Strict-Transport-Security | ❌ Missing |
| X-Content-Type-Options | ❌ Missing |
| Referrer-Policy | ❌ Missing |
| Permissions-Policy | ❌ Missing |
| X-Frame-Options / frame-ancestors | ❌ Missing (clickjacking) |
| Cache-Control (private data) | ⚠️ Not explicitly set; verify authed API responses aren't cached |
| NextAuth cookies HttpOnly/Secure/SameSite | ✅ Present (Secure in prod) |

*(Live header values on the Vercel deployments were not fetched; the above reflects what the code configures. Vercel adds HSTS by default on `*.vercel.app`, but app-level CSP/frame-ancestors are still absent.)*

---

## Positive Security Controls

- NextAuth session/CSRF/state cookies: HttpOnly + SameSite=Lax + Secure-in-prod (`authOptions.ts:716-781`).
- Server-side role gating via `ServerRoleGuard` + `getServerSession` layout guards (`ServerRoleGuard.tsx`, `(protected)/layout.tsx`, `(protected)/admin/layout.tsx`).
- Authoritative location switch goes through the backend (`vendor/venue-locations/_lib/hooks.ts`).
- `ai/import-event` / `ai/import-website/image`: session-gated, magic-byte + content-type validation, bounded reads, `redirect: "manual"` with per-hop SSRF re-validation, untrusted-content fencing — this is the correct pattern to copy elsewhere.
- AI provider keys resolved server-side and not returned to clients.
- Bearer-token (non-cookie) API auth removes classic CSRF for the main API.
- Secrets correctly separated server vs `NEXT_PUBLIC_`; `.env` gitignored; prod source maps off.

---

## Findings Summary

| Count | Severity |
|---|---|
| 0 | CRITICAL (frontend-confirmed standalone) |
| 7 | HIGH (incl. POTENTIAL-HIGH pending backend) |
| 9 | MEDIUM |
| ~9 | LOW |
| ~6 | INFO |

> Two items become **CRITICAL when chained/confirmed**: **XSS-01 + AUTH-01** (stored XSS → localStorage token theft → account/tenant takeover), and **TENANT-01 / AUTHZ-01 / AUTH-02** if the Laravel backend trusts any client-supplied tenant/role/permission/price. Confirm those on the backend.

---

## Critical Findings

- **(Chain) XSS-01 + AUTH-01** — Unsanitized HTML rendering + API bearer token in `localStorage` → full account takeover. Treat as CRITICAL.
- **(Conditional) TENANT-01 / AUTH-02 / AUTHZ-01** — CRITICAL *iff* the backend trusts client-supplied `X-Venue-Location-Id`/`X-Domain`/session role/permissions. Verify server-side.

## High Findings

- AUTH-01 — API token in `localStorage`
- AUTH-02 — Unverified token-credentials NextAuth path
- AUTHZ-01 — Client-side-only permission enforcement
- TENANT-01 — Client-controlled tenant/location headers (POTENTIAL-HIGH)
- API-01 — `ai/list-models` SSRF + credential reflection
- API-02 — `ai/color-theme` SSRF
- API-04 — `ai/chat` client-controlled RBAC
- XSS-01 — Unsanitized `dangerouslySetInnerHTML` (POTENTIAL-HIGH)
- DEP — Critical `next` / `next-auth`, high `axios`/`faker`/`sharp`

## Medium Findings

- AUTH-03 — Admin token in `sessionStorage` (impersonation)
- AUTH-05 — Global mutable OAuth tenant state
- AUTHZ-02 — Middleware auth bypass in single-domain prod
- API-03 — SSRF guard redirect bypass
- API-05 — Unauthenticated open LLM proxies
- BIZ-01 — Broken price-validation control
- CONF-01 — Missing security headers
- Input — Prompt injection (import-website)
- Rate limiting — AI endpoints (and verify auth endpoints)

## Low Findings

- AUTH-04 — Client-set `X-Impersonating`
- AUTH-06 — Subdomain-shared cookie (conditional)
- API-06 — Internal error/detail leakage
- File upload — post-download size cap (`blog-media`); SVG-serving (verify)
- CONF-02 — `ignoreBuildErrors`
- CONF-03 — Debug routes
- INFO-01 — Verbose PII/error logging

---

## Recommended Remediation Plan

**P0 (now)**
1. Remove the Laravel token from `localStorage`/`sessionStorage` (AUTH-01, AUTH-03); serve API calls through a server-side proxy that reads the HttpOnly cookie, or use short-lived tokens.
2. Sanitize all HTML (DOMPurify on render + server-side on write) for blog/event/CMS/support/email content (XSS-01); upgrade `@tiptap/*`.
3. Add authentication to all `ai/*` routes and fix SSRF in `ai/list-models` and `ai/color-theme`; make all fetchers use `redirect: "manual"` + per-hop guard + DNS/IP checks (API-01..05).
4. **Backend confirmation:** verify Laravel ignores client `X-Domain`/`X-Venue-Location-Id`/role/permissions and enforces tenant + object-level authorization from the token (TENANT-01, AUTHZ-01/03, AUTH-02).

**P1 (this sprint)**
5. Remove the unverified token-credentials branch or verify the token backend-side (AUTH-02).
6. Add security headers incl. a strict CSP and `frame-ancestors` (CONF-01).
7. Re-enable middleware auth checks in single-domain mode (AUTHZ-02).
8. Fix/replace the price-validation control and confirm backend recomputes all totals; confirm Stripe webhooks are signature-verified (BIZ-01, Payments).
9. Move `@faker-js/faker` out of prod deps; upgrade `next`, `next-auth`, `axios`, `sharp` (DEP).

**P2 (hardening)**
10. Replace global OAuth state with signed `state` (AUTH-05); add rate limiting + CAPTCHA; reduce logging (INFO-01); remove/gate debug routes; enable type-checking in CI.

---

## Retest Checklist

- [ ] Confirm API token no longer present in `localStorage`/`sessionStorage`.
- [ ] Stored-XSS payload in event/blog/support content does **not** execute in customer/admin views.
- [ ] IDOR: Customer/Vendor A cannot read/modify B's booking/event/location/room/table/ticket/support/media by ID.
- [ ] Tenant: tampering `X-Venue-Location-Id`/`X-Domain` cannot cross tenants (read **and** write).
- [ ] Role: setting `account_type`/`permissions` client-side grants no backend capability.
- [ ] `ai/*` routes require auth; SSRF to internal/metadata blocked incl. via redirect/DNS-rebind.
- [ ] Price/quantity/guest/discount tampering rejected by backend; totals recomputed server-side.
- [ ] Payment status is webhook-driven + signature-verified; client cannot flip paid/unpaid.
- [ ] Concurrency: last table/ticket & single-use coupon cannot double-allocate.
- [ ] Security headers (CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy) present on both apps.
- [ ] Dependency criticals/highs remediated; `npm audit` clean of criticals.
- [ ] Auth/reset/OTP endpoints rate-limited; user-enumeration checked on the backend.

---

*Prepared as a static (read-only) code audit. Items marked POTENTIAL require confirmation against the Laravel backend or authorized dynamic testing with the supplied test accounts. No live attacks, data modification, or secret exposure were performed.*
