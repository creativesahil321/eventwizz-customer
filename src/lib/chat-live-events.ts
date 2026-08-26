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
]);

/** Fix glued words / typos so “bookchristmas” and “nwat to book” still match. */
export function normalizeChatBookingQuery(text: string): string {
  return text
    .replace(/\bnwat\b/gi, "want")
    .replace(/\bwana\b/gi, "want to")
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

  if (
    /\b(what('?s|\s+is)\s+on|upcoming\s+events?|live\s+events?|what\s+events?|any\s+events?|events?\s+available|list\s+(of\s+)?events?)\b/i.test(
      t,
    )
  ) {
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

  return false;
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
    if (out.length >= 8) break;
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

function scoreEvent(query: string, event: LiveEvent): number {
  const q = normalize(query);
  const title = normalize(event.title);
  const city = normalize(event.location_city);
  const qTokens = tokens(query);
  const titleTokens = tokens(event.title);

  if (!q) return 0;

  // Exact / contains title
  if (q.includes(title) || title.includes(q)) return 100;

  // Alias boosts
  let score = 0;
  if (/\b(christmas|xmas|festive)\b/.test(q) && /\bchristmas\b/.test(title)) {
    score += 80;
  }
  if (/\b(diwali|deepavali)\b/.test(q) && /\bdiwali\b/.test(title)) {
    score += 80;
  }
  if (
    /\b(new\s*year|nye|hogmanay)\b/.test(q) &&
    /\bnew\s*year\b/.test(title)
  ) {
    score += 80;
  }
  if (/\bhalloween\b/.test(q) && /\bhalloween\b/.test(title)) {
    score += 80;
  }

  // Token overlap on title
  for (const qt of qTokens) {
    if (titleTokens.some((tt) => tt === qt || tt.includes(qt) || qt.includes(tt))) {
      score += 18;
    }
    if (city === qt || city.includes(qt) || qt.includes(city)) {
      score += 8;
    }
  }

  return score;
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

/** True when the message is a location tap / “Book in {city}”, not a later booking step. */
export function isLiveEventLocationChoiceText(
  text: string,
  events: LiveEvent[],
): boolean {
  const city = extractMentionedCity(text, events);
  if (!city) return false;
  const n = normalize(text);
  if (n === city) return true;
  if (n.startsWith("book in ") && n.includes(city)) return true;
  if (/\bbook\b/.test(n) && n.includes(" in ") && n.includes(city)) return true;
  return false;
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
export function matchLiveEvents(
  userText: string,
  liveEvents: LiveEvent[] | null | undefined,
): LiveEventChatMatch[] {
  if (!liveEvents?.length) return [];
  const query = normalizeChatBookingQuery(userText);

  const scored = liveEvents
    .map((event) => ({
      event,
      href: buildLiveEventHref(event),
      score: scoreEvent(query, event),
    }))
    .filter((m) => m.score >= 18)
    .sort((a, b) => b.score - a.score);

  // Listing intent with no specific name → return all
  if (
    scored.length === 0 &&
    (/\b(what('?s|\s+is)\s+on|upcoming\s+events?|live\s+events?|what\s+events?|any\s+events?|events?\s+available|list\s+(of\s+)?events?)\b/i.test(
      query,
    ) ||
      /\b(book|booking|reserve)\b/i.test(query))
  ) {
    return liveEvents.map((event) => ({
      event,
      href: buildLiveEventHref(event),
      score: 1,
    }));
  }

  if (scored.length === 0) return [];

  const top = scored[0].score;
  // Keep close ties (same event across locations, or similar confidence)
  return scored.filter((m) => m.score >= Math.max(18, top - 25));
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
  if (
    matches.every((m) => m.score <= 1) ||
    /\b(what('?s|\s+is)\s+on|upcoming\s+events?|live\s+events?|what\s+events?|list\s+(of\s+)?events?)\b/i.test(
      userText,
    )
  ) {
    return true;
  }

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

function chatChoiceMarkdown(label: string, sendText: string): string {
  return `[${label}](chat:${sendText})`;
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

  // Listing all events
  if (
    matches.every((m) => m.score <= 1) ||
    /\b(what('?s|\s+is)\s+on|upcoming\s+events?|live\s+events?|what\s+events?|list\s+(of\s+)?events?)\b/i.test(
      userText,
    )
  ) {
    const lines = matches.map((m) => {
      const city = titleCaseCity(m.event.location_city);
      return `- **${m.event.title}** in **${city}** — ${chatChoiceMarkdown(`Book now`, `Book ${m.event.title} in ${city}`)}`;
    });
    return {
      content: `Here’s what’s currently available to book at **${brand}**${nameBit}:\n\n${lines.join("\n")}\n\nWhich would you like? I’ll book it here in chat.`,
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
      content: `Yes${nameBit} — **${displayTitle}** is available in **${city}**. I’ll help you book it here.\n\nHow many guests are you booking for? ${chatChoiceMarkdown("10 guests", "10 guests")} ${chatChoiceMarkdown("20 guests", "20 guests")} ${chatChoiceMarkdown("40 guests", "40 guests")} ${chatChoiceMarkdown("I’ll type a number", "I'll type the guest number")}`,
    };
  }

  // Multiple locations — stay in chat; never navigate to /{slug}/events/…
  const linkLines = primaryGroup.map((m) => {
    const city = titleCaseCity(m.event.location_city);
    return chatChoiceMarkdown(`Book in ${city}`, `Book in ${city}`);
  });
  return {
    content: `**${displayTitle}** is currently available in **${cities.join(" and ")}**.\n\n${linkLines.join(" · ")}\n\nWhich location would you like? I’ll then check dates, rooms, tables and drinks with you.`,
  };
}

/** Guest asked for an event that is not on any published location. */
export function buildLiveEventsNoMatchReply(options: {
  allLiveEvents: LiveEvent[];
  siteName?: string | null;
  userName?: string | null;
}): { content: string } {
  const { allLiveEvents, siteName, userName } = options;
  const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
  const brand = siteName?.trim() || "our venue";
  if (!allLiveEvents.length) {
    return {
      content: `I don’t have any events listed to book on **${brand}** right now${nameBit}. Please choose a location from the directory, or tell me which city you have in mind.`,
    };
  }
  const lines = allLiveEvents.slice(0, 8).map((event) => {
    const city = titleCaseCity(event.location_city);
    return `- **${event.title}** in **${city}** — ${chatChoiceMarkdown(`Book now`, `Book ${event.title} in ${city}`)}`;
  });
  return {
    content: `I couldn’t find that event among our current locations${nameBit}. Here’s what’s available to book at **${brand}**:\n\n${lines.join("\n")}\n\nWhich would you like?`,
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
    return `- ${event.title} (${city})`;
  });
  return `
LIVE EVENTS (names + cities only — current booking is EVENT BOOKING DATA):
${lines.join("\n")}
If they ask about a different event, use this list. Do not dump this list unless they ask.
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

  const lines = liveEvents.map((e) => {
    const city = e.location_city?.trim() || e.location_slug;
    return `- ${e.title} | ${city} | in-chat: [Book in ${city}](chat:Book in ${city})`;
  });

  return `
LIVE EVENTS (authoritative — only these cities exist on this site):
When the guest asks about an event by name (e.g. Christmas, Diwali, New Year):
1. Answer from this list only — never invent events, cities, or URLs.
2. Say which location(s) have it. Location buttons stay in chat: [Book in City](chat:Book in City)
3. NEVER write /chat: or /chat — the prefix is chat: with no slash. Dates: [Thu 27 Aug](chat:Thu 27 Aug 2026)
4. NEVER send [Book in City](/location-slug/events/event-slug) — that leaves chat.
5. If EVENT BOOKING DATA is loaded, stay in chat: one question at a time (dates labelled with room → guests → tables/tickets → which table types and quantities → which ticket types and quantities → drinks, then another date/room if they want → summary/coupon → pay in chat). Do not send them to the event page, cart, or Checkout.
6. If they ask for a city that is not listed for that event, say it is not available there and offer the cities that are.
7. Dates must show the room name. Guests can pick more than one drink and more than one room/date. Quote prices. Coupon last — after they apply a code, repeat it on the summary with the discount. Visit the event page only if chat cannot continue. Never invent table counts. Never show stock unless they ask for more than is available.

${lines.join("\n")}
`;
}
