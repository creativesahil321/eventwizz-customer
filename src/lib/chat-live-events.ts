import type { LiveEvent } from "@/types/theme.types";

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

/** Customer wants to find / book a live event on the public venue site. */
export function isLiveEventBookingIntent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

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
  const cities = [
    ...new Set(events.map((e) => normalize(e.location_city)).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);

  for (const city of cities) {
    if (city && q.includes(city)) return city;
  }
  return null;
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

  const scored = liveEvents
    .map((event) => ({
      event,
      href: buildLiveEventHref(event),
      score: scoreEvent(userText, event),
    }))
    .filter((m) => m.score >= 18)
    .sort((a, b) => b.score - a.score);

  // Listing intent with no specific name → return all
  if (
    scored.length === 0 &&
    /\b(what('?s|\s+is)\s+on|upcoming\s+events?|live\s+events?|what\s+events?|any\s+events?|events?\s+available|list\s+(of\s+)?events?)\b/i.test(
      userText,
    )
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

function titleCaseCity(city: string): string {
  if (!city) return city;
  return city
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
      return `- **${m.event.title}** in **${city}** — [Book now](${m.href})`;
    });
    return {
      content: `Here’s what’s currently available to book at **${brand}**${nameBit}:\n\n${lines.join("\n")}\n\nTap a link to open the event and choose your date.`,
      supportCta: {
        href: primary.href,
        label: `Book ${primary.event.title}`,
      },
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
      return `[Book ${displayTitle} in ${city}](${m.href})`;
    });
    return {
      content: `**${displayTitle}** is currently available in **${available}**, but not in **${asked}**.\n\n${linkLines.join(" · ")}\n\nWould you like help with anything else?`,
      supportCta: {
        href: primary.href,
        label: `Book ${displayTitle}`,
      },
    };
  }

  // One location
  if (primaryGroup.length === 1) {
    const city = titleCaseCity(primary.event.location_city);
    return {
      content: `Yes${nameBit} — **${displayTitle}** is currently available in **${city}**.\n\n[Click here to book ${displayTitle}](${primary.href})\n\nYou’ll be taken to the event page to choose your date and places.`,
      supportCta: {
        href: primary.href,
        label: `Book ${displayTitle}`,
      },
    };
  }

  // Multiple locations
  const linkLines = primaryGroup.map((m) => {
    const city = titleCaseCity(m.event.location_city);
    return `[Book in ${city}](${m.href})`;
  });
  return {
    content: `**${displayTitle}** is currently available in **${cities.join(" and ")}**.\n\n${linkLines.join(" · ")}\n\nChoose the location that suits you and complete your booking there.`,
    supportCta: {
      href: primary.href,
      label: `Book ${displayTitle}`,
    },
  };
}

/** Compact block for the AI prompt when a direct reply isn’t used. */
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
    const href = buildLiveEventHref(e);
    return `- ${e.title} | ${e.location_city} | markdown: [Book ${e.title}](${href})`;
  });

  return `
LIVE EVENTS (authoritative — use these for booking redirects):
When the guest asks about an event by name (e.g. Christmas, Diwali, New Year):
1. Answer from this list only — never invent events or URLs.
2. Say which location(s) have it.
3. Always include the markdown booking link(s) below.
4. If they ask for a city that is not listed for that event, say it is not available there and offer the cities that are.

${lines.join("\n")}
`;
}
