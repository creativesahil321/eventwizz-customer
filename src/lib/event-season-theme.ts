/**
 * Seasonal calendar icons are driven by event category (and optional
 * explicit theme / name). Never by the calendar date alone.
 *
 * Category slugs match the platform event-categories list.
 */

export const EVENT_SEASON_THEMES = [
  "christmas",
  "santa",
  "new_year",
  "valentines",
  "halloween",
  "easter",
  "diwali",
  "eid",
  "pride",
] as const;

export type EventSeasonTheme = (typeof EVENT_SEASON_THEMES)[number];

export type EventSeasonThemeSource = {
  eventTheme?: string | null;
  event_theme?: string | null;
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  category_slug?: string | null;
};

/** Official public category slug → calendar theme. Non-seasonal cats stay unset. */
export const CATEGORY_SLUG_TO_THEME: Record<string, EventSeasonTheme> = {
  "christmas-events": "christmas",
  "new-year-parties": "new_year",
  "halloween-events": "halloween",
  "valentines-day-specials": "valentines",
  "easter-events": "easter",
  diwali: "diwali",
  eid: "eid",
  "pride-events": "pride",
};

/** More specific themes win when several events share a date. */
const THEME_PRIORITY: EventSeasonTheme[] = [
  "santa",
  "halloween",
  "valentines",
  "christmas",
  "new_year",
  "easter",
  "diwali",
  "eid",
  "pride",
];

export const EVENT_SEASON_THEME_LABEL: Record<EventSeasonTheme, string> = {
  christmas: "Christmas event",
  santa: "Santa's Grotto event",
  new_year: "New Year event",
  valentines: "Valentine's event",
  halloween: "Halloween event",
  easter: "Easter event",
  diwali: "Diwali event",
  eid: "Eid event",
  pride: "Pride event",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/['’]/g, "").replace(/[\s_]+/g, "-");
}

function normalizeExplicitTheme(value: unknown): EventSeasonTheme | null {
  if (typeof value !== "string") return null;
  const key = normalizeKey(value).replace(/-/g, "_");
  if (key === "nye" || key === "newyear") return "new_year";
  if (key === "valentine" || key === "valentines_day") return "valentines";
  if (key === "xmas") return "christmas";
  if ((EVENT_SEASON_THEMES as readonly string[]).includes(key)) {
    return key as EventSeasonTheme;
  }
  return null;
}

function themeFromCategory(value: string | null | undefined): EventSeasonTheme | null {
  if (!value?.trim()) return null;
  const slug = normalizeKey(value);
  if (CATEGORY_SLUG_TO_THEME[slug]) return CATEGORY_SLUG_TO_THEME[slug];
  return inferThemeFromText(value);
}

function inferThemeFromText(text: string): EventSeasonTheme | null {
  const t = text.toLowerCase().replace(/[-_]+/g, " ");
  if (/\b(santa|grotto|father christmas)\b/.test(t)) return "santa";
  if (/\b(halloween|spooky|pumpkin)\b/.test(t)) return "halloween";
  if (/\b(valentine|valentines)\b/.test(t)) return "valentines";
  if (/\b(new year|nye|hogmanay)\b/.test(t)) return "new_year";
  if (/\beaster\b/.test(t)) return "easter";
  if (/\bdiwali\b/.test(t)) return "diwali";
  if (/\beid\b/.test(t)) return "eid";
  if (/\bpride\b/.test(t)) return "pride";
  if (/\b(christmas|xmas|yuletide|winter wonderland|festive)\b/.test(t)) {
    return "christmas";
  }
  return null;
}

/** Resolve one event to a season theme, or null if it is not seasonal. */
export function resolveEventSeasonTheme(
  source: EventSeasonThemeSource,
): EventSeasonTheme | null {
  const explicit = normalizeExplicitTheme(
    source.eventTheme ?? source.event_theme,
  );
  if (explicit) return explicit;

  const fromCategory = themeFromCategory(
    source.category_slug ?? source.category,
  );
  if (fromCategory) return fromCategory;

  const blob = [source.name, source.slug]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
  if (!blob) return null;
  return inferThemeFromText(blob);
}

/** One icon per date — never stack multiple themes in the cell. */
export function pickDateSeasonTheme(
  events: EventSeasonThemeSource[],
): EventSeasonTheme | null {
  const themes = new Set<EventSeasonTheme>();
  for (const event of events) {
    const theme = resolveEventSeasonTheme(event);
    if (theme) themes.add(theme);
  }
  if (themes.size === 0) return null;
  return THEME_PRIORITY.find((theme) => themes.has(theme)) ?? null;
}

export function eventThemesBySlugFromSearchResults(
  results: Array<{
    type?: string;
    event?: {
      slug?: string | null;
      name?: string | null;
      category?: { slug?: string | null; name?: string | null } | string | null;
    };
  }>,
): Record<string, EventSeasonTheme> {
  const map: Record<string, EventSeasonTheme> = {};
  for (const result of results) {
    if (result.type !== "event" || !result.event?.slug) continue;
    const category = result.event.category;
    const theme = resolveEventSeasonTheme({
      name: result.event.name,
      slug: result.event.slug,
      category_slug:
        typeof category === "object" && category
          ? category.slug
          : undefined,
      category:
        typeof category === "string"
          ? category
          : category?.name ?? category?.slug,
    });
    if (theme) map[result.event.slug] = theme;
  }
  return map;
}

export function seasonThemesByDateFromEvents(
  days: Array<{
    date: string;
    locations?: Array<{
      events?: Array<EventSeasonThemeSource>;
    }>;
  }>,
  themesByEventSlug?: Record<string, EventSeasonTheme>,
): Record<string, EventSeasonTheme> {
  const map: Record<string, EventSeasonTheme> = {};
  for (const day of days) {
    const events =
      day.locations?.flatMap((location) =>
        (location.events ?? []).map((event) => ({
          ...event,
          eventTheme:
            event.eventTheme ??
            event.event_theme ??
            (event.slug ? themesByEventSlug?.[event.slug] : undefined),
        })),
      ) ?? [];
    const theme = pickDateSeasonTheme(events);
    if (theme) map[day.date] = theme;
  }
  return map;
}
