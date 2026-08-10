import type {
  AIDate,
  AIRoomDates,
  AIRoomDrinks,
} from "@/app/api/ai/generate-onboarding/route";
import type { AIEventInput } from "@/app/api/ai/generate-event/route";
import {
  ensureStepFiveRooms,
  ensureStepSevenRooms,
  normalizeAiRoomNames,
  parseVendorDescriptionHints,
  sanitizeVendorDescription,
  type VendorDescriptionHints,
} from "@/app/(on-boarding)/on-boarding/_lib/ai-onboarding-sanitize";

export const AI_EVENT_VENDOR_DESCRIPTION_MAX = 2000;
export const AI_EVENT_MIN_ROOMS = 2;
export const AI_EVENT_MAX_ROOMS = 3;

/** Parsed vendor intent for AI event generation (extends onboarding hints). */
export interface AiEventVendorIntent extends VendorDescriptionHints {
  wantsPerRoomDates: boolean;
  wantsPerRoomMenus: boolean;
  wantsPerRoomPackages: boolean;
  wantsPerRoomDrinks: boolean;
  wantsPerRoomBrochure: boolean;
  wantsBothTicketsAndTables: boolean;
  requestedMinFaqs: number;
  mentionsItalianMenu: boolean;
  mentionsWhiskyOrSpirits: boolean;
  mentionsSoftDrinksOnly: boolean;
  detectedIntents: string[];
}

export interface AIEventRoomPackage {
  room_name: string;
  package_title?: string;
  package_description?: string;
  package_details?: Array<{ title: string }>;
  event_schedular?: Array<{ title: string; time: string }>;
}

export interface AIEventRoomMenu {
  room_name: string;
  catering_option?: number;
  menu_title?: string;
  menu_description?: string;
  menus?: Array<{
    name: string;
    items: Array<{ title: string; description: string }>;
  }>;
}

export interface AIEventRoomBrochure {
  room_name: string;
  location_description?: string;
  price_start_from?: string;
}

const INTENT_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: "ROOM_CREATION", pattern: /\b(create|add|set up)\s+\d+\s+rooms?\b/i },
  { id: "ROOM_UPDATE", pattern: /\b(room\s+\d+|rename room|vip seating|adults only|standing only)\b/i },
  { id: "DATE_MANAGEMENT", pattern: /\b(\d{1,2}\s+\w+\s+\d{4}|august|september|weekend|every friday|date range|same dates?)\b/i },
  { id: "CATERING_SETUP", pattern: /\b(starter|main course|dessert|vegan|breakfast|lunch|italian food|menu choice)\b/i },
  { id: "DRINK_CONFIGURATION", pattern: /\b(soft drink|beverage|whisky|whiskey|cocktail|alcohol|non[- ]?alcohol)\b/i },
  { id: "PRICING_SETUP", pattern: /\b(£|\$|eur|price|cost|catering cost|food cost|usd|gbp)\b/i },
  { id: "TICKET_SETUP", pattern: /\b(ticket|vip ticket|early bird|general admission|capacity|free entry)\b/i },
  { id: "TABLE_SETUP", pattern: /\b(table|seating|seats per table|reserved seating)\b/i },
  { id: "TIMELINE_SETUP", pattern: /\b(starts?\s+\d|doors open|ends?\s+|schedule|timeline|break at)\b/i },
  { id: "BROCHURE_SETUP", pattern: /\b(brochure|pdf|download)\b/i },
  { id: "MARKETING_SETUP", pattern: /\b(poster|social media|whatsapp|promotion)\b/i },
  { id: "COPY_CONFIGURATION", pattern: /\b(copy|clone|duplicate|same as room|apply same|room \d+ same as)\b/i },
  { id: "BULK_UPDATE", pattern: /\b(all rooms?|every room|apply to all|same for all)\b/i },
  { id: "DEPOSIT_MANAGEMENT", pattern: /\b(deposit|percentage\s*%|pay later|partial payment)\b/i },
  { id: "VIP_CONFIGURATION", pattern: /\b(vip|exclusive package)\b/i },
  { id: "ATTENDEE_RESTRICTIONS", pattern: /\b(adults only|family friendly|invite[- ]?only|members only)\b/i },
];

export function parseAiEventVendorIntent(
  description: string | undefined,
  roomNames: string[] | undefined,
): AiEventVendorIntent {
  const base = parseVendorDescriptionHints(description, roomNames);
  const sanitizedDescription = sanitizeVendorDescription(
    description,
    AI_EVENT_VENDOR_DESCRIPTION_MAX,
  );
  const lower = sanitizedDescription.toLowerCase();

  const wantsPerRoomDates =
    /\b(room\s+[a-z0-9]+.{0,40}(dates?|aug|sep|jan|feb|mar|apr|may|jun|jul|oct|nov|dec)|different dates? per room|each room.{0,30}dates?)\b/i.test(
      lower,
    ) ||
    (normalizeAiRoomNames(roomNames).length >= 2 &&
      /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(
        lower,
      ) &&
      !base.wantsSameDatesAllRooms);

  const wantsPerRoomMenus =
    /\b(different menu|menu choices? per room|italian food.{0,40}room|room.{0,40}(menu|food))\b/i.test(
      lower,
    ) || /\bboth room.{0,30}different menu\b/i.test(lower);

  const wantsPerRoomPackages =
    /\b(different packages? per room|packages? in both rooms?|exclusive packages?|drink packages?)\b/i.test(
      lower,
    );

  const wantsPerRoomDrinks =
    base.wantsRoomSpecificDrinks ||
    /\b(room.{0,40}(soft drink|whisky|beverage)|drinks? in (the )?[\w\s]+ room)\b/i.test(
      lower,
    );

  const wantsPerRoomBrochure =
    /\b(brochure.{0,30}(both|each|per) room|brochure info for both)\b/i.test(
      lower,
    );

  const wantsBothTicketsAndTables =
    /\b(tickets?\s+and\s+tables?|table system and tickets?|both tickets and tables)\b/i.test(
      lower,
    ) &&
    !base.prefersTicketsOnly &&
    !base.prefersTablesBooking;

  const faqMatch = lower.match(
    /\b(at least|minimum|min\.?)\s*(\d{1,2})\s*(faq|faqs|frequently asked)\b/i,
  );
  const requestedMinFaqs = faqMatch
    ? Math.min(10, Math.max(5, parseInt(faqMatch[2], 10)))
    : 8;

  const detectedIntents = INTENT_PATTERNS.filter(({ pattern }) =>
    pattern.test(lower),
  ).map(({ id }) => id);

  return {
    ...base,
    sanitizedDescription,
    wantsPerRoomDates,
    wantsPerRoomMenus,
    wantsPerRoomPackages,
    wantsPerRoomDrinks,
    wantsPerRoomBrochure,
    wantsBothTicketsAndTables,
    requestedMinFaqs,
    mentionsItalianMenu: /\bitalian\b/i.test(lower),
    mentionsWhiskyOrSpirits: /\b(whisky|whiskey|spirit|beverage package)\b/i.test(
      lower,
    ),
    mentionsSoftDrinksOnly: /\b(soft drinks?|non[- ]?alcoholic)\b/i.test(lower),
    detectedIntents,
  };
}

export function buildAiEventSystemPrompt(maxFaqs: number): string {
  return `You are an expert EventWizz AI Event Creation Assistant for vendors. Vendors write messy natural-language instructions in "Additional Details" — your job is to extract structured event configuration and marketing copy.

VENDOR INTENT CATEGORIES (handle all that apply):
- ROOM: create/update rooms, VIP seating, adults-only, copy settings between rooms
- DATES: single/multiple dates, ranges, recurring (weekends/Fridays), shared dates across rooms, per-room dates
- CATERING: starters/main/dessert only, vegan, Italian menu, per-room or shared menus
- DRINKS: alcohol/soft drinks/whisky packages, per-room drink packages
- PRICING: ticket price, catering cost, VIP pricing, weekend pricing, discounts
- TICKETS: capacity, VIP/early bird/general admission, free entry + paid catering
- TABLES: table count, capacity per table, seated vs standing
- TIMELINE: doors open, catering/music times, event end
- BROCHURE: same or different brochure/location copy per room
- PACKAGES (stepTwo): different package features per room when vendor asks
- BULK: apply price/menu/dates to all rooms; copy room X to room Y
- DEPOSIT: percentage or amount deposit on tables/both bookings
- FAQ: reflect vendor policies; up to ${maxFaqs} items when vendor asks for many FAQs

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no commentary
2. Respect ALL character limits exactly
3. Times: HH:mm 24-hour, chronological within a day
4. Prices: positive integers (strings in dates; numbers in drink packages)
5. No HTML in text fields
6. Honor vendor specs EXACTLY when stated (dates, prices, room names, deposit %, booking types)
7. Ignore jokes, insults, unrelated noise — use only event facts
8. PAYMENT (backend rejects invalid combos):
   - booking_type "tickets": payment_type "full", no deposit fields
   - booking_type "tables" or "both": payment_type required ("full" or "deposit")
   - deposit: is_deposit_enabled true, deposit_type amount|percentage, deposit_value (percentage 20-80), deposit_due_date BEFORE event_date
9. stepThree.dates: YYYY-MM-DD, ascending, no duplicates, today or future
10. stepFour/stepFive optional when vendor says no food/drinks
11. stepSeven.faqs: max ${maxFaqs}; when vendor asks for 10+ FAQs, provide ${maxFaqs} strong relevant FAQs
12. ROOM SYSTEM (when YES):
    - Use EXACT room names provided (${AI_EVENT_MIN_ROOMS}-${AI_EVENT_MAX_ROOMS} rooms)
    - stepThree.rooms: one entry per room_name with its own dates[] when dates differ per room
    - stepFour.rooms: per-room menus when vendor specifies different menus per room
    - stepTwo.rooms: per-room package_details when vendor specifies different packages per room
    - stepFive.rooms: per-room drink packages when vendor specifies different drinks per room
    - stepSix.rooms: per-room brochure/location description when vendor asks brochure per room
    - If vendor says same dates/brochure/timeline for all rooms, duplicate identical arrays/objects
    - If vendor assigns Room A dates Aug 20-22 and Room B dates Sep 2/6/8, put those in stepThree.rooms — NOT flat stepThree.dates only`;
}

export function buildAiEventJsonSchemaBlock(
  input: Pick<AIEventInput, "venueAddress" | "venueCity">,
  hasRoomSystem: boolean,
  roomNames: string[],
  maxFaqs: number,
): string {
  const roomBlock = hasRoomSystem
    ? `,
    "rooms": [
      {
        "room_name": "string (EXACT room name from list)",
        "dates": [
          {
            "event_date": "YYYY-MM-DD",
            "booking_type": "tickets | tables | both",
            "tickets": [{"title": "string (max 25)", "description": "string (max 160)", "total_capacity": "string", "price": "string"}],
            "tables": [{"min_persons": "string", "max_persons": "string", "price": "string", "total_tables": "string"}],
            "payment_type": "full or deposit",
            "is_deposit_enabled": false,
            "deposit_type": "amount or percentage",
            "deposit_value": "string",
            "deposit_due_date": "YYYY-MM-DD"
          }
        ]
      }
    ]`
    : "";

  const stepTwoRoomBlock = hasRoomSystem
    ? `,
    "rooms": [
      {
        "room_name": "string (EXACT room name)",
        "package_title": "string (max 40, optional per-room override)",
        "package_description": "string (max 160)",
        "package_details": [{"title": "string (max 40)"}],
        "event_schedular": [{"title": "string (max 40)", "time": "HH:mm"}]
      }
    ]`
    : "";

  const stepFourRoomBlock = hasRoomSystem
    ? `,
    "rooms": [
      {
        "room_name": "string (EXACT room name)",
        "catering_option": 1,
        "menu_title": "string (max 40)",
        "menu_description": "string (max 160)",
        "menus": [{"name": "string", "items": [{"title": "Item Title 1", "description": "string (max 160)"}]}]
      }
    ]`
    : "";

  const stepFiveRoomBlock = hasRoomSystem
    ? `,
    "rooms": [
      {
        "room_name": "string (EXACT room name)",
        "drink_title": "string (max 40)",
        "drink_description": "string (max 160)",
        "packages": [{"title": "string (max 25)", "description": "string (max 160)", "price": number, "available_quantity": number}]
      }
    ]`
    : "";

  const stepSixRoomBlock = hasRoomSystem
    ? `,
    "rooms": [
      {
        "room_name": "string (EXACT room name)",
        "location_description": "string (max 160, brochure/location blurb for this room)",
        "price_start_from": "string (optional per-room starting price)"
      }
    ]`
    : "";

  return `Generate this EXACT JSON structure:

{
  "stepOne": {
    "event_name": "string (max 40 chars)",
    "event_banner_heading": "string (max 30 words)",
    "event_banner_sub_heading": "string (max 80 chars)",
    "about_event_heading": "string (max 50 chars)",
    "about_event_sub_heading": "string (max 80 chars)",
    "about_event_description": "string (max 340 chars, no HTML)"
  },
  "stepTwo": {
    "package_title": "string (max 40 chars)",
    "package_description": "string (max 160 chars)",
    "package_details": [{"title": "string (max 40 chars)"}],
    "event_schedular_title": "string (max 40 chars)",
    "event_schedule_subtitle": "string (max 160 chars)",
    "event_schedular": [{"title": "string (max 40 chars)", "time": "HH:mm"}]${stepTwoRoomBlock}
  },
  "stepThree": {
    "dates": [
      {
        "event_date": "YYYY-MM-DD",
        "booking_type": "tickets | tables | both",
        "tickets": [{"title": "string", "description": "string", "total_capacity": "string", "price": "string"}],
        "tables": [{"min_persons": "string", "max_persons": "string", "price": "string", "total_tables": "string"}],
        "payment_type": "full or deposit",
        "is_deposit_enabled": false,
        "deposit_type": "amount or percentage",
        "deposit_value": "string",
        "deposit_due_date": "YYYY-MM-DD"
      }
    ]${roomBlock}
  },
  "stepFour": {
    "catering_option": 1,
    "menu_title": "string (max 40 chars)",
    "menu_description": "string (max 160 chars)",
    "menus": [{"name": "Starters", "items": [{"title": "Item Title 1", "description": "string (max 160)"}]}]${stepFourRoomBlock}
  },
  "stepFive": {
    "drink_title": "string (max 40 chars)",
    "drink_description": "string (max 160 chars)",
    "packages": [{"title": "string (max 25)", "description": "string (max 160)", "price": number, "available_quantity": number}]${stepFiveRoomBlock}
  },
  "stepSix": {
    "event_address": "${input.venueAddress || input.venueCity || ""}",
    "price_start_from": "string (e.g. '55')",
    "price_start_from_button_text": "Book Now"${stepSixRoomBlock}
  },
  "stepSeven": {
    "faqs": [{"question": "string (max 160 chars)", "answer": "string (max 500 chars)"}]
  }
}

stepSeven.faqs: provide ${Math.min(maxFaqs, 10)} items when vendor asks for many FAQs (hard cap ${maxFaqs}).
When ROOM SYSTEM is YES: ${hasRoomSystem ? `include stepThree.rooms with exactly ${roomNames.length} room objects using names: ${roomNames.map((n) => `"${n}"`).join(", ")}` : "omit stepThree.rooms"}.
Return ONLY JSON.`;
}

export function buildAiEventUserPrompt(params: {
  input: AIEventInput;
  hints: AiEventVendorIntent;
  hasRoomSystem: boolean;
  roomNames: string[];
  jsonSchemaBlock: string;
  maxFaqs: number;
}): string {
  const { input, hints, hasRoomSystem, roomNames, jsonSchemaBlock, maxFaqs } =
    params;

  const paymentHint = hints.prefersDepositPayment
    ? "Vendor wants DEPOSIT payment — use payment_type deposit with percentage or amount as stated; set is_deposit_enabled true."
    : "Default table/both to payment_type full unless vendor asked for deposit.";

  const bookingHint = hints.prefersTicketsOnly
    ? "Use ticket-only booking_type."
    : hints.prefersTablesBooking
      ? "Use tables or both booking_type."
      : hints.wantsBothTicketsAndTables
        ? "Vendor wants BOTH tickets AND tables on dates — booking_type must be 'both'."
        : "Use realistic booking_type per vendor text.";

  const datesHint = hints.wantsSameDatesAllRooms
    ? "SAME dates on ALL rooms — duplicate identical dates[] in every stepThree.rooms entry."
    : hints.wantsPerRoomDates
      ? "DIFFERENT dates per room — put each room's dates ONLY in stepThree.rooms; stepThree.dates can mirror first room or stay minimal."
      : "Assign dates per vendor text; use stepThree.rooms when rooms differ.";

  const menuHint = hints.wantsPerRoomMenus
    ? "DIFFERENT menus per room — fill stepFour.rooms with room-specific menus (e.g. Italian in both if stated)."
    : "Shared menu in stepFour unless vendor specifies per-room differences.";

  const drinksHint = hints.wantsPerRoomDrinks
    ? "DIFFERENT drink packages per room — use stepFive.rooms (e.g. whisky/beverages in one room, soft drinks only in another)."
    : hints.wantsSecondRoomNonAlcoholDrinks
      ? "Second room: non-alcoholic packages only in stepFive.rooms."
      : "Shared drinks in stepFive unless vendor specifies per-room packages.";

  const packagesHint = hints.wantsPerRoomPackages
    ? "DIFFERENT package features per room — use stepTwo.rooms with distinct package_details (e.g. drink packages vs exclusive packages)."
    : "Shared stepTwo package unless vendor asks for different packages per room.";

  const brochureHint = hints.wantsPerRoomBrochure
    ? "Brochure/location copy per room — fill stepSix.rooms with location_description per room_name."
    : "Shared stepSix location unless vendor asks per-room brochure info.";

  const faqHint = `Provide at least ${hints.requestedMinFaqs} FAQs (max ${maxFaqs}) covering pricing, deposits, what's included, room differences, and policies from vendor text.`;

  const descriptionBlock = hints.sanitizedDescription
    ? `\nVENDOR REQUIREMENTS (natural language — extract ALL facts, ignore noise):\n"""${hints.sanitizedDescription}"""\n`
    : "";

  const exampleBlock = hasRoomSystem
    ? `\nEXAMPLE (multi-room): "Room Snow Ball dates 25-27 Aug 2026 with tickets+tables+deposit%; Room Office dates 2,6,8 Sep 2026 with tickets+tables; different menus and drink packages per room; Italian menu; whisky in Snow Ball, soft drinks in Office; packages price £55; 10 FAQs" → map each fact to the correct step and room_name.\n`
    : "";

  return `Generate complete event content for:

EVENT INFO:
- Event Name: "${input.eventName}"
- Event Type: "${input.eventType}"
${input.venueName ? `- Venue: "${input.venueName}"` : ""}
${input.venueCity ? `- City: "${input.venueCity}"` : ""}
${input.venueAddress ? `- Address: "${input.venueAddress}"` : ""}
${input.guestCount ? `- Expected Guests: "${input.guestCount}"` : ""}
${input.priceRange ? `- Price Range: "${input.priceRange}"` : ""}
ROOM SYSTEM: ${hasRoomSystem ? "YES" : "NO"}
${hasRoomSystem ? `- Room names (use EXACTLY): ${roomNames.map((n) => `"${n}"`).join(", ")}` : ""}
${descriptionBlock}${exampleBlock}
INTERPRETATION HINTS:
- ${datesHint}
- ${paymentHint}
- ${bookingHint}
- ${menuHint}
- ${drinksHint}
- ${packagesHint}
- ${brochureHint}
- ${faqHint}
${hints.detectedIntents.length > 0 ? `- Detected intents: ${hints.detectedIntents.join(", ")}` : ""}

${jsonSchemaBlock}

FINAL CHECK: Every date, price, room name, deposit rule, menu, drink package, and FAQ must match vendor requirements. Do not invent conflicting specs.
Return ONLY JSON.`;
}

export function ensureStepThreeEventRooms(
  rooms: AIRoomDates[] | undefined,
  roomNames: string[],
  fallbackDates: AIDate[],
  hints: AiEventVendorIntent,
  sanitizeDates: (dates: AIDate[] | undefined, offset: number) => AIDate[],
): AIRoomDates[] {
  return ensureStepFiveRooms(
    rooms,
    roomNames,
    fallbackDates,
    hints,
    sanitizeDates,
  );
}

export function ensureStepFiveEventDrinkRooms(
  rooms: AIRoomDrinks[] | undefined,
  roomNames: string[],
  shared: {
    drink_title: string;
    drink_description: string;
    packages: AIRoomDrinks["packages"];
  },
  hints: AiEventVendorIntent,
): AIRoomDrinks[] {
  return ensureStepSevenRooms(rooms, roomNames, shared, hints);
}

function matchRoomByName<T extends { room_name?: string }>(
  entries: T[] | undefined,
  name: string,
): T | undefined {
  if (!entries?.length) return undefined;
  const key = name.trim().toLowerCase();
  return entries.find(
    (entry) => String(entry.room_name ?? "").trim().toLowerCase() === key,
  );
}

export function resolveRoomPackageFields(
  roomName: string,
  shared: {
    package_title: string;
    package_description: string;
    package_details: Array<{ title: string }>;
    event_schedular: Array<{ title: string; time: string }>;
  },
  roomPackages: AIEventRoomPackage[] | undefined,
): typeof shared {
  const match = matchRoomByName(roomPackages, roomName);
  if (!match) return shared;
  return {
    package_title: match.package_title?.trim() || shared.package_title,
    package_description:
      match.package_description?.trim() || shared.package_description,
    package_details:
      match.package_details?.length ? match.package_details : shared.package_details,
    event_schedular:
      match.event_schedular?.length ? match.event_schedular : shared.event_schedular,
  };
}

export function resolveRoomMenuFields(
  roomName: string,
  shared: {
    catering_option: number;
    menu_title: string;
    menu_description: string;
    menus: AIEventRoomMenu["menus"];
  },
  roomMenus: AIEventRoomMenu[] | undefined,
): typeof shared {
  const match = matchRoomByName(roomMenus, roomName);
  if (!match) return shared;
  return {
    catering_option:
      match.catering_option === 0 ? 0 : match.catering_option === 1 ? 1 : shared.catering_option,
    menu_title: match.menu_title?.trim() || shared.menu_title,
    menu_description: match.menu_description?.trim() || shared.menu_description,
    menus: match.menus?.length ? match.menus : shared.menus,
  };
}

export function resolveRoomBrochureDescription(
  roomName: string,
  defaultDescription: string,
  roomBrochures: AIEventRoomBrochure[] | undefined,
): string {
  const match = matchRoomByName(roomBrochures, roomName);
  return match?.location_description?.trim() || defaultDescription;
}

export const AI_EVENT_ADDITIONAL_DETAILS_PLACEHOLDER =
  "Describe tickets, tables, dates per room, menus, drink packages, deposits, pricing, brochures, timeline, VIP rules or copy-from-room instructions. Example: Room A dates 25–27 Aug with tickets and tables and a 25% deposit; Room B dates 2, 6 and 8 Sep with tickets and tables; Italian menu in both; whisky packages in Room A, soft drinks in Room B; packages from £55; at least 10 FAQs.";

export const AI_EVENT_ADDITIONAL_DETAILS_HINT =
  "Describe what you need in plain English — dates per room, menus, drinks, packages, deposits, pricing and FAQs. Be specific about room names, dates and prices.";
