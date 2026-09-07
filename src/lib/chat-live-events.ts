import type { LiveEvent, LocationData } from "@/types/theme.types";
import { isDisallowedChatSafetyIntent } from "@/lib/chat-safety";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "want",
  "to",
  "book",
  "booking",
  "for",
  "an",
  "event",
  "events",
  "party",
  "please",
  "can",
  "you",
  "me",
  "my",
  "find",
  "looking",
  "show",
  "tell",
  "about",
  "is",
  "are",
  "there",
  "any",
  "available",
  "near",
  "in",
  "on",
  "at",
  "do",
  "have",
  "has",
  "we",
  "your",
  "our",
  "with",
  "and",
  "or",
  "of",
  "this",
  "that",
  "some",
  "get",
  "go",
  "help",
  "category",
  "categories",
  "hi",
  "hii",
  "hello",
  "hey",
  "yo",
]);

/** Keep the chat picker short enough to read in the widget. */
export const MAX_LIVE_EVENT_CHAT_CHOICES = 6;

type LiveEventTheme = {
  key: string;
  label: string;
};

const LIVE_EVENT_THEMES: Array<LiveEventTheme & { pattern: RegExp }> = [
  {
    key: "christmas",
    label: "Christmas party",
    pattern: /\b(christmas|xmas)\b/i,
  },
  {
    key: "festive",
    label: "festive event",
    pattern: /\bfestive\b/i,
  },
  {
    key: "halloween",
    label: "Halloween event",
    pattern: /\bhalloween\b/i,
  },
  {
    key: "diwali",
    label: "Diwali event",
    pattern: /\b(diwali|deepavali)\b/i,
  },
  {
    key: "new-year",
    label: "New Year event",
    pattern: /\b(new\s*year|nye|hogmanay)\b/i,
  },
  {
    key: "wedding",
    label: "wedding",
    pattern: /\bwedding\b/i,
  },
  {
    key: "corporate",
    label: "corporate event",
    pattern: /\bcorporate\b/i,
  },
  {
    key: "valentine",
    label: "Valentine's event",
    pattern: /\bvalentines?\b/i,
  },
  {
    key: "networking",
    label: "networking event",
    pattern: /\b(networking|business events?)\b/i,
  },
  {
    key: "dj-club",
    label: "DJ / club night",
    pattern: /\b(dj nights?|club events?|club nights?|nightlife)\b/i,
  },
  {
    key: "themed",
    label: "themed party",
    pattern: /\b(themed parties|themed party|ibiza)\b/i,
  },
];

const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_PATTERN =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

export type RequestedEventDate = {
  month: number;
  day: number;
  label: string;
};

/** “25 dec”, “25th December”, “Dec 25”, “christmas day”. */
export function extractRequestedEventDate(
  text: string,
): RequestedEventDate | null {
  const query = normalizeChatBookingQuery(text).toLowerCase();
  if (!query) return null;
  if (/\bchristmas\s+day\b/.test(query)) {
    return { month: 12, day: 25, label: "25 Dec" };
  }
  const dayFirst = query.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\b`, "i"),
  );
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = MONTH_INDEX[dayFirst[2].toLowerCase()] ?? 0;
    if (day >= 1 && day <= 31 && month > 0) {
      return { month, day, label: `${day} ${titleCaseMonth(dayFirst[2])}` };
    }
  }
  const monthFirst = query.match(
    new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"),
  );
  if (monthFirst) {
    const month = MONTH_INDEX[monthFirst[1].toLowerCase()] ?? 0;
    const day = Number(monthFirst[2]);
    if (day >= 1 && day <= 31 && month > 0) {
      return { month, day, label: `${day} ${titleCaseMonth(monthFirst[1])}` };
    }
  }
  return null;
}

function titleCaseMonth(raw: string): string {
  const key = raw.toLowerCase();
  const names: Record<number, string> = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
  };
  return names[MONTH_INDEX[key] ?? 0] ?? raw;
}

function themeFromRequestedDate(
  date: RequestedEventDate,
): LiveEventTheme | null {
  if (date.month === 12 && date.day >= 24 && date.day <= 26) {
    return { key: "christmas", label: "Christmas party" };
  }
  if (date.month === 10 && date.day === 31) {
    return { key: "halloween", label: "Halloween event" };
  }
  if (date.month === 2 && (date.day === 14 || date.day === 15)) {
    return { key: "valentine", label: "Valentine's event" };
  }
  if (date.month === 1 && date.day === 1) {
    return { key: "new-year", label: "New Year event" };
  }
  return null;
}

export function extractLiveEventTheme(text: string): LiveEventTheme | null {
  const query = normalizeChatBookingQuery(text);
  if (!query) return null;
  for (const theme of LIVE_EVENT_THEMES) {
    if (theme.pattern.test(query)) {
      return { key: theme.key, label: theme.label };
    }
  }
  const dated = extractRequestedEventDate(query);
  return dated ? themeFromRequestedDate(dated) : null;
}

function eventSearchText(event: LiveEvent): string {
  return `${event.title} ${event.category_name || ""}`;
}

function eventTitleMatchesTheme(
  event: LiveEvent,
  theme: LiveEventTheme,
): boolean {
  const def = LIVE_EVENT_THEMES.find((item) => item.key === theme.key);
  return Boolean(def && def.pattern.test(event.title || ""));
}

function eventHasConflictingTheme(
  event: LiveEvent,
  theme: LiveEventTheme,
): boolean {
  return LIVE_EVENT_THEMES.some(
    (other) =>
      other.key !== theme.key && other.pattern.test(event.title || ""),
  );
}

function eventMatchesTheme(event: LiveEvent, theme: LiveEventTheme): boolean {
  const def = LIVE_EVENT_THEMES.find((item) => item.key === theme.key);
  if (!def) return false;
  if (def.pattern.test(event.title || "")) return true;
  if (eventHasConflictingTheme(event, theme)) return false;
  if (theme.key === "christmas") {
    return /\b(christmas|xmas)\b/i.test(event.category_name || "");
  }
  if (theme.key === "festive") {
    return /\bfestive\b/i.test(event.category_name || "");
  }
  return def.pattern.test(event.category_name || "");
}

/** True when they named a type (Christmas, Halloween) and this event is that type. */
export function liveEventMatchesRequestedTheme(
  event: LiveEvent,
  userText: string,
): boolean {
  const theme = extractLiveEventTheme(userText);
  if (!theme) return true;
  return eventMatchesTheme(event, theme);
}

const BROCHURE_WORD_DENY = new Set([
  "bridge",
  "bright",
  "britain",
  "british",
  "bristol",
  "broadcast",
  "broadway",
  "broken",
  "bronze",
  "brother",
  "brothers",
  "brought",
  "browse",
  "browser",
  "browsers",
  "bruise",
  "bruised",
  "brushes",
]);

function brochureEditDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 4;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const nextDiagonal = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + cost);
      diagonal = nextDiagonal;
    }
  }
  return row[b.length];
}

function isBrochureLikeWord(word: string): boolean {
  if (word.length < 5 || word.length > 12) return false;
  if (BROCHURE_WORD_DENY.has(word)) return false;
  if (
    word === "brochure" ||
    word === "brochures" ||
    word === "flyer" ||
    word === "flier" ||
    word === "flayer"
  ) {
    return true;
  }
  if (word.startsWith("fl")) {
    return (
      brochureEditDistance(word, "flyer") <= 2 ||
      brochureEditDistance(word, "flier") <= 2
    );
  }
  if (!word.startsWith("br")) return false;
  return (
    brochureEditDistance(word, "brochure") <= 3 ||
    brochureEditDistance(word, "brochures") <= 3
  );
}

/** True when they asked for an event brochure / flyer / PDF, including common typos. */
export function isBrochureQuestion(text: string): boolean {
  const t = normalizeChatBookingQuery(text);
  if (/\b(event\s+)?pdfs?\b/i.test(t)) return true;
  if (/\bdownloads? (the )?(brochure|flyer|pdf|pack)\b/i.test(t)) return true;
  return t
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((word) => isBrochureLikeWord(word));
}

export function isBroadEventListIntent(text: string): boolean {
  const t = normalizeChatBookingQuery(text);
  if (extractRequestedEventDate(t)) return false;
  return /\b(what('?s|\s+is)\s+on|upcoming\s+events?|live\s+events?|what\s+events?|which\s+events?|any\s+events?|events?\s+available|list\s+(of\s+)?events?|events?\s+(do you |have you )?have)\b/i.test(
    t,
  );
}

/** Fix glued words / typos so “bookchristmas” and “nwat to book” still match. */
export function normalizeChatBookingQuery(text: string): string {
  return text
    .replace(/\bnwat\b/gi, "want")
    .replace(/\bwana\b/gi, "want to")
    .replace(/\bwhicj\b/gi, "which")
    .replace(/\bwich\b/gi, "which")
    .replace(/\bavaiable\b/gi, "available")
    .replace(/\bavailble\b/gi, "available")
    .replace(/\bavaliable\b/gi, "available")
    .replace(
      /\bbook(christmas|xmas|diwali|halloween|nye|event|events|party)\b/gi,
      "book $1",
    )
    .replace(/\b(christmas|xmas)event\b/gi, "$1 event")
    .replace(/\s+/g, " ")
    .trim();
}

/** Customer wants to find / book a live event on the public venue site. */
export function isLiveEventBookingIntent(text: string): boolean {
  const t = normalizeChatBookingQuery(text);
  if (!t) return false;
  if (isDisallowedChatSafetyIntent(t)) return false;

  if (isBroadEventListIntent(t)) {
    return true;
  }

  if (
    /\b(book|booking|reserve|tickets?|tables?|want|looking\s+for|find|see|attend|join)\b/i.test(
      t,
    ) &&
    /\b(event|party|christmas|xmas|diwali|halloween|nye|new\s*year|wedding|festival|dinner|brunch|gala)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  // Short named asks: “Christmas”, “Diwali party”
  if (
    /\b(christmas|xmas|diwali|halloween|nye|new\s*year)\b/i.test(t) &&
    t.split(/\s+/).length <= 6
  ) {
    return true;
  }

  // Picker tap: “Book Corporate Event in Bristol” — not “Book in Bristol”
  if (
    /^book\s+.+\s+in\s+.+/i.test(t) &&
    !/^book(\s+an?)?\s+in\s+/i.test(t)
  ) {
    return true;
  }

  return false;
}

/** “Is Christmas available?” — listing, not starting a booking. */
export function isLiveEventAvailabilityQuestion(text: string): boolean {
  const t = normalizeChatBookingQuery(text);
  if (!t) return false;
  if (/\b(book|booking|reserve|checkout|pay)\b/i.test(t)) return false;
  const asksIfListed =
    /\b(available|availability)\b/i.test(t) ||
    /\b((is|are) there|do you have|have you (got|got any)|got any|any)\b/i.test(
      t,
    );
  if (!asksIfListed) return false;
  return Boolean(
    extractLiveEventTheme(t) ||
      /\b(event|events|party|parties)\b/i.test(t),
  );
}

export function buildLiveEventHref(event: LiveEvent): string {
  const locationSlug = event.location_slug.replace(/^\/+|\/+$/g, "");
  const eventSlug = event.slug.replace(/^\/+|\/+$/g, "");
  return `/${locationSlug}/events/${eventSlug}`;
}

export type GuestBookableLink = {
  title: string;
  href: string;
  locationCity?: string;
  locationHref?: string;
};

export function buildLocationPageHref(locationSlug: string): string {
  const slug = locationSlug.replace(/^\/+|\/+$/g, "");
  return slug ? `/${slug}` : "";
}

/** Event + location URLs for a logged-out guest who wants to book. */
export function listGuestBookableLinks(
  events: LiveEvent[] | null | undefined,
): GuestBookableLink[] {
  const seen = new Set<string>();
  const out: GuestBookableLink[] = [];
  for (const event of events ?? []) {
    const href = buildLiveEventHref(event);
    if (seen.has(href)) continue;
    seen.add(href);
    const locationHref = buildLocationPageHref(event.location_slug);
    out.push({
      title: event.title,
      href,
      locationCity: event.location_city?.trim() || undefined,
      locationHref: locationHref || undefined,
    });
    if (out.length >= MAX_LIVE_EVENT_CHAT_CHOICES) break;
  }
  return out;
}

function normalizeSlug(slug: string): string {
  return slug.replace(/^\/+|\/+$/g, "").toLowerCase();
}

/**
 * Chat must only offer events whose location exists on this storefront.
 * Theme `live_events` can include stale venue names (404s like
 * /walton-summit-centre/events/…) that are not in `theme.locations`.
 */
export function filterLiveEventsToPublishedLocations(
  liveEvents: LiveEvent[] | null | undefined,
  locations: LocationData[] | null | undefined,
): LiveEvent[] {
  const events = liveEvents ?? [];
  const published = (locations ?? []).filter(
    (location) => typeof location.slug === "string" && location.slug.trim(),
  );
  if (published.length === 0) return events;

  const slugs = new Set(
    published.map((location) => normalizeSlug(location.slug)),
  );
  const cityBySlug = new Map(
    published.map((location) => [
      normalizeSlug(location.slug),
      (location.city ?? "").trim(),
    ]),
  );

  return events
    .filter((event) => slugs.has(normalizeSlug(event.location_slug)))
    .map((event) => {
      const catalogCity = cityBySlug.get(normalizeSlug(event.location_slug));
      if (catalogCity) {
        return { ...event, location_city: catalogCity };
      }
      return event;
    });
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function significantTokenOverlap(queryToken: string, candidate: string): boolean {
  if (!queryToken || !candidate) return false;
  if (queryToken === candidate) return true;
  if (queryToken.length >= 4 && candidate.length >= 4) {
    return candidate.includes(queryToken) || queryToken.includes(candidate);
  }
  return false;
}

function scoreEvent(query: string, event: LiveEvent): number {
  const q = normalize(query);
  const title = normalize(event.title);
  const category = normalize(event.category_name || "");
  const haystack = normalize(eventSearchText(event));
  const city = normalize(event.location_city);
  const qTokens = tokens(query);
  const titleTokens = tokens(event.title);
  const categoryTokens = tokens(event.category_name || "");

  if (!q) return 0;

  // Exact / contains title — only when the query is the title, not a chat dump
  if (title.length >= 4 && q.includes(title) && q.length - title.length <= 16) {
    return 100;
  }
  if (title.length >= 4 && title.includes(q) && q.length >= 4) return 100;
  if (
    category.length >= 4 &&
    q.includes(category) &&
    q.length - category.length <= 16
  ) {
    return 90;
  }

  let score = 0;
  if (/\b(christmas|xmas|festive)\b/.test(q) && /\b(christmas|xmas|festive)\b/.test(haystack)) {
    score += 80;
  }
  if (/\b(diwali|deepavali)\b/.test(q) && /\b(diwali|deepavali)\b/.test(haystack)) {
    score += 80;
  }
  if (
    /\b(new\s*year|nye|hogmanay)\b/.test(q) &&
    /\b(new\s*year|nye|hogmanay)\b/.test(haystack)
  ) {
    score += 80;
  }
  if (/\bhalloween\b/.test(q) && /\bhalloween\b/.test(haystack)) {
    score += 80;
  }
  if (/\bvalentines?\b/.test(q) && /\bvalentines?\b/.test(haystack)) {
    score += 80;
  }
  if (/\bwedding\b/.test(q) && /\bwedding\b/.test(haystack)) {
    score += 80;
  }

  for (const qt of qTokens) {
    if (titleTokens.some((tt) => significantTokenOverlap(qt, tt))) {
      score += 18;
    }
    if (categoryTokens.some((ct) => significantTokenOverlap(qt, ct))) {
      score += 28;
    }
    if (city === qt || (qt.length >= 4 && (city.includes(qt) || qt.includes(city)))) {
      score += 8;
    }
  }

  return score;
}

function eventsMatchingCategoryQuery(
  query: string,
  events: LiveEvent[],
): LiveEvent[] {
  const qTokens = tokens(query).filter((token) => token.length >= 4);
  if (qTokens.length === 0) return [];
  return events.filter((event) => {
    const category = normalize(event.category_name || "");
    if (!category) return false;
    const categoryTokens = tokens(event.category_name || "");
    return qTokens.some(
      (qt) =>
        category.includes(qt) ||
        categoryTokens.some((ct) => significantTokenOverlap(qt, ct)),
    );
  });
}

function extractMentionedCity(
  query: string,
  events: LiveEvent[],
): string | null {
  const q = normalize(query);
  if (!q) return null;

  const candidates = events.flatMap((event) => {
    const city = normalize(event.location_city);
    const slugCity = normalize(event.location_slug.replace(/-/g, " "));
    return [
      { key: city, city },
      { key: slugCity, city },
    ].filter((item) => item.key);
  });

  const unique = [
    ...new Map(candidates.map((item) => [item.key, item])).values(),
  ].sort((a, b) => b.key.length - a.key.length);

  for (const item of unique) {
    if (q.includes(item.key)) return item.city;
  }
  return null;
}

/** City the guest just named (including “Book in Bristol”). */
export function mentionedLiveEventCity(
  query: string,
  events: LiveEvent[],
): string | null {
  return extractMentionedCity(query, events);
}

/** True when the message is a location tap / “Book in {city}”, not a named event. */
export function isLiveEventLocationChoiceText(
  text: string,
  events: LiveEvent[],
): boolean {
  const city = extractMentionedCity(text, events);
  if (!city) return false;
  const n = normalize(text);
  if (n === city) return true;
  if (n === `book in ${city}`) return true;
  if (n.startsWith("book in ") && n.endsWith(city)) return true;
  return false;
}

function toMatch(event: LiveEvent, score: number): LiveEventChatMatch {
  return {
    event,
    href: buildLiveEventHref(event),
    score,
  };
}

/** Tap payload: `Book Corporate Event in Bristol`. */
function matchExactEventBookChoice(
  text: string,
  liveEvents: LiveEvent[],
): LiveEventChatMatch[] {
  const match = text.trim().match(/^book\s+(.+?)\s+in\s+(.+)$/i);
  if (!match) return [];
  const title = normalize(match[1]);
  const city = normalize(match[2]);
  if (!title || !city || title === "in") return [];
  if (/^(an?\s+)?events?$/.test(title)) return [];

  const exact = liveEvents.filter(
    (event) =>
      normalize(event.title) === title &&
      normalize(event.location_city) === city,
  );
  if (exact.length > 0) return exact.map((event) => toMatch(event, 100));

  const byTitle = liveEvents.filter((event) => {
    const eventTitle = normalize(event.title);
    if (eventTitle === title) return true;
    if (
      title.length >= 8 &&
      eventTitle.length >= 8 &&
      (eventTitle.includes(title) || title.includes(eventTitle))
    ) {
      return true;
    }
    return false;
  });
  const inCity = byTitle.filter(
    (event) => normalize(event.location_city) === city,
  );
  const chosen = inCity.length > 0 ? inCity : byTitle;
  return chosen.map((event) => toMatch(event, 90));
}

export type LiveEventChatMatch = {
  event: LiveEvent;
  href: string;
  score: number;
};

/**
 * Match user text against theme `live_events`.
 * Returns matches sorted by score (best first). Empty = no confident match.
 */
export function asWeakMatches(events: LiveEvent[]): LiveEventChatMatch[] {
  return events.map((event) => ({
    event,
    href: buildLiveEventHref(event),
    score: 1,
  }));
}

function themeMatchesFromPool(
  pool: LiveEvent[],
  theme: LiveEventTheme,
  scored: LiveEventChatMatch[],
): LiveEventChatMatch[] {
  const themeEvents = pool.filter((event) => eventMatchesTheme(event, theme));
  if (themeEvents.length === 0) return [];
  const titleHits = themeEvents.filter((event) =>
    eventTitleMatchesTheme(event, theme),
  );
  const use = titleHits.length > 0 ? titleHits : themeEvents;
  const scoreByKey = new Map(
    scored.map((item) => [
      `${item.event.location_slug}/${item.event.slug}`,
      item.score,
    ]),
  );
  return use
    .map((event) =>
      toMatch(
        event,
        scoreByKey.get(`${event.location_slug}/${event.slug}`) ?? 80,
      ),
    )
    .sort((a, b) => b.score - a.score);
}

export function matchLiveEvents(
  userText: string,
  liveEvents: LiveEvent[] | null | undefined,
): LiveEventChatMatch[] {
  if (!liveEvents?.length) return [];
  const exact = matchExactEventBookChoice(userText, liveEvents);
  if (exact.length > 0) return exact;

  const query = normalizeChatBookingQuery(userText);
  const mentionedCity = extractMentionedCity(query, liveEvents);
  const theme = extractLiveEventTheme(query);
  const pool = mentionedCity
    ? liveEvents.filter(
        (event) => normalize(event.location_city) === mentionedCity,
      )
    : liveEvents;
  if (pool.length === 0) return [];

  const scored = pool
    .map((event) => ({
      event,
      href: buildLiveEventHref(event),
      score: scoreEvent(query, event),
    }))
    .filter((m) => m.score >= 18)
    .sort((a, b) => b.score - a.score);

  const listingIntent = isBroadEventListIntent(query);
  const bookingIntent = /\b(book|booking|reserve)\b/i.test(query);
  const brochureIntent = isBrochureQuestion(query);

  if (theme) {
    const themed = themeMatchesFromPool(pool, theme, scored);
    if (themed.length > 0) return themed;
    // Named a type (Christmas, Diwali) — never fall back to a random wedding / DJ night.
    return [];
  }

  if (scored.length > 0) {
    const top = scored[0].score;
    const close = scored.filter((m) => m.score >= Math.max(18, top - 25));
    return close;
  }

  const categoryHits = eventsMatchingCategoryQuery(query, pool);
  if (categoryHits.length > 0) {
    return categoryHits.map((event) => toMatch(event, 70));
  }

  if (listingIntent || bookingIntent || brochureIntent || mentionedCity) {
    return asWeakMatches(pool);
  }

  return [];
}

/**
 * Keep the same event across follow-ups like “50” or “tables only”.
 * Uses the current message, earlier chat text, and any /location/events/slug links.
 */
export function matchLiveEventsFromConversation(
  userText: string,
  messages: Array<{ role: string; content: string }>,
  liveEvents: LiveEvent[] | null | undefined,
): LiveEventChatMatch[] {
  if (!liveEvents?.length) return [];

  const exact = matchExactEventBookChoice(userText, liveEvents);
  if (exact.length > 0) return exact;

  const currentTheme = extractLiveEventTheme(userText);
  const fromCurrentTheme = matchLiveEvents(userText, liveEvents);
  if (currentTheme) {
    const themed = fromCurrentTheme.filter((item) =>
      eventMatchesTheme(item.event, currentTheme),
    );
    return themed;
  }

  const mentionedCity = extractMentionedCity(userText, liveEvents);
  const priorCorpus = messages.map((m) => m.content).join("\n");
  const priorMatches = priorCorpus.trim()
    ? matchLiveEvents(priorCorpus, liveEvents)
    : [];

  if (mentionedCity) {
    const atCity = (list: LiveEventChatMatch[]) =>
      list.filter((m) => normalize(m.event.location_city) === mentionedCity);

    if (priorMatches.length > 0) {
      const cityHits = atCity(priorMatches);
      if (cityHits.length > 0) return cityHits;
      return [];
    } else {
      const cityEvents = liveEvents.filter(
        (event) => normalize(event.location_city) === mentionedCity,
      );
      if (cityEvents.length > 0) {
        const fromQuery = matchLiveEvents(
          `${priorCorpus}\n${userText}`.trim(),
          cityEvents,
        );
        if (fromQuery.length > 0) return fromQuery;
      }
    }
  }

  const fromCurrent = matchLiveEvents(userText, liveEvents);
  if (fromCurrent.length > 0) {
    if (priorMatches.length > 0) {
      const pinned = new Set(
        priorMatches.map(
          (item) => `${item.event.location_slug}/${item.event.slug}`,
        ),
      );
      const overlap = fromCurrent.filter((item) =>
        pinned.has(`${item.event.location_slug}/${item.event.slug}`),
      );
      if (overlap.length > 0) return overlap;
      const q = normalize(userText);
      const namedOther = fromCurrent.filter((item) => {
        const title = normalize(item.event.title);
        return title.length >= 4 && q.includes(title);
      });
      if (namedOther.length === 0) return priorMatches;
      return namedOther;
    }
    return fromCurrent;
  }

  const corpus = [userText, ...messages.map((m) => m.content)].join("\n");
  const hrefHits: LiveEventChatMatch[] = [];
  const seen = new Set<string>();
  const hrefRe = /\/([A-Za-z0-9-]+)\/events\/([A-Za-z0-9-]+)/g;
  let hrefMatch: RegExpExecArray | null;
  while ((hrefMatch = hrefRe.exec(corpus)) !== null) {
    const locationSlug = hrefMatch[1];
    const eventSlug = hrefMatch[2];
    const event = liveEvents.find(
      (item) =>
        item.slug === eventSlug && item.location_slug === locationSlug,
    );
    if (!event) continue;
    const key = `${locationSlug}/${eventSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hrefHits.push({
      event,
      href: buildLiveEventHref(event),
      score: 95,
    });
  }
  if (hrefHits.length > 0) return hrefHits;

  const userCorpus = [
    userText,
    ...messages.filter((m) => m.role === "user").map((m) => m.content),
  ].join("\n");
  const fromUsers = matchLiveEvents(userCorpus, liveEvents);
  if (fromUsers.length > 0) return fromUsers;

  return matchLiveEvents(corpus, liveEvents);
}

/** True when chat should ask city / list events — not load one event’s rooms yet. */
export function needsLiveEventLocationChoice(
  userText: string,
  matches: LiveEventChatMatch[],
  allLiveEvents: LiveEvent[],
): boolean {
  if (!matches.length) return false;
  const theme = extractLiveEventTheme(userText);
  if (
    theme &&
    !matches.some((item) => eventMatchesTheme(item.event, theme))
  ) {
    return true;
  }
  if (theme) {
    const themed = matches.filter((item) => eventMatchesTheme(item.event, theme));
    const themeCities = new Set(
      themed.map((item) => normalize(item.event.location_city)).filter(Boolean),
    );
    if (themeCities.size > 1 && !extractMentionedCity(userText, allLiveEvents)) {
      return true;
    }
    if (distinctEventTitles(themed) > 1) return true;
  }
  if (
    matches.every((m) => m.score <= 1) ||
    isBroadEventListIntent(userText) ||
    isBrochureQuestion(userText)
  ) {
    return true;
  }

  const titles = new Set(matches.map((m) => normalize(m.event.title)));
  if (titles.size > 1) return true;

  const byTitle = new Map<string, LiveEventChatMatch[]>();
  for (const m of matches) {
    const key = normalize(m.event.title);
    const list = byTitle.get(key) ?? [];
    list.push(m);
    byTitle.set(key, list);
  }
  const primaryGroup = byTitle.get([...byTitle.keys()][0]) ?? matches;
  const cities = [
    ...new Set(primaryGroup.map((m) => normalize(m.event.location_city))),
  ];
  const mentionedCity = extractMentionedCity(userText, allLiveEvents);
  if (mentionedCity && !cities.includes(mentionedCity)) return true;
  return primaryGroup.length > 1;
}

function titleCaseCity(city: string): string {
  if (!city) return city;
  return city
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatCityList(cities: string[]): string {
  if (cities.length <= 1) return cities[0] ?? "";
  if (cities.length === 2) return `${cities[0]} and ${cities[1]}`;
  return `${cities.slice(0, -1).join(", ")} and ${cities[cities.length - 1]}`;
}

function chatChoiceMarkdown(label: string, sendText: string): string {
  return `[${label}](chat:${sendText})`;
}

function eventBookSendText(event: LiveEvent): string {
  const city = titleCaseCity(event.location_city);
  return `Book ${event.title} in ${city}`;
}

function eventChoiceLabel(event: LiveEvent): string {
  const category = event.category_name?.trim();
  const raw = category ? `${event.title} · ${category}` : event.title;
  if (raw.length <= 120) return raw;
  return event.title.length <= 120
    ? event.title
    : `${event.title.slice(0, 117)}…`;
}

function formatLiveEventChoiceMarkdown(events: LiveEvent[]): string {
  return events
    .map((event) =>
      chatChoiceMarkdown(eventChoiceLabel(event), eventBookSendText(event)),
    )
    .join("\n");
}

function distinctEventTitles(matches: LiveEventChatMatch[]): number {
  return new Set(matches.map((m) => normalize(m.event.title))).size;
}

function buildEventPickerReply(options: {
  intro: string;
  events: LiveEvent[];
  totalCount?: number;
  footer?: string;
}): string {
  const shown = options.events.slice(0, MAX_LIVE_EVENT_CHAT_CHOICES);
  const total = options.totalCount ?? options.events.length;
  const more =
    total > shown.length
      ? ` Showing ${shown.length} of ${total} — tell me the event name if you don’t see it.`
      : "";
  const footer =
    options.footer ??
    "Tap the one you’d like and I’ll book it here in chat.";
  return `${options.intro}${more}\n\n${formatLiveEventChoiceMarkdown(shown)}\n\n${footer}`;
}

/**
 * Professional UK English reply with markdown booking links.
 */
export function buildLiveEventsDirectReply(options: {
  userText: string;
  matches: LiveEventChatMatch[];
  allLiveEvents: LiveEvent[];
  siteName?: string | null;
  userName?: string | null;
}): {
  content: string;
  supportCta?: { href: string; label: string };
} | null {
  const { userText, matches, allLiveEvents, siteName, userName } = options;
  if (!matches.length) return null;

  const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
  const brand = siteName?.trim() || "our venue";
  const mentionedCity = extractMentionedCity(userText, allLiveEvents);
  const askedCity = mentionedCity ? titleCaseCity(mentionedCity) : null;
  const theme = extractLiveEventTheme(userText);
  const themeHits = theme
    ? matches.filter((m) => eventMatchesTheme(m.event, theme))
    : [];

  // Group by event title (case-insensitive)
  const byTitle = new Map<string, LiveEventChatMatch[]>();
  for (const m of matches) {
    const key = normalize(m.event.title);
    const list = byTitle.get(key) ?? [];
    list.push(m);
    byTitle.set(key, list);
  }

  const titles = [...byTitle.keys()];
  const primaryGroup = byTitle.get(titles[0]) ?? matches;
  const displayTitle = primaryGroup[0].event.title;
  const cities = [
    ...new Set(primaryGroup.map((m) => titleCaseCity(m.event.location_city))),
  ];
  const primary = primaryGroup[0];

  const askedBrochure = isBrochureQuestion(userText);
  const themeCities = [
    ...new Set(
      themeHits
        .map((item) => titleCaseCity(item.event.location_city))
        .filter(Boolean),
    ),
  ];

  if (
    theme &&
    themeHits.length > 0 &&
    !askedBrochure &&
    !isBroadEventListIntent(userText)
  ) {
    if (!askedCity && themeCities.length > 1) {
      const sameTitle = distinctEventTitles(themeHits) === 1;
      const intro = sameTitle
        ? `**${themeHits[0].event.title}** is currently available in **${formatCityList(themeCities)}**${nameBit}.`
        : `**${theme.label}** listings are currently available in **${formatCityList(themeCities)}**${nameBit}.`;
      const linkLines = sameTitle
        ? themeHits.map((item) => {
            const city = titleCaseCity(item.event.location_city);
            return chatChoiceMarkdown(`Book in ${city}`, `Book in ${city}`);
          })
        : themeHits.slice(0, MAX_LIVE_EVENT_CHAT_CHOICES).map((item) => {
            const city = titleCaseCity(item.event.location_city);
            return chatChoiceMarkdown(
              city ? `${item.event.title} · ${city}` : item.event.title,
              eventBookSendText(item.event),
            );
          });
      return {
        content: `${intro}\n\n${linkLines.join("\n")}\n\n${
          sameTitle
            ? "Which location would you like? I’ll help you book it here."
            : "Tap the one you’d like and I’ll help you book it here in chat."
        }`,
      };
    }
    if (distinctEventTitles(themeHits) > 1) {
      const cityBit = askedCity ? ` in **${askedCity}**` : "";
      const askedDate = extractRequestedEventDate(userText);
      const dateBit = askedDate ? ` for **${askedDate.label}**` : "";
      return {
        content: buildEventPickerReply({
          intro: `These look closest to a **${theme.label}**${dateBit}${cityBit}${nameBit}:`,
          events: themeHits.map((item) => item.event),
          totalCount: themeHits.length,
          footer: askedDate
            ? "Tap one and I’ll check whether that date is bookable here in chat."
            : "Tap the one you’d like and I’ll help you book it here in chat.",
        }),
      };
    }
  }

  const browsingCatalogue =
    askedBrochure ||
    matches.every((m) => m.score <= 1) ||
    isBroadEventListIntent(userText) ||
    (!theme && distinctEventTitles(matches) > 1);

  if (browsingCatalogue) {
    const pickerEvents =
      themeHits.length > 0 ? themeHits.map((m) => m.event) : matches.map((m) => m.event);
    let intro: string;
    if (askedBrochure) {
      intro = `Which event would you like the brochure for${nameBit}?`;
    } else if (theme && themeHits.length === 0) {
      const elsewhereCities = [
        ...new Set(
          allLiveEvents
            .filter((event) => eventMatchesTheme(event, theme))
            .map((event) => titleCaseCity(event.location_city))
            .filter(Boolean),
        ),
      ];
      const elsewhereBit =
        elsewhereCities.length > 0
          ? ` It’s currently listed in **${elsewhereCities.join(" and ")}**.`
          : "";
      intro = askedCity
        ? `I couldn’t find a **${theme.label}** in **${askedCity}** on the current list${nameBit}.${elsewhereBit}\n\nHere are events you can book in **${askedCity}**:`
        : `I couldn’t find a **${theme.label}** on the current list${nameBit}.\n\nHere are events you can book at **${brand}**:`;
    } else if (theme && themeHits.length > 0 && askedCity) {
      intro = `These look closest to a **${theme.label}** in **${askedCity}**${nameBit}:`;
    } else if (askedCity) {
      intro = `Here’s what’s available to book in **${askedCity}**${nameBit}:`;
    } else {
      intro = `Here’s what’s currently available to book at **${brand}**${nameBit}:`;
    }
    return {
      content: buildEventPickerReply({
        intro,
        events: pickerEvents,
        totalCount: pickerEvents.length,
        footer: askedBrochure
          ? "Tap an event and I’ll send the brochure files I have for it."
          : undefined,
      }),
    };
  }

  // User asked about a city that doesn’t have this event
  if (
    mentionedCity &&
    !cities.some((c) => normalize(c) === mentionedCity)
  ) {
    const available = cities.join(" and ");
    const asked = titleCaseCity(mentionedCity);
    const linkLines = primaryGroup.map((m) => {
      const city = titleCaseCity(m.event.location_city);
      return chatChoiceMarkdown(
        `Book ${displayTitle} in ${city}`,
        `Book in ${city}`,
      );
    });
    return {
      content: `**${displayTitle}** is currently available in **${available}**, but not in **${asked}**.\n\n${linkLines.join(" · ")}\n\nWould you like help with anything else?`,
    };
  }

  // One location
  if (primaryGroup.length === 1) {
    const city = titleCaseCity(primary.event.location_city);
    return {
      content: `Yes${nameBit} — **${displayTitle}** is available in **${city}**. I’ll help you book it here.`,
    };
  }

  // Multiple locations — stay in chat; never navigate to /{slug}/events/…
  const linkLines = primaryGroup.map((m) => {
    const city = titleCaseCity(m.event.location_city);
    return chatChoiceMarkdown(`Book in ${city}`, `Book in ${city}`);
  });
  return {
    content: `**${displayTitle}** is currently available in **${cities.join(" and ")}**.\n\n${linkLines.join(" · ")}\n\nWhich location would you like? I’ll help you book it here.`,
  };
}

/** Guest asked for an event that is not on any published location. */
export function buildLiveEventsNoMatchReply(options: {
  allLiveEvents: LiveEvent[];
  siteName?: string | null;
  userName?: string | null;
  userText?: string | null;
}): { content: string } {
  const { allLiveEvents, siteName, userName, userText } = options;
  const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
  const brand = siteName?.trim() || "our venue";
  if (!allLiveEvents.length) {
    return {
      content: `I don’t have any events listed to book on **${brand}** right now${nameBit}. Please choose a location from the directory, or tell me which city you have in mind.`,
    };
  }
  const theme = userText ? extractLiveEventTheme(userText) : null;
  const askedDate = userText ? extractRequestedEventDate(userText) : null;
  const askedCity = userText
    ? extractMentionedCity(userText, allLiveEvents)
    : null;
  const cityLabel = askedCity ? titleCaseCity(askedCity) : null;
  let intro: string;
  if (cityLabel) {
    intro = `I don’t have that event listed in **${cityLabel}** right now${nameBit}. Here’s what’s available to book at **${brand}**:`;
  } else if (theme && askedDate) {
    intro = `I couldn’t find a **${theme.label}** for **${askedDate.label}** among our current listings${nameBit}. Here’s what’s available to book at **${brand}**:`;
  } else if (theme) {
    intro = `I couldn’t find a **${theme.label}** among our current listings${nameBit}. Here’s what’s available to book at **${brand}**:`;
  } else if (askedDate) {
    intro = `I can’t see a published event specifically for **${askedDate.label}** from this list${nameBit}. Tap an event and I’ll check whether that date is bookable:`;
  } else {
    intro = `I couldn’t find that event among our current locations${nameBit}. Here’s what’s available to book at **${brand}**:`;
  }
  return {
    content: buildEventPickerReply({
      intro,
      events: allLiveEvents,
      totalCount: allLiveEvents.length,
    }),
  };
}

/** Compact block when EVENT BOOKING DATA is already loaded — avoid blowing the context window. */
export function buildCompactLiveEventsPromptBlock(
  liveEvents: LiveEvent[] | null | undefined,
): string {
  if (!liveEvents?.length) {
    return `
LIVE EVENTS (names + cities only):
- No other live events listed.
`;
  }
  const lines = liveEvents.slice(0, 10).map((event) => {
    const city = event.location_city?.trim() || event.location_slug;
    const category = event.category_name?.trim();
    return category
      ? `- ${event.title} (${city} · ${category})`
      : `- ${event.title} (${city})`;
  });
  return `
LIVE EVENTS (names, cities, categories — current booking is EVENT BOOKING DATA):
${lines.join("\n")}
If they ask about a different event or category, use this list. Titles may be people's names — match category_name (Christmas, weddings, DJ nights). If category_name is null, only match the title. Never pick a random name because they said “book an event”.
`;
}
export function buildLiveEventsPromptBlock(
  liveEvents: LiveEvent[] | null | undefined,
): string {
  if (!liveEvents?.length) {
    return `
LIVE EVENTS (theme):
- No live/bookable events are currently listed.
- Do not invent event names or booking URLs.
`;
  }

  const lines = liveEvents.slice(0, MAX_LIVE_EVENT_CHAT_CHOICES).map((e) => {
    const city = e.location_city?.trim() || e.location_slug;
    const category = e.category_name?.trim() || "uncategorised";
    return `- ${e.title} | ${city} | ${category} | in-chat: [${e.title} · ${city}](chat:Book ${e.title} in ${city})`;
  });

  return `
LIVE EVENTS (authoritative — only these cities exist on this site):
When the guest asks about an event by name or category (e.g. Christmas, Diwali, New Year, weddings):
1. Answer from this list only — never invent events, cities, or URLs.
2. Event titles are often people's names. The type is category_name. Match category_name when they ask for Christmas, Halloween, weddings, etc. If category_name is null, only match the title.
3. If they named a city or category, only offer matching events. If none match, say so in one sentence, then offer at most ${MAX_LIVE_EVENT_CHAT_CHOICES} alternatives in that city (or at this venue). Never start booking a different category.
4. Event buttons MUST be unique — never repeat “Book now”. Use [Event name · City](chat:Book Event name in City).
5. Location-only picks stay in chat: [Book in City](chat:Book in City)
6. NEVER write /chat: or /chat — the prefix is chat: with no slash. Dates: [Thu 27 Aug](chat:Thu 27 Aug 2026)
7. NEVER send [Book in City](/location-slug/events/event-slug) — that leaves chat.
8. If EVENT BOOKING DATA is loaded, stay in chat: one question at a time (dates labelled with room when this event has rooms → guests → tables/tickets → which table types and quantities → which ticket types and quantities → drinks, then another date if they want, or another room only when rooms exist → summary/coupon → pay in chat). Do not send them to the event page, cart, or Checkout.
9. Dates must show the room name only when this event has rooms. Guests can pick more than one drink and more than one date (and more than one room when rooms exist). Quote prices. Coupon last — after they apply a code, repeat it on the summary with the discount. Visit the event page only if chat cannot continue. Never invent table counts. Never show stock unless they ask for more than is available.

${lines.join("\n")}
`;
}
