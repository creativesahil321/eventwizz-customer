# EventWizz (frontend)

EventWizz is a multi-tenant event booking platform for venues. Venues create events, take bookings and payments, seat guests and check them in at the door, each on their own branded booking website (for example `stockbrook.eventwizz.co.uk`). This repository is the **Next.js frontend** for all of it: the public venue sites, the vendor, customer and admin portals, and onboarding. The **Laravel API** is a separate repository.

New here? Read the [platform overview](docs/00-platform-overview.md) first.

## Quick start

Requirements: **Node.js 20.9 or newer** (required by Next.js 16) and npm.

```bash
npm install
```

`npm install` also runs `patch-package`, which applies the fixes in `patches/`.

Create `.env.local` (or `.env.development`) with the values from the team. `.env*` files are git-ignored and must never be committed. The variables are validated in `src/env.ts`:

| Scope | Variables |
|---|---|
| Browser (`NEXT_PUBLIC_*`) | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WHITE_LABEL_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING`, `NEXT_PUBLIC_ENABLE_I18N`, `NEXT_PUBLIC_DEV_MODE`, `NEXT_PUBLIC_NODE_ENV` |
| Server only | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `AI_RUNTIME_URL`, `AI_RUNTIME_SECRET`, `GROQ_API_KEY`, `REMOVE_BG_API_KEY` |

Never put a secret in a `NEXT_PUBLIC_*` variable. See [security](docs/platform/security.md) and [white-labeling](docs/platform/white-labeling.md) for what the domain variables control.

Then:

```bash
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (`next lint`) |

## Tech stack

- **Next.js 16** (App Router) and **React 19**, TypeScript
- **Tailwind CSS 4**, shadcn/ui on Radix primitives, Framer Motion
- **TanStack Query** for server data, **Zustand** for client state, **React Hook Form** + **Zod** for forms
- **NextAuth** (credentials, Google, Facebook) in front of the Laravel API via Axios
- Stripe, PayPal and TrueLayer checkout; Tiptap rich text; Google Maps; AI routes under `src/app/api/ai`

Details: [architecture](docs/platform/architecture.md).

## Project structure

```
src/app/(public)      venue websites and the marketing site (by host)
src/app/(auth)        sign-up, login, password reset
src/app/(on-boarding) vendor onboarding wizard
src/app/(protected)   vendor/ customer/ admin/ portals (+ _shared modules)
src/services          API layer per portal; endpoints in src/services/core/endpoints.ts
```

One build serves every tenant; the request host decides which site is shown ([multi-tenancy](docs/platform/multi-tenancy.md)).

## Documentation

All documentation lives in [`docs/`](docs/README.md):

- [Platform overview](docs/00-platform-overview.md) and [glossary](docs/01-glossary.md), for managers and team leads
- Portal maps: [vendor](docs/portals/vendor-portal.md) · [customer](docs/portals/customer-portal.md) · [admin](docs/portals/admin-portal.md)
- [Feature docs](docs/README.md#by-feature), one per feature and checked against the code
- [Platform docs](docs/README.md#platform-technical), cross-cutting technical topics
- [Backend contracts](docs/backend-contracts/README.md), specs for the Laravel team

When you change a feature, update its doc in the same pull request.

## Contributing

- Read [`AGENTS.md`](AGENTS.md) before any Next.js work. This project uses Next.js 16, whose APIs differ from older versions; the docs bundled in `node_modules/next/dist/docs/` are the reference.
- Follow the module pattern: `_components/`, `_lib/` (`schema.ts`, `queries.ts`, `hooks.ts`) next to each `page.tsx`.
- Gate UI with the permission helpers described in [permissions](docs/platform/permissions.md); the backend is the real authority.
