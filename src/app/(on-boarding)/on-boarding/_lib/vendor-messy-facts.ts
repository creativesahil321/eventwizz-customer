export interface VendorMenuCourse {
  name: string;
  items: Array<{ title: string; description: string }>;
}

export interface VendorDrinkPackageFact {
  title: string;
  price: number;
}

export interface MessyVendorExtras {
  pricesByDate: Record<string, number>;
  genericPricePerPerson?: number;
  firstDatePrice?: number;
  secondDatePrice?: number;
  depositDueDaysBefore?: number;
  depositPercentHint?: number;
  menuIncludedInPrice: boolean;
  drinkPackages: VendorDrinkPackageFact[];
  drinkRoomKeys: string[];
  drinkRoomLimit?: number;
  noDrinkRoomKeys: string[];
  menuCourses: VendorMenuCourse[];
  mentionsTickets: boolean;
  mentionsTables: boolean;
  tablesOnly: boolean;
  omitDiscounts: boolean;
  contradictions: string[];
}

const CURRENCY_TOKEN =
  "(?:£|\\$|€|(?:gbp|usd|eur|pounds?|pound|quid|euros?|euro|dollars?|dollar)\\b)";

const PP_TOKEN = "(?:pp|per head|per person|a head|/person|/head|each)";

export function normalizeRoomKey(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function correctVendorSpelling(value: string): string {
  return String(value ?? "")
    .replace(/\bpabeer\b/gi, "paneer")
    .replace(/\bbeeer\b/gi, "beer")
    .replace(/\bgulab\s*jamun\b/gi, "gulab jamun")
    .replace(/\bgulabjamun\b/gi, "gulab jamun")
    .replace(/\boj\b/gi, "orange juice")
    .replace(/\s+/g, " ")
    .trim();
}

export function roomMatchesDrinkTargets(
  roomName: string,
  drinkRoomKeys: string[] | undefined,
): boolean {
  const keys = (drinkRoomKeys ?? []).map(normalizeRoomKey).filter(Boolean);
  if (keys.length === 0) return true;
  const roomKey = normalizeRoomKey(roomName);
  if (!roomKey) return false;
  return keys.some(
    (key) => roomKey === key || roomKey.includes(key) || key.includes(roomKey),
  );
}

export function isTablesOnlyIntent(text: string | undefined): boolean {
  const lower = String(text ?? "").toLowerCase();
  return /\b(tables? only|table[- ]only|just tables?|only tables?|no tickets?|without tickets?|tickets? not needed|don'?t (want|need|add) tickets?|table booking only|people book tables|table[- ]based|customers (should|need to) (book|reserve) tables)\b/i.test(
    lower,
  );
}

export function isGlobalOmitDrinks(text: string): boolean {
  const lower = text.toLowerCase();
  if (
    /\b(hall|ballroom|terrace|room)\s+(no drinks?|nothing|no booze)\b/.test(lower) ||
    /\bno (drinks?|booze)\s+in\s+(the\s+)?(hall|ballroom|terrace|room)/.test(lower) ||
    /\bdrinks?\s+(only|extra|optional|add)\b/.test(lower) ||
    /\bhall nothing\b/.test(lower)
  ) {
    return false;
  }
  return /\b(no (drinks?|drink packages?|bar packages?|other packages)|without (drinks?|bar packages?)|don'?t (want|add|include|need) .{0,40}(drinks?|bar packages?|other packages)|do not (want|add|include|need) .{0,40}(drinks?|bar packages?)|skip (the )?(drinks?|other packages)|not to add .{0,30}(drinks?|other packages))\b/i.test(
    lower,
  );
}

function normalizeVendorText(raw: string): string {
  return correctVendorSpelling(
    raw
      .replace(/(\d)\s*\+\s*(\d)/g, "$1 and $2")
      .replace(
        /\b(vodka|beer|gin|wine|whisky|whiskey|rum|oj|juice|pint)(\d{1,4})\b/gi,
        "$1 $2",
      ),
  );
}

function setDayPrice(
  byDay: Map<number, number>,
  day: number,
  price: number,
) {
  if (day < 1 || day > 31 || price < 1 || price > 9999) return;
  byDay.set(day, Math.round(price));
}

function extractDayLinkedPrices(text: string): Array<{ day: number; price: number }> {
  const byDay = new Map<number, number>();
  const priceFor = new RegExp(
    `(?:price|cost)\\s+(?:for|on|of)\\s+(\\d{1,2})(?:st|nd|rd|th)?[^\\d%]{0,40}${CURRENCY_TOKEN}\\s*(\\d+(?:\\.\\d+)?)`,
    "gi",
  );
  const ordinalCurrency = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)\\s+(?:is\\s+|are\\s+)?${CURRENCY_TOKEN}\\s*(\\d+(?:\\.\\d+)?)`,
    "gi",
  );
  const priceOnDay = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_TOKEN}\\s*)?${PP_TOKEN}?\\s+on\\s+(\\d{1,2})(?:st|nd|rd|th)?`,
    "gi",
  );
  const dayThenPp = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*[=:]?\\s*(\\d+(?:\\.\\d+)?)\\s*${PP_TOKEN}`,
    "gi",
  );
  const dayEquals = /\b(\d{1,2})\s*=\s*(\d+(?:\.\d+)?)\b/g;
  const actually = new RegExp(
    `(?:actually|wait|sorry|change).{0,40}?(\\d{1,2})(?:st|nd|rd|th)?.{0,24}?(\\d+(?:\\.\\d+)?)`,
    "gi",
  );

  for (const match of text.matchAll(priceFor)) {
    setDayPrice(byDay, Number(match[1]), Number(match[2]));
  }
  for (const match of text.matchAll(ordinalCurrency)) {
    setDayPrice(byDay, Number(match[1]), Number(match[2]));
  }
  for (const match of text.matchAll(priceOnDay)) {
    setDayPrice(byDay, Number(match[2]), Number(match[1]));
  }
  for (const match of text.matchAll(dayThenPp)) {
    setDayPrice(byDay, Number(match[1]), Number(match[2]));
  }
  for (const match of text.matchAll(dayEquals)) {
    setDayPrice(byDay, Number(match[1]), Number(match[2]));
  }
  const ppChristmas = text.matchAll(
    /(\d+(?:\.\d+)?)\s*pp\s+christmas(?:\s+day)?/gi,
  );
  for (const match of ppChristmas) {
    setDayPrice(byDay, 25, Number(match[1]));
  }
  const ppThenDay = text.matchAll(
    /(\d+(?:\.\d+)?)\s*pp\s+(\d{1,2})(?:st|nd|rd|th)/gi,
  );
  for (const match of ppThenDay) {
    setDayPrice(byDay, Number(match[2]), Number(match[1]));
  }
  for (const match of text.matchAll(actually)) {
    setDayPrice(byDay, Number(match[1]), Number(match[2]));
  }

  return [...byDay.entries()].map(([day, price]) => ({ day, price }));
}

export function mapDayPricesToEventDates(
  eventDates: string[],
  dayPrices: Array<{ day: number; price: number }>,
): Record<string, number> {
  const pricesByDate: Record<string, number> = {};
  const assigned = new Set<string>();

  for (const row of dayPrices) {
    const match = eventDates.find((iso) => {
      if (assigned.has(iso)) return false;
      return Number(iso.slice(8, 10)) === row.day;
    });
    if (match) {
      pricesByDate[match] = row.price;
      assigned.add(match);
    }
  }

  const leftover = dayPrices.filter(
    (row) => !eventDates.some((iso) => Number(iso.slice(8, 10)) === row.day),
  );
  const unassigned = eventDates.filter((iso) => !assigned.has(iso));
  leftover.forEach((row, index) => {
    const iso = unassigned[index];
    if (!iso) return;
    pricesByDate[iso] = row.price;
    assigned.add(iso);
  });

  return pricesByDate;
}

function splitRoomPhrase(raw: string): string[] {
  return raw
    .split(/\s*(?:,|&|\/|\+|and)\s*/i)
    .map((part) => correctVendorSpelling(part.replace(/\binclusions?\b/gi, "")))
    .map((part) => part.replace(/[^a-z0-9\s-]/gi, " ").trim())
    .filter(
      (part) =>
        part.length >= 3 &&
        !/^(rooms?|add|on|in|for|the|only|extra|get|have|yes)$/i.test(part),
    );
}

function extractDrinkRoomClause(
  text: string,
  roomNames?: string[],
): {
  limit?: number;
  names: string[];
  noDrinkNames: string[];
} {
  const noDrinkNames: string[] = [];
  const noDrinkRe =
    /\b(hall|ballroom|terrace|open terrace|room \d+)\s+(?:has\s+)?(?:no drinks?|nothing|no booze)|(?:no drinks?|no booze)\s+in\s+(?:the\s+)?(hall|ballroom|terrace|open terrace)/gi;
  for (const match of text.matchAll(noDrinkRe)) {
    const name = match[1] || match[2];
    if (name) noDrinkNames.push(name);
  }
  if (/\bhall nothing\b/i.test(text)) noDrinkNames.push("hall");

  const only = text.match(
    /drinks?\s+(?:extra\s+)?(?:only|in|for)\s+(?!each\b)(?!\d+\s+rooms?)(.+?)(?=vodka|beer|oj|orange|inclusions?|hall no|hall nothing|deposit|menu|no codes?|,|$)/i,
  );
  let names = only ? splitRoomPhrase(only[1]) : [];

  const twoRooms = text.match(
    /drinks?\b.{0,120}?(?:add(?:ed)?(?:\s+\w+){0,4}\s+on|\bon\b|\bin\b|\bfor\b)\s+(\d+)\s+rooms?\s+(.+?)(?=inclusions?|\bmenu\b|\bdiscount\b|\bdeposit\b|$)/i,
  );
  let limit: number | undefined;
  if (twoRooms) {
    limit = Number(twoRooms[1]);
    if (!Number.isFinite(limit) || limit < 1 || limit > 3) limit = undefined;
    if (names.length === 0) names = splitRoomPhrase(twoRooms[2]);
  }

  if (names.length === 0 && noDrinkNames.length > 0 && roomNames?.length) {
    names = roomNames.filter(
      (room) =>
        !noDrinkNames.some((blocked) =>
          roomMatchesDrinkTargets(room, [normalizeRoomKey(blocked)]),
        ),
    );
  }

  return { limit, names, noDrinkNames };
}

function resolveDrinkRoomKeys(
  extractedNames: string[],
  noDrinkNames: string[],
  roomNames: string[] | undefined,
): string[] {
  const blocked = noDrinkNames.map(normalizeRoomKey).filter(Boolean);
  const fromText = extractedNames
    .map(normalizeRoomKey)
    .filter((key) => key && !blocked.includes(key) && !blocked.some((b) => key.includes(b) || b.includes(key)));
  if (!roomNames?.length) return fromText;
  const matched = roomNames
    .filter((name) => {
      if (blocked.some((key) => roomMatchesDrinkTargets(name, [key]))) {
        return false;
      }
      return fromText.length === 0
        ? blocked.length > 0
        : roomMatchesDrinkTargets(name, fromText);
    })
    .map(normalizeRoomKey);
  return matched.length > 0 ? matched : fromText;
}

const KNOWN_DRINK_RE =
  /\b(vodka|gin|rum|whisky|whiskey|prosecco|champagne|wine|beer(?:\s+pint)?|orange juice|oj|coke|pepsi|lemonade)\s+(?:£|\$|€)?(\d{1,4})\b/gi;

function extractDrinkPackages(text: string): VendorDrinkPackageFact[] {
  const packages: VendorDrinkPackageFact[] = [];
  const seen = new Set<string>();
  const push = (rawTitle: string, rawPrice: string) => {
    const title = correctVendorSpelling(rawTitle);
    const price = Number(rawPrice);
    if (!title || !Number.isFinite(price) || price < 1 || price > 9999) return;
    const key = `${title.toLowerCase()}:${Math.round(price)}`;
    if (seen.has(key)) return;
    seen.add(key);
    packages.push({ title, price: Math.round(price) });
  };

  for (const match of text.matchAll(KNOWN_DRINK_RE)) {
    push(match[1], match[2]);
  }
  if (packages.length > 0) return packages;

  const inclusion = text.match(
    /inclusions?\s+(.+?)(?:\bmenu\b|\bdiscount\b|\bdeposit\b|$)/i,
  );
  const drinkWindow = text.match(
    /drinks?\b(.{0,240}?)(?=\bdeposit\b|\bdep\b|\bmenu\b|\bno codes?\b|\bno discount|\bno promo|$)/i,
  );
  const chunk = (inclusion?.[1] || drinkWindow?.[1] || "").trim();
  if (!chunk) return [];

  const pairRe =
    /([a-z][a-z0-9][a-z0-9\s]{0,28}?)\s+(?:£|\$|€)?(\d{1,4})(?=\s*(?:,|&|and|\/|$))/gi;
  for (const match of chunk.matchAll(pairRe)) {
    if (
      /inclusions?|rooms?|dates?|price|pound|deposit|days?|only|ballroom|terrace|hall|open|openterrace/i.test(
        match[1],
      )
    ) {
      continue;
    }
    push(match[1], match[2]);
  }
  return packages;
}

function toCourse(
  name: string,
  raw: string | undefined,
): VendorMenuCourse | null {
  const items = String(raw ?? "")
    .split(/\s*(?:,|&)\s*/)
    .map((part) => correctVendorSpelling(part))
    .filter(
      (part) =>
        part.length > 1 &&
        !/^(starters?|mains?|main course|desserts?|sweets?|menu|options?|included|then)$/i.test(
          part,
        ),
    )
    .map((title) => ({ title, description: title }));
  if (items.length === 0) return null;
  return { name, items };
}

function extractMenuCourses(text: string): VendorMenuCourse[] {
  const stop = String.raw`(?=\s*(?:discount|deposit|dep\b|drinks?|no codes?|no discount|\.|$))`;
  const combo = text.match(
    new RegExp(
      String.raw`\bstarters?\s+(.+?)\s*,\s*main(?:s|\s+course)?\s+(.+?)\s*,\s*(?:desserts?|sweets?)\s+(.+?)${stop}`,
      "i",
    ),
  );
  const inline = text.match(
    new RegExp(
      String.raw`starter(?:s)?(?:\s+is)?\s+(.+?)\s+main(?:s|\s+course)?(?:\s+is)?\s+(.+?)\s+(?:dessert|sweet)(?:s)?(?:\s+is)?\s+(.+?)${stop}`,
      "i",
    ),
  );
  const thened = text.match(
    /(?:food|menu)\s+included\s+(.+?)\s+then\s+(.+?)\s+then\s+(.+?)(?=\s*(?:discount|deposit|drinks?|$))/i,
  );
  const source = combo || inline || thened;
  if (!source) return [];
  return [
    toCourse("Starters", source[1]),
    toCourse("Mains", source[2]),
    toCourse("Desserts", source[3]),
  ].filter((course): course is VendorMenuCourse => Boolean(course));
}

export function extractMessyVendorExtras(
  description: string,
  eventDates: string[],
  roomNames?: string[],
): MessyVendorExtras {
  const text = normalizeVendorText(description);
  const lower = text.toLowerCase();
  const dayPrices = extractDayLinkedPrices(text);
  const pricesByDate = mapDayPricesToEventDates(eventDates, dayPrices);
  const drinkRooms = extractDrinkRoomClause(text, roomNames);
  const drinkRoomKeys = resolveDrinkRoomKeys(
    drinkRooms.names,
    drinkRooms.noDrinkNames,
    roomNames,
  );
  const noDrinkRoomKeys = drinkRooms.noDrinkNames.map(normalizeRoomKey);

  const dueMatch =
    lower.match(/\b(\d{1,3})\s*days?\s+before\b/) ||
    (/\bmonth before\b/.test(lower) ? (["", "30"] as const) : null);
  const dueDays = dueMatch ? Number(dueMatch[1]) : undefined;

  let depositPercentHint: number | undefined;
  if (/\b(a fifth|one fifth|1\/5)\b/.test(lower)) depositPercentHint = 20;
  const percentUpfront = lower.match(
    /\b(\d{1,2})\s*(?:%|percent|per\s*cent)\s*(?:deposit|upfront|down|initially)/,
  );
  const depShort = lower.match(/\bdep(?:osit)?\s*(\d{1,2})\s*%/);
  if (percentUpfront) depositPercentHint = Number(percentUpfront[1]);
  if (depShort) depositPercentHint = Number(depShort[1]);

  const firstDatePriceMatch = lower.match(
    /\bfirst(?:\s+date|\s+day|\s+night)?[^0-9%]{0,24}(\d+(?:\.\d+)?)/,
  );
  const secondDatePriceMatch = lower.match(
    /\bsecond(?:\s+date|\s+day|\s+night)?[^0-9%]{0,24}(\d+(?:\.\d+)?)/,
  );
  const firstDatePrice = firstDatePriceMatch
    ? Number(firstDatePriceMatch[1])
    : undefined;
  const secondDatePrice = secondDatePriceMatch
    ? Number(secondDatePriceMatch[1])
    : undefined;
  if (firstDatePrice && eventDates[0] && pricesByDate[eventDates[0]] == null) {
    pricesByDate[eventDates[0]] = Math.round(firstDatePrice);
  }
  if (secondDatePrice && eventDates[1] && pricesByDate[eventDates[1]] == null) {
    pricesByDate[eventDates[1]] = Math.round(secondDatePrice);
  }

  const uniquePrices = Array.from(new Set(Object.values(pricesByDate)));
  const genericPpMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*(?:pp|per head|per person|a head)(?!\s*%)/,
  );
  const genericPricePerPerson =
    uniquePrices.length === 1
      ? uniquePrices[0]
      : dayPrices.length === 1
        ? dayPrices[0].price
        : genericPpMatch && uniquePrices.length === 0
          ? Math.round(Number(genericPpMatch[1]))
          : undefined;

  const tablesOnly = isTablesOnlyIntent(text);
  const mentionsTickets =
    /\btickets?\b/i.test(text) &&
    !tablesOnly &&
    !/\bno tickets?\b/i.test(text) &&
    !/\btickets? not needed\b/i.test(text);
  const mentionsTables = /\btables?\b/i.test(text) || tablesOnly;
  const omitDiscounts =
    /\b(no discount|no promo|no coupon|no codes?|don'?t add discount|do not add discount|nothing discounted|discounts? disabled)\b/i.test(
      text,
    );

  const contradictions: string[] = [];
  const onlyHall =
    drinkRoomKeys.length === 1 && drinkRoomKeys[0] === "hall";
  const hallBlocked = noDrinkRoomKeys.includes("hall");
  if (
    (onlyHall && hallBlocked) ||
    (/drinks? only in hall/i.test(text) && /hall has no drinks/i.test(text))
  ) {
    contradictions.push(
      "Drinks only in Hall conflicts with Hall has no drinks",
    );
  }
  if (tablesOnly && /\btickets?\s+and\s+tables?\b/i.test(text)) {
    contradictions.push("Tables only conflicts with tickets and tables");
  }
  if (omitDiscounts && /\b(add|create)\s+(a\s+)?(discount|promo|coupon)/i.test(text)) {
    contradictions.push("No discount conflicts with add a discount code");
  }

  return {
    pricesByDate,
    genericPricePerPerson,
    firstDatePrice:
      firstDatePrice && firstDatePrice >= 1 && firstDatePrice <= 9999
        ? Math.round(firstDatePrice)
        : undefined,
    secondDatePrice:
      secondDatePrice && secondDatePrice >= 1 && secondDatePrice <= 9999
        ? Math.round(secondDatePrice)
        : undefined,
    depositDueDaysBefore:
      dueDays && dueDays >= 1 && dueDays <= 365 ? dueDays : undefined,
    depositPercentHint:
      depositPercentHint && depositPercentHint >= 1
        ? Math.min(80, Math.max(20, Math.round(depositPercentHint)))
        : undefined,
    menuIncludedInPrice:
      /\b(menu|food|catering).{0,60}\binclud|\binclud.{0,60}(package|event price|price of the event|50\/90|table price)\b/i.test(
        text,
      ) || /\bfood included\b/i.test(text),
    drinkPackages: extractDrinkPackages(text),
    drinkRoomKeys,
    drinkRoomLimit: drinkRooms.limit,
    noDrinkRoomKeys,
    menuCourses: extractMenuCourses(text),
    mentionsTickets,
    mentionsTables,
    tablesOnly,
    omitDiscounts,
    contradictions,
  };
}

export function buildMessyVendorEnglishRules(): string {
  return `MESSY VENDOR ENGLISH — UK venue managers type like WhatsApp. Always interpret. Never wait for perfect grammar.

PIPELINE: understand intent → extract facts → normalise slang → dates → rooms → room-specific rules → booking type → pricing → menu → drinks → deposit/payment → discounts → contradictions → EventWizz rules → structured draft. Last instruction wins when they correct themselves ("actually", "wait", "sorry").

UK VENDOR LANGUAGE:
- per head / pp / each / a head = per person
- quid / pound / gbp / £ = GBP
- table booking / tables only / just tables / no tickets = booking_type tables
- xmas / chrismas / festive = Christmas
- christmas day = 25 December
- 25/12 = 25 December (UK day/month, never US month/day)
- first date / second date = first and second listed event dates
- drinks extra / optional = add-on packages, not included in table price
- food included / menu included = no separate catering fee
- upfront / down payment / a fifth = deposit
- month before = 30 days before each event_date
- terrace = Open Terrace when that room exists
- sweet = dessert; main = main course; oj = orange juice
- dep / 20% dep = deposit percentage
- no codes / no promo / no coupon / no discount = do NOT create a promo code
- 50pp christmas day 90pp 27th = £50 on 25 Dec, £90 on 27 Dec
- Dates with a month are event dates. A bare ordinal next to a price ("26th Pound 90") is a PRICE LABEL, not a new night — map leftover prices onto leftover listed dates in order. Never invent 26 Dec if they only listed 25th and 27th Dec.

NEVER invent a price, date, room, menu item, drink price, deposit %, or discount. Do not apply a room exception to every room. Do not treat a deposit % as a table price. Do not publish — return a draft JSON only.
If they gave enough facts, extract them all and do not ask filler questions. If two instructions contradict, keep both in mind and prefer the later correction; do not silently pick one.`;
}
