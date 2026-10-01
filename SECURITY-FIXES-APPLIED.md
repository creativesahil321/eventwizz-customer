# EventWizz — Frontend Security Fixes Applied

This documents the frontend-owned security fixes applied to the Next.js app. Backend-owned items are in `SECURITY-BACKEND-REQUIREMENTS.md`; full analysis is in `SECURITY-AUDIT.md`.

Guiding constraints: **clean, minimal changes; no feature behavior broken.** Where a stricter control risked breaking a real flow, the safe variant was shipped (noted below).

---

## Applied

### 1. Stored XSS — HTML sanitization (XSS-01) ✅
- **New:** `src/lib/security/sanitize-html.ts` (allowlist aligned to the TipTap editor output) and `src/components/shared/safe-html.tsx` (`<SafeHtml>` helper).
- **Dependency:** uses `sanitize-html` (pure JS, no `jsdom`) so it runs identically in Next.js server components on Vercel serverless and in client components. (An initial attempt with `isomorphic-dompurify` 500'd on Vercel because its `jsdom` dependency isn't traced into the serverless function — switched to `sanitize-html`, verified with `next build` + `next start`.)
- Wrapped **16** user/vendor/CMS-authored `dangerouslySetInnerHTML` sinks with `sanitizeHtml(...)`: blog article, event about/hero/menu/drink sections, email-log body, admin/vendor contact + what-is + revolutionise CMS, about, how-it-works, EventListPage experience/footer, cms-policies.
- **Intentionally left unchanged (correct):** 4 developer-authored `<style>`/CSS-in-JS injections (`layout.tsx` critical theme CSS, `chart.tsx` recharts theme, `chat-bot.tsx` keyframes, `Time-line` styles) — sanitizing them would strip required CSS and break rendering. These contain no user input.
- **Behavior:** legitimate formatting is preserved; only scripts, event handlers (`onerror`/`onload`), and dangerous URL schemes are removed.

### 2. SSRF hardening (API-02, API-03) ✅
- **New:** `src/lib/security/ssrf.ts` — `assertPublicUrl` (blocks private/loopback/link-local/CGNAT/metadata ranges), `assertResolvesToPublic` (**DNS resolution** check — closes hostname→internal-IP and most DNS-rebinding), and `safeFetch` (follows redirects **manually**, re-validating every hop).
- Routed through `safeFetch`: `ai/color-theme` (was unguarded `fetch`), `logo/process` via `fetch-logo-from-url.ts`, and `blog-media` (was `redirect: "follow"`).

### 3. AI route abuse + SSRF-route auth (API-01, API-04, API-05, API-06) ✅
- **New:** `src/lib/security/api-guard.ts` — `enforceSameOrigin` (rejects cross-site invocation) + best-effort per-IP `rateLimit`, combined in `guardPublicApi`.
- Added `guardPublicApi` to the public AI POST routes: `chat`, `color-theme`, `domain-suggestions`, `generate-event`, `generate-onboarding`, `summary`, `import-website`. **Same-origin + rate-limit instead of hard login** so onboarding/first-party flows keep working regardless of auth state, while cross-site cost-abuse is blocked.
- `ai/list-models`: now requires an **authenticated admin session** + same-origin (it fetches an arbitrary `base_url` server-side).
- Removed internal error-detail leakage (`details: error.message`) from `color-theme`.

### 4. Security headers (CONF-01) ✅
- `next.config.ts` now sends: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (anti-clickjacking; same-origin preview still works — no embeddable-widget feature exists), `Referrer-Policy`, `Permissions-Policy`, and **`Content-Security-Policy-Report-Only`**.
- CSP is **Report-Only first** so Google Maps / Stripe / Fonts / inline Next runtime are not broken. **Next step:** monitor violation reports, tighten (drop `unsafe-inline`/`unsafe-eval`, add nonces), then rename the header to `Content-Security-Policy` to enforce.

### 5. Debug routes hidden in production (CONF-03) ✅
- `/debug-permissions`, `/permission-debug`, `/theme-test`, and `/vendor/permissions-debug` now return `notFound()` when `NODE_ENV === "production"` (they dumped permission/session internals).

### 6. Misleading price-validation control removed (BIZ-01) ✅
- `price-validation.ts`: removed the dead table/ticket "validation" that compared the server price to itself (it could never detect tampering, and those prices aren't client-submitted anyway). Documented that the backend is authoritative. Drink-price validation + `sanitizeCartPrices` (the only client-submitted price) are unchanged. **No checkout behavior change.**

### 7. Reduced sensitive logging (INFO-01) ✅
- Gated the per-request `X-Domain` console log behind non-production.

### 8. Prompt-injection fencing in `ai/import-website` ✅
- Scraped page content is now wrapped in `<source>` tags and the system prompt instructs the model to treat it as **untrusted data, not instructions** (matching the hardened `ai/import-event` route). Prompt-only change; output is still clamped/sanitized afterward.

### 9. Middleware auth gate in single-domain prod (AUTHZ-02) ✅
- `src/proxy.ts`: in single-domain mode, `/vendor`, `/customer`, `/admin` now **redirect clearly-unauthenticated visitors to `/auth/login`** (with `callbackUrl`) at the edge, instead of passing everything through.
- **Fail-safe by design:** it redirects **only on the absence of a NextAuth session cookie**, so a valid — or expired — session is never locked out (authoritative auth/role checks stay in the `getServerSession` layout guards, which handle expiry). It deliberately does **not** re-add the role/onboarding/location redirects that caused the original redirect loops.
- Verified: public pages 200; `/vendor|/admin|/customer/dashboard` without a session → 307 → `/auth/login?callbackUrl=…`; login page 200 (no loop).

---

## Deferred (needs backend coordination or live testing — not done blind)

These are **not** safe to fix on the frontend alone; they are specified in `SECURITY-BACKEND-REQUIREMENTS.md`:

| Item | Why deferred | Backend need |
|---|---|---|
| **AUTH-01/03** — token in `localStorage`/`sessionStorage` | Removing it breaks every API call; needs a server token model | B8 (HttpOnly cookie / BFF / short-lived token) |
| **AUTH-02** — unverified `token` credentials path | Used by registration + impersonation restore; needs server verification | B3/B8 (`/me` or verify-token) |
| **AUTH-05** — global OAuth tenant state (`global.__OAUTH_TENANT_INFO`) | Fixing the cross-request bleed properly needs NextAuth `state`/cookie plumbing that **can only be validated by running a real Google/Facebook login flow** (provider creds + backend + configured redirect URIs) — not reproducible here. Changing it blind could break social login for all tenants. | — (frontend; needs an OAuth smoke test on preview) |
| **CSP enforce** (CONF-01 follow-up) | CSP ships **Report-Only** on purpose. Flipping to enforce blind risks breaking Maps/Stripe/fonts for all users; it must be tightened only after observing real violation reports. | — (frontend; after a few days of monitoring) |
| **Dependency upgrades** (`next`, `next-auth`, `axios`, `sharp`) | Version bumps need regression testing/devops | — (devops) |

> `@faker-js/faker` (flagged by `npm audit`) is used only for mock data (`string.uuid`, `commerce`, `arrayElement`) — **not** the exploitable `helpers.fake()` template path — so it is not exploitable as used and was left in place.

---

## Verify after deploy
- Stored-XSS payload (`<img src=x onerror=...>`) in event/blog/CMS content does not execute.
- Google Maps, Stripe checkout, fonts, and the live preview still render (CSP is report-only, so they should).
- Onboarding AI flows (domain suggestions, generate event/onboarding, import website, color theme) still work from the app.
- `ai/list-models` works for admins and 403s otherwise.
- Check the browser console / CSP report sink for violations before enforcing CSP.
