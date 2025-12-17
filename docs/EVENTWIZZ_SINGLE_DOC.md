# EventWizz – Single Source Project Guide (SSOT)

This document replaces all other docs in `docs/` and serves as the single source of truth for EventWizz-v2. It consolidates architecture, implementation patterns, security, SEO, SSR, AI assistant, and module guidelines.

- Last updated: 2025-01-12
- App: Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, NextAuth

---

## 0. TL;DR (Quick Start)

- Install: `npm i`
- Environment: copy `.env*` → `.env.local`
- Dev: `npm run dev`
- Build: `npm run build` → `npm start`
- Key rules:
  - Use TanStack Query for data fetching and mutations (no raw axios in components)
  - Do NOT send `vendor_location_id` in request bodies; the axios interceptor adds `X-Venue-Location-Id` from the NextAuth session [[memory:5460497]][[memory:5138723]]
  - Prefer Server Components for public/SEO pages; Client Components for interactivity [[memory:5149320]]
  - Use `active_role` and `account_type` naming consistently
  - **NEW**: All client-imported configs are client-safe; branding comes from theme API, not environment variables

---

## 1. System Architecture Overview

EventWizz is a multi-tenant platform with perfect white-labeling support:

- Admin (website_role="admin"): onboarding/management
- Vendor (website_role="vendor"): customer-facing per-location site
- **Partner Deployments**: Fully white-labeled admin instances (same codebase, custom branding)
- Shared services: Auth (NextAuth), Permission, Location-aware API client, Theming, SEO

**Important Note**: Partner is NOT a user role - it's a deployment model for white-labeling. Partners run their own branded version of the admin platform using the same codebase with different environment variables and custom themes.

### 1.1 Project structure (high level)

```
src/
├─ app/                         # Next.js App Router
│  ├─ (auth)/                   # Login/Register/Forgot/Reset
│  ├─ (on-boarding)/            # Vendor onboarding steps
│  ├─ (protected)/              # Admin/Partner/Vendor dashboards
│  ├─ (public)/                 # Public-facing pages (SSR)
│  └─ api/                      # Next.js API routes (AI, auth adapters, etc.)
├─ components/                  # Shared UI + permission + chat assistant
├─ providers/                   # Query, Session, Permission, Location
├─ services/                    # Axios instance + typed services + endpoints
│  ├─ core/                     # api-client + endpoints map
│  ├─ common/                   # cross-tenant services
│  ├─ vendor/                   # vendor-specific services
│  └─ admin/                    # admin-specific services
├─ store/                       # Zustand stores (auth, domain, location, permission)
├─ hooks/                       # Reusable hooks (incl. chat bot)
├─ types/                       # API and NextAuth types
└─ lib/                         # utils, domain helpers, fonts, auth options
```

---

## 2. Authentication & Session (NextAuth)

- Strategy: JWT (secure cookie)
- Normalized session user fields:
  - `id`, `uuid`, `token`, `active_role`, `account_type`, `isOnboarded`, `on_boarding_step`
  - Optional: `vendor_location_id`, `default_venue_location`, `venue_locations`, `permissions`
- Session updates preserve location data when `useSession().update()` is called (used by Location switching)

Example session typing snippet:

```ts
interface Session {
  user: {
    id: string;
    uuid: string;
    token: string;
    active_role: string;
    account_type: string;
    isOnboarded: boolean;
    vendor_location_id?: string;
    on_boarding_step?: number;
    default_venue_location?: VenueLocation;
    venue_locations?: VenueLocation[];
  } & DefaultSession["user"];
}
```

---

## 3. Permission System (UI + Route)

- Permission keys (e.g., `read-event`, `manage-staff`)
- Stored in permission store with hydration and session/backup fallbacks
- Guards:
  - `PermissionGuard` component
  - `PermissionButton`
  - Route-level wrappers in protected pages

```tsx
<PermissionGuard permissionKey="create-event">
  <Button>Create Event</Button>
</PermissionGuard>
```

---

## 4. Location Selection System

- Ensures vendors always work within a selected venue location
- On select: update session, hydrate `auth` and `location` stores, invalidate queries
- Interceptor adds `X-Venue-Location-Id` on every request (do not include in body) [[memory:5460497]]

Key files:

- `src/providers/location-initializer-provider.tsx`
- `src/components/modals/location-selector-modal.tsx`
- `src/store/location.store.ts`

---

## 5. API Layer: Axios + Interceptors

- `src/services/core/api-client.ts` defines a single axios instance with:
  - Auth header from NextAuth session (fallbacks to store if needed)
  - `X-Venue-Location-Id` header from session/default location
  - Response handler with security-violation protection and global toasts
- `src/services/core/endpoints.ts` centralizes paths for Admin/Partner/Vendor/Customer

Never send location in the request body; it is injected as header by the interceptor [[memory:5460497]].

---

## 6. Calling the API (Service + Query pattern)

Use this blueprint for any resource. Services live in `src/services/**` and use the shared `api` wrapper from `api-client`.

```ts
// services/vendor/events/events.service.ts
import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

export const eventsService = {
  list: (params?: { page?: number }) =>
    api.get<{ data: Event[] }>(API_ENDPOINTS.VENDOR.EVENT.GET_EVENTS, {
      params,
    }),
  getById: (eventId: number | string) =>
    api.get<Event>(
      API_ENDPOINTS.VENDOR.EVENT.GET_EVENT.replace("{eventId}", String(eventId))
    ),
  create: (payload: CreateEventDto) =>
    api.post(API_ENDPOINTS.VENDOR.EVENT.CREATE_EVENT, payload),
};
```

```ts
// app/(protected)/_shared/events/_lib/queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsService } from "@/services/vendor/events/events.service";

export const eventKeys = {
  all: ["events"] as const,
  list: (params?: unknown) => [...eventKeys.all, "list", params] as const,
  byId: (id: number | string) => [...eventKeys.all, "detail", id] as const,
};

export function useEvents(params?: { page?: number }) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => eventsService.list(params),
    select: (r) => r.data, // unwrap ApiResponse
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eventsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}
```

Notes:

- The axios instance injects token and location header; no need to pass them manually [[memory:5138723]].
- Keep all network calls in `services/`; components only consume hooks.

---

## 7. SSR + TanStack + Axios (combined)

Pattern for a public, SEO-critical page:

```tsx
// app/(public)/events/[slug]/page.tsx (Server Component)
import Client from "./_components/client";
import { api } from "@/services/core/api-client";
import { Metadata } from "next";

export async function generateMetadata(props: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await api.get<{ title: string; description: string }>(
    `/public/events/${slug}`
  );
  return { title: `${res.title} | EventWizz`, description: res.description };
}

export default async function Page(props: { params: { slug: string } }) {
  const { slug } = await props.params;
  const event = await api.get(`/public/events/${slug}`);
  // Pass initial data; client will hydrate TanStack cache using initialData
  return <Client initialEvent={event} />;
}
```

```tsx
// app/(public)/events/[slug]/_components/client.tsx (Client Component)
"use client";
import { useQuery } from "@tanstack/react-query";
import { eventKeys } from "@/app/(protected)/_shared/events/_lib/queries";
import { eventsService } from "@/services/vendor/events/events.service";

export default function Client({ initialEvent }: { initialEvent: any }) {
  const { data } = useQuery({
    queryKey: eventKeys.byId(initialEvent.id),
    queryFn: () => eventsService.getById(initialEvent.id),
    initialData: initialEvent,
    staleTime: 60_000,
  });

  return <div>{data.title}</div>;
}
```

- Server renders HTML for SEO; client enhances interactivity and continues using the same query key, avoiding double-fetch.

---

## 8. Caching & Query Client Defaults

- Defaults (see `providers/query-provider/index.tsx`):
  - `staleTime`: 5m, `gcTime`: 10m, `retry`: 2, `refetchOnWindowFocus`: false
- Mutations should update cache directly or invalidate the smallest key scope

---

## 9. Zustand Stores (quick reference)

- `auth.store.ts`: token/session mirrors, login/logout helpers
- `location.store.ts`: `selectedLocation`, `allLocations`, actions to set and reset
- `domain.store.ts`: domain/tenant context and website role
- `permission.store.ts`: array of permission keys with hydration/fallback logic

Persistence:

- Stores use persist middleware; permission store also mirrors to sessionStorage for cross-tab reliability

---

## 10. Roles & Endpoints Map

See `src/services/core/endpoints.ts` for complete mapping.

- Admin endpoints: `API_ENDPOINTS.ADMIN.*`
- Vendor endpoints: `API_ENDPOINTS.VENDOR.*`
- Customer endpoints: `API_ENDPOINTS.CUSTOMER.*`

Use these constants in services to avoid hard-coded paths.

**Note**: Partner deployments use the same ADMIN endpoints but with partner-specific backend configuration.

---

## 11. Security

- NextAuth JWT in HTTP-only cookie; axios adds `Authorization` header
- Interceptor detects unauthorized/forbidden and triggers secure logout and violation tracking
- Storage tamper detection; backup permission hydration; conservative error toasts

---

## 12. Theme & Branding (White-Labeling)

### 12.1 Architecture Overview

EventWizz uses a **hybrid SSR/CSR approach** for perfect white-labeling:

```typescript
// Server-side (SSR) - Dynamic branding from theme API
const initialTheme = await fetchServerTheme(host);

// Client-side (CSR) - Static fallbacks, overridden by theme API
export const appConfig = {
  name: "Event Wizz", // Static fallback
  url: "https://event-wizz.com", // Static fallback
  // ... other static values
};
```

### 12.2 Environment Variables (Minimal Set)

Only **4 environment variables** needed for white-labeling:

```env
NEXT_PUBLIC_WHITE_LABEL_URL="partner-domain.com"
NEXT_PUBLIC_API_URL="https://api.partner-domain.com/api/v1"
NEXT_PUBLIC_APP_URL="https://partner-domain.com"
NEXT_PUBLIC_SOCKET_URL="wss://api.partner-domain.com"
```

### 12.3 Partner Customization

Partners get **complete control** through Site Essentials:

| Feature             | API Source              | SSR Integration              |
| ------------------- | ----------------------- | ---------------------------- |
| **Site Name**       | `theme.name`            | ✅ Dynamic metadata          |
| **Logo**            | `theme.logo`            | ✅ Server-side injection     |
| **Favicon**         | `theme.favicon`         | ✅ Server-side injection     |
| **SEO Title**       | `theme.seo.title`       | ✅ Dynamic page titles       |
| **SEO Description** | `theme.seo.description` | ✅ Dynamic meta descriptions |
| **SEO Keywords**    | `theme.seo.keywords`    | ✅ Dynamic meta keywords     |
| **Colors**          | `theme.colors`          | ✅ Critical CSS injection    |
| **Typography**      | `theme.typography`      | ✅ Server-side CSS           |
| **Social Links**    | `theme.socialLinks`     | ✅ Dynamic footer/header     |

### 12.4 Implementation Files

- `src/lib/server-theme.ts` - Server-side theme fetching
- `src/app/layout.tsx` - SSR theme integration
- `src/app/(public)/page.tsx` - Dynamic metadata generation
- `src/config/app.ts` - Client-safe static fallbacks

---

## 13. AI Assistant (Chat Bot)

- Files:
  - `src/components/chat/chat-bot-provider.tsx` (provider + mounting)
  - `src/components/chat/chat-bot-toggle.tsx` (UI toggle)
  - `src/components/chat/chat-bot.tsx` (chat UI, calls `/api/ai/chat`)
  - `src/hooks/use-chat-bot.ts` (hook wrapper)
- Usage:

```tsx
// Wrap your layout
<ChatBotProvider defaultEnabled={true}>{children}</ChatBotProvider>

// Add a toggle anywhere
<ChatBotToggle />
```

- Backend endpoint expected: `/app/api/ai/chat` that returns `{ message: string }`

---

## 14. Onboarding Flow (11 Steps → Location Init)

- The onboarding has 11 steps in `src/app/(on-boarding)/on-boarding/_components/steps/step-1 ... step-11/`.
- Finalization occurs at step 11, after which the user proceeds to vendor dashboard with location initialization.
- We hydrate the location store, select default, and ensure `X-Venue-Location-Id` header is set by interceptor.

Key folders:

- `step-1` … `step-11` components and per-step libs

---

## 15. Site Preview and Event Preview

Two dedicated preview pages render a production-like view using the current form/session data.

- Site Preview: `src/app/preview/site/page.tsx`

  - Renders `SitePreview` using data from `useSitePreviewStore()`
  - Accessed via "Preview" buttons in Site Essentials UI
  - Shows skeletons while loading and provides a back-to-editor control

- Event Preview: `src/app/preview/event/page.tsx`
  - Uses `useEventData(eventId)` to fetch event data and renders `EventPreview`
  - Accepts `?id=...` query param from the editor
  - Provides skeletons, back control, and a consistent preview header/footer

Usage tips:

- For forms, push preview data into the store before navigating to `/preview/site`
- For events, link to `/preview/event?id=<eventId>`
- Previews are client components optimized for fast iteration; they do not alter server state

---

## 16. SSR/CSR Decision Cheatsheet

- Public, indexable pages: Server Component for data + metadata; pass props to client
- Authenticated dashboards/forms: Client Components with TanStack Query
- Avoid mixing server-only APIs (e.g., `headers()`) in client files
- Always `await props.params` in Next.js 15

---

## 17. Implementation Checklists

Feature:

- [ ] Types + Zod schema
- [ ] Service with endpoints
- [ ] Query hooks with structured keys
- [ ] Mutations update cache or properly invalidate
- [ ] Permission guards for UI/route
- [ ] Location awareness (header only)
- [ ] SSR + metadata (for public pages)

Security:

- [ ] No token leakage; rely on NextAuth + axios
- [ ] Interceptor handles 401/403
- [ ] No `vendor_location_id` in bodies [[memory:5460497]]

SEO (public):

- [ ] Implement `generateMetadata`
- [ ] Add JSON-LD where relevant

White-Labeling:

- [ ] Use static fallbacks in client configs
- [ ] Implement SSR theme fetching
- [ ] Dynamic metadata from theme API
- [ ] Critical CSS injection for branding

---

## 18. Pointers to Code

- Auth config: `src/lib/auth/authOptions.ts`
- API client/interceptors: `src/services/core/api-client.ts`
- Endpoints map: `src/services/core/endpoints.ts`
- Query client: `src/providers/query-provider/index.tsx`
- Stores: `src/store/*.ts`
- Location initializer: `src/providers/location-initializer-provider.tsx`
- Permission provider: `src/providers/permission-provider/permission-provider.tsx`
- Chat assistant: `src/components/chat/**`
- Theme system: `src/lib/server-theme.ts`
- Client config: `src/config/app.ts`

---

## 19. Partner White-Label Deployment Guide

### Understanding Partner Deployments

**Partner is NOT a role** - it's a **white-labeled deployment model**. Each partner gets their own branded instance of the EventWizz platform using the same codebase.

#### Architecture Overview

```
Same Codebase → Multiple Deployments:

Main Platform (eventwizz.com)
├── Roles: admin, vendor, customer
├── Theme: EventWizz branding
└── Database: Main DB

Partner Instance 1 (partner1.com)
├── Roles: admin, vendor, customer (same code)
├── Theme: Partner 1 branding
└── Database: Partner 1 isolated DB

Partner Instance 2 (partner2.com)
├── Roles: admin, vendor, customer (same code)
├── Theme: Partner 2 branding
└── Database: Partner 2 isolated DB
```

### Step-by-Step Partner Deployment

#### Step 1: Environment Setup (4 Variables Only)

```env
# Partner's custom domain
NEXT_PUBLIC_WHITE_LABEL_URL="partner-brand.com"

# Partner's API endpoint
NEXT_PUBLIC_API_URL="https://api.partner-brand.com/api/v1"

# Partner's app URL
NEXT_PUBLIC_APP_URL="https://partner-brand.com"

# Partner's WebSocket URL
NEXT_PUBLIC_SOCKET_URL="wss://api.partner-brand.com"
```

#### Step 2: Build & Deploy

```bash
# Clone, build, and deploy with partner environment
git clone repo → npm install → set env vars → npm run build → deploy
```

#### Step 3: Partner Customization (Via UI)

Partner logs into Site Essentials and configures:
- Logo, favicon, colors, typography
- SEO metadata, contact info, social links
- All changes apply immediately via theme API

#### Step 4: Partner Goes Live

- Vendors register at partner-brand.com
- Vendors get subdomains: vendor.partner-brand.com
- Customers book on partner-branded sites
- Partner manages their isolated ecosystem

### Key Technical Points

**Domain Detection:**
```typescript
const hostname = req.headers.get("host"); // "partner-brand.com"
const theme = await fetchTheme(hostname); // Returns partner's branding
```

**Same Role System:**
```typescript
// All deployments use: admin, vendor, customer
// NO separate partner role in code
```

**Perfect Isolation:**
- Each partner: separate DB, vendors, customers, revenue
- Updates to main codebase benefit all partners automatically

### Partner vs Main Platform

| Feature | Main Platform | Partner |
|---------|--------------|---------|
| Codebase | Same | Same |
| Roles | admin, vendor, customer | admin, vendor, customer |
| Branding | EventWizz | Partner's brand |
| Domain | eventwizz.com | partner-brand.com |
| Database | Main DB | Partner DB |
| Vendors | Platform vendors | Partner's vendors |

### Automatic Features

✅ Dynamic SEO metadata
✅ Server-side branding injection
✅ White-label emails
✅ Custom domain support
✅ Isolated data
✅ Real-time theme updates
✅ Zero code changes required

---

## 20. Deployment Checklist (Partners)

- [ ] Backend deployed with partner DB
- [ ] DNS configured (A, CNAME for subdomains)
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Next.js built and deployed
- [ ] Site Essentials configured
- [ ] Test vendor registration
- [ ] Test subdomain creation
- [ ] Verify branding and emails

---

End of document.
