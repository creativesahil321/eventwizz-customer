/**
 * How long React Query may show cached data before it refetches, by the KIND
 * of data — so freshness is a decision made once, not a number per file.
 * Spread into a query: `useQuery({ queryKey, queryFn, ...FRESHNESS.operational })`.
 *
 * The React Query cache lives in memory only (cleared on reload). These rules
 * decide what a user sees while moving around an open tab.
 *
 * - live         Changes because OTHER people act, and the user acts on it:
 *                availability, sold counts, capacity checks. Always refetch
 *                when a screen opens and when the tab regains focus.
 * - operational  Dashboards, bookings, orders, notifications, revenue. Fresh
 *                for 30s, refetched on tab focus — a tab left open catches up.
 * - publicView   What customers browse on a storefront (events, dates,
 *                prices, availability). Matches the server render's freshness,
 *                so hydration does not refetch; checkout re-validates live.
 * - reference    Settings and catalogs that only change when THIS user saves
 *                them (mutations invalidate). The app-wide default.
 */
export const FRESHNESS = {
  live: {
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  },
  operational: {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  },
  publicView: {
    staleTime: 60_000,
  },
  reference: {
    staleTime: 5 * 60_000,
  },
} as const;
