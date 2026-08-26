import {
  asksRoomDifference,
  asksToChangeOrPickRoom,
  buildBookingKickoffCopy,
  buildDateChoiceQuickActions,
  buildRoomChoiceHostCopy,
  buildRoomChoiceQuickActions,
  buildRoomDifferenceCopy,
  CHAT_PAY_DEPOSIT_ID,
  CHAT_PAY_FULL_ID,
  formatChatDrinkLabel,
  formatChatMoney,
  formatEventVenuePhrase,
  isBookingConciergeFollowUp,
  listBookableChatRooms,
  listChatDatesForRoom,
  listChatDrinks,
  type ChatBookingDate,
  type ChatBookingDrink,
  type ChatEventBookingBrief,
  type ChatQuickActionDraft,
} from "@/lib/chat-event-booking";
import { isLiveEventBookingIntent } from "@/lib/chat-live-events";

export type ChatBookingSeating = "tables" | "tickets" | "both";

export type ChatBookingChoices = {
  roomId: number | null;
  roomName: string | null;
  dates: ChatBookingDate[];
  guestCount: number | null;
  seating: ChatBookingSeating | null;
  drinkTitles: string[];
  drinkQuantities: Record<string, number>;
  couponApplied: boolean;
  couponSkipped: boolean;
};

export type ChatHostBookingTurn = {
  content: string;
  actions: ChatQuickActionDraft[];
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function lastUserTexts(
  messages: Array<{ role: string; content: string }>,
): string[] {
  return messages.filter((m) => m.role === "user").map((m) => m.content);
}

function dateMatchesText(date: ChatBookingDate, text: string): boolean {
  const n = normalize(text);
  const iso = date.date.slice(0, 10);
  if (iso && n.includes(iso.replace(/-/g, " "))) return true;
  if (iso && text.includes(iso)) return true;
  const label = normalize(date.label);
  if (label && n.includes(label)) return true;
  const compact = label.replace(/\s+/g, " ");
  if (compact && n.includes(compact)) return true;
  const dayMonth = date.label.match(/\d{1,2}\s+\w{3,}/);
  if (dayMonth && n.includes(normalize(dayMonth[0]))) return true;
  return false;
}

function extractGuestCount(text: string): number | null {
  const withWord = [
    ...text.matchAll(/\b(\d{1,3})\s*(?:guests?|people|persons?|pax)\b/gi),
  ];
  if (withWord.length > 0) {
    const n = Number(withWord[withWord.length - 1][1]);
    if (n >= 1 && n <= 500) return n;
  }
  const lone = text.trim().match(/^(\d{1,3})$/);
  if (lone) {
    const n = Number(lone[1]);
    if (n >= 1 && n <= 500 && n !== 2025 && n !== 2026 && n !== 2027) return n;
  }
  return null;
}

function parseDrinkQuantity(
  text: string,
  drink: ChatBookingDrink,
): number | null {
  const n = normalize(text);
  const title = normalize(drink.title);
  if (!title || !n.includes(title)) return null;
  const after = n.match(new RegExp(`${title.replace(/ /g, "\\s+")}\\s*(?:x|×)?\\s*(\\d{1,3})`));
  if (after) {
    const qty = Number(after[1]);
    if (qty >= 1 && qty <= 500) return qty;
  }
  const before = n.match(
    new RegExp(`(\\d{1,3})\\s*(?:x|×|of)?\\s*${title.replace(/ /g, "\\s+")}`),
  );
  if (before) {
    const qty = Number(before[1]);
    if (qty >= 1 && qty <= 500) return qty;
  }
  return 1;
}

function seatingFromText(n: string): ChatBookingSeating | null {
  if (/\bboth\b/.test(n) && /\b(table|ticket)/.test(n)) return "both";
  if (/\btickets?\s+only\b/.test(n) || n === "tickets" || n === "tickets only") {
    return "tickets";
  }
  if (/\btables?\s+only\b/.test(n) || n === "tables" || n === "tables only") {
    return "tables";
  }
  return null;
}

/**
 * Read room / dates / party size from the chat so the host can ask the next
 * question and so payment can build a checkout payload.
 */
export function parseChatBookingChoices(
  messages: Array<{ role: string; content: string }>,
  brief: ChatEventBookingBrief | null | undefined,
): ChatBookingChoices {
  const empty: ChatBookingChoices = {
    roomId: null,
    roomName: null,
    dates: [],
    guestCount: null,
    seating: null,
    drinkTitles: [],
    drinkQuantities: {},
    couponApplied: false,
    couponSkipped: false,
  };
  if (!brief) return empty;

  const users = lastUserTexts(messages);

  let roomId: number | null = null;
  let roomName: string | null = null;
  if (brief.hasRooms) {
    for (const room of brief.rooms) {
      const name = normalize(room.name);
      if (!name) continue;
      const hit = users.some((u) => normalize(u).includes(name));
      if (hit && !room.disabled) {
        roomId = room.roomId;
        roomName = room.name;
      }
    }
  }

  const datePool =
    brief.hasRooms && roomId != null
      ? (brief.rooms.find((r) => r.roomId === roomId)?.dates ?? [])
      : brief.hasRooms
        ? brief.rooms.flatMap((r) => r.dates)
        : brief.dates;

  const dates: ChatBookingDate[] = [];
  const seen = new Set<string>();
  for (const date of datePool) {
    if (date.soldOut) continue;
    const matched = users.some((u) => dateMatchesText(date, u));
    if (!matched) continue;
    const key = date.date.slice(0, 10);
    if (seen.has(key)) continue;
    seen.add(key);
    dates.push(date);
  }

  let guestCount: number | null = null;
  for (const text of users) {
    if (/i'?ll type the guest number/i.test(text)) continue;
    const n = extractGuestCount(text);
    if (n != null) guestCount = n;
  }

  let seating: ChatBookingSeating | null = null;
  for (const text of users) {
    const parsed = seatingFromText(normalize(text));
    if (parsed) seating = parsed;
  }

  const drinkPool = listChatDrinks(brief, roomId);
  const drinkTitles: string[] = [];
  const drinkQuantities: Record<string, number> = {};
  for (const drink of drinkPool) {
    let qty: number | null = null;
    for (const text of users) {
      const parsed = parseDrinkQuantity(text, drink);
      if (parsed != null) qty = parsed;
    }
    if (qty == null) continue;
    drinkTitles.push(drink.title);
    drinkQuantities[drink.title] = qty;
  }

  const couponCode = brief.coupon?.code
    ? normalize(brief.coupon.code)
    : "";
  const couponApplied =
    Boolean(couponCode) &&
    users.some((text) => {
      const n = normalize(text);
      if (n === couponCode) return true;
      return /\b(apply|use)\b/.test(n) && n.includes(couponCode);
    });
  const couponSkipped = users.some((text) =>
    /\b(without (a )?coupon|no coupon|skip (the )?coupon|continue without)\b/i.test(
      text,
    ),
  );

  return {
    roomId,
    roomName,
    dates,
    guestCount,
    seating,
    drinkTitles,
    drinkQuantities,
    couponApplied,
    couponSkipped,
  };
}

export function isChatPayIntent(text: string): boolean {
  return /\b(pay in full|pay a table deposit|pay the deposit|pay now)\b/i.test(
    text,
  );
}

export function parseChatPayMode(text: string): "full" | "deposit" | null {
  const n = normalize(text);
  if (/\bpay a table deposit\b/.test(n) || /\bpay the deposit\b/.test(n)) {
    return "deposit";
  }
  if (/\bpay in full\b/.test(n) || n === "pay now") return "full";
  return null;
}

export function isHostBookingUserText(
  text: string,
  brief: ChatEventBookingBrief | null | undefined,
): boolean {
  if (!brief) return false;
  if (
    asksRoomDifference(text) ||
    asksToChangeOrPickRoom(text) ||
    isLiveEventBookingIntent(text) ||
    isBookingConciergeFollowUp(text) ||
    isChatPayIntent(text)
  ) {
    return true;
  }
  const n = normalize(text);
  if (
    /\b(without (a )?coupon|no coupon|skip (the )?coupon|continue without|apply|i'?ll type)\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (
    listBookableChatRooms(brief).some((room) =>
      n.includes(normalize(room.name)),
    )
  ) {
    return true;
  }
  if (listChatDatesForRoom(brief).some((date) => dateMatchesText(date, text))) {
    return true;
  }
  if (
    listChatDrinks(brief).some((drink) => n.includes(normalize(drink.title)))
  ) {
    return true;
  }
  const location = normalize(brief.locationCity || "");
  if (location && n.includes(location)) return true;
  const slugCity = normalize((brief.locationSlug || "").replace(/-/g, " "));
  if (slugCity && n.includes(slugCity)) return true;
  return extractGuestCount(text) != null;
}

function guestChoiceActions(): ChatQuickActionDraft[] {
  return [
    { id: "guests-40", label: "40 guests", sendText: "40 guests" },
    {
      id: "guests-type",
      label: "I’ll type a number",
      sendText: "I'll type the guest number",
    },
  ];
}

function seatingActions(
  bookingType?: ChatBookingDate["bookingType"],
): { prose: string; actions: ChatQuickActionDraft[] } {
  if (bookingType === "tables") {
    return {
      prose: "This date is booked by table.",
      actions: [
        { id: "seating-tables", label: "Tables only", sendText: "tables only" },
      ],
    };
  }
  if (bookingType === "tickets") {
    return {
      prose: "This date is ticketed.",
      actions: [
        {
          id: "seating-tickets",
          label: "Tickets only",
          sendText: "tickets only",
        },
      ],
    };
  }
  return {
    prose: "Would you like tables, tickets, or both?",
    actions: [
      { id: "seating-tables", label: "Tables only", sendText: "tables only" },
      {
        id: "seating-tickets",
        label: "Tickets only",
        sendText: "tickets only",
      },
      {
        id: "seating-both",
        label: "Both",
        sendText: "both tables and tickets",
      },
    ],
  };
}

function seatingLabel(seating: ChatBookingSeating | null): string {
  if (seating === "tables") return "tables";
  if (seating === "tickets") return "tickets";
  if (seating === "both") return "tables and tickets";
  return "your seating";
}

function dateOfferLines(
  dates: ChatBookingDate[],
  allDates: ChatBookingDate[],
): string {
  const withOffer = allDates.filter((date) => date.offer && !date.soldOut);
  if (withOffer.length === 0) return "";
  const chosenKeys = new Set(dates.map((date) => date.date.slice(0, 10)));
  const lines = withOffer.map((date) => {
    const chosen = chosenKeys.has(date.date.slice(0, 10))
      ? " (your date)"
      : "";
    return `- **${date.label}** — ${date.offer}${chosen}`;
  });
  return `\n\nDate offers:\n${lines.join("\n")}`;
}

function estimateLineTotal(
  choices: ChatBookingChoices,
  drinks: ChatBookingDrink[],
): {
  tableTotal: number;
  ticketTotal: number;
  drinkTotal: number;
  lines: string[];
} {
  const lines: string[] = [];
  let tableTotal = 0;
  let ticketTotal = 0;
  let drinkTotal = 0;
  const date = choices.dates[0];
  const guests = choices.guestCount ?? 0;

  if (date && guests > 0 && choices.seating !== "tickets") {
    const table = date.tables[0];
    if (table?.price != null) {
      tableTotal = table.price * guests;
      const sizeBit =
        table.maxPersons > 0 ? ` · seats ${table.minPersons}–${table.maxPersons}` : "";
      lines.push(
        `- Tables: ${guests} guests × ${formatChatMoney(table.price)}${sizeBit}`,
      );
    }
  }

  if (date && guests > 0 && choices.seating === "tickets") {
    const ticket = date.tickets[0];
    if (ticket?.price != null) {
      ticketTotal = ticket.price * guests;
      lines.push(
        `- Tickets: ${guests} × ${ticket.title} · ${formatChatMoney(ticket.price)}`,
      );
    }
  }

  for (const title of choices.drinkTitles) {
    const drink = drinks.find(
      (item) => normalize(item.title) === normalize(title),
    );
    if (!drink) continue;
    const qty = choices.drinkQuantities[title] ?? 1;
    if (drink.price != null) drinkTotal += drink.price * qty;
    const price = formatChatMoney(drink.price);
    lines.push(
      `- Drinks: ${qty} × ${drink.title}${price ? ` · ${price}` : ""}`,
    );
  }

  return { tableTotal, ticketTotal, drinkTotal, lines };
}

function overstockDrinkTurn(
  brief: ChatEventBookingBrief,
  drink: ChatBookingDrink,
  requested: number,
): ChatHostBookingTurn | null {
  const available = drink.availableQuantity;
  if (available == null || requested <= available) return null;
  return {
    content: `We only have **${available}** ${drink.title} available right now — I can’t book ${requested}.\n\nWould you like ${available}, or a different package?`,
    actions: [
      {
        id: `drink-stock-${drink.id || drink.title}`,
        label: `${available} × ${drink.title}`,
        sendText: `${available} ${drink.title}`,
      },
      ...listChatDrinks(brief)
        .filter((item) => item.title !== drink.title)
        .slice(0, 4)
        .map((item) => ({
          id: `drink-${item.id || item.title}`,
          label: formatChatDrinkLabel(item, brief.currencySymbol),
          sendText: item.title,
        })),
    ],
  };
}

function payActions(
  seating: ChatBookingSeating | null,
): ChatQuickActionDraft[] {
  const actions: ChatQuickActionDraft[] = [
    { id: CHAT_PAY_FULL_ID, label: "Pay in full" },
  ];
  if (seating !== "tickets") {
    actions.push({
      id: CHAT_PAY_DEPOSIT_ID,
      label: "Pay a table deposit",
    });
  }
  return actions;
}

function couponActions(brief: ChatEventBookingBrief): ChatQuickActionDraft[] {
  if (!brief.coupon?.code) return [];
  return [
    {
      id: "apply-coupon",
      label: `Apply ${brief.coupon.code}`,
      sendText: `please apply ${brief.coupon.code}`,
    },
    {
      id: "skip-coupon",
      label: "Continue without a code",
      sendText: "continue without coupon",
    },
  ];
}

function buildSummaryTurn(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  userName?: string | null;
  includeCouponAsk: boolean;
}): ChatHostBookingTurn {
  const { brief, choices } = options;
  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const venue = formatEventVenuePhrase(brief);
  const symbol = brief.currencySymbol;
  const drinks = listChatDrinks(brief, choices.roomId);
  const estimate = estimateLineTotal(choices, drinks);
  const subTotal =
    estimate.tableTotal + estimate.ticketTotal + estimate.drinkTotal;
  const discountable = estimate.tableTotal + estimate.ticketTotal;
  const percent = brief.coupon?.percentOff;
  const discount =
    choices.couponApplied && percent != null && discountable > 0
      ? Math.round(((discountable * percent) / 100) * 100) / 100
      : 0;
  const total = Math.max(0, subTotal - discount);
  const roomBit = choices.roomName ? `\n- Room: **${choices.roomName}**` : "";
  const dateBit = choices.dates.map((date) => date.label).join(" and ");
  const fromBits = choices.dates
    .map((date) => {
      const price = formatChatMoney(date.fromPrice, symbol);
      return price ? `${date.label} from ${price}` : "";
    })
    .filter(Boolean);
  const offerCopy = dateOfferLines(
    choices.dates,
    listChatDatesForRoom(brief, choices.roomId),
  );

  const moneyLines: string[] = [...estimate.lines];
  if (fromBits.length && estimate.lines.length === 0) {
    moneyLines.push(`- Dates: ${fromBits.join("; ")}`);
  }
  if (subTotal > 0) {
    moneyLines.push(`- Subtotal: **${formatChatMoney(subTotal, symbol)}**`);
  }
  if (choices.couponApplied && brief.coupon && discount > 0) {
    moneyLines.push(
      `- ${brief.coupon.code}${
        percent != null ? ` (${percent}% off tables & tickets)` : ""
      }: −${formatChatMoney(discount, symbol)}`,
    );
    moneyLines.push(`- Total: **${formatChatMoney(total, symbol)}**`);
  } else if (brief.coupon && !choices.couponApplied && !choices.couponSkipped) {
    const badge = brief.coupon.badge || (percent != null ? `${percent}% off` : "");
    moneyLines.push(
      `- Coupon **${brief.coupon.code}**${badge ? ` · ${badge}` : ""} applies to tables and tickets (drinks stay full price).`,
    );
  }

  const body = `Here’s your booking summary${nameBit} — **${brief.title}**${venue}.
- Guests: **${choices.guestCount}**
- Date: **${dateBit}**${roomBit}
- Seating: **${seatingLabel(choices.seating)}**
${moneyLines.join("\n")}${offerCopy}`;

  if (options.includeCouponAsk && brief.coupon?.code) {
    return {
      content: `${body}\n\nWould you like to apply **${brief.coupon.code}**?`,
      actions: couponActions(brief),
    };
  }

  return {
    content: `${body}\n\nReady to pay from here?`,
    actions: payActions(choices.seating),
  };
}

/**
 * Keep the booking concierge in deterministic copy so a long AI prompt
 * cannot fail with “reduce the length of the messages or completion”.
 */
export function buildHostBookingTurn(options: {
  brief: ChatEventBookingBrief;
  userText: string;
  choices: ChatBookingChoices;
  userName?: string | null;
}): ChatHostBookingTurn | null {
  const { brief, userText, choices, userName } = options;
  const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
  const venue = formatEventVenuePhrase(brief);
  const bookable = listBookableChatRooms(brief);
  const last = userText.trim();
  const drinks = listChatDrinks(brief, choices.roomId);

  for (const drink of drinks) {
    const qty = parseDrinkQuantity(last, drink);
    if (qty == null || qty <= 1) continue;
    const over = overstockDrinkTurn(brief, drink, qty);
    if (over) return over;
  }

  if (asksRoomDifference(last) && bookable.length >= 2) {
    return {
      content: buildRoomDifferenceCopy(brief),
      actions: buildRoomChoiceQuickActions(brief),
    };
  }

  if (brief.hasRooms && bookable.length >= 2 && choices.roomId == null) {
    if (
      isLiveEventBookingIntent(last) ||
      isBookingConciergeFollowUp(last) ||
      asksToChangeOrPickRoom(last)
    ) {
      return {
        content: buildBookingKickoffCopy({ brief, userName }),
        actions: buildRoomChoiceQuickActions(brief),
      };
    }
    return {
      content: buildRoomChoiceHostCopy(brief, choices.guestCount),
      actions: buildRoomChoiceQuickActions(brief),
    };
  }

  if (choices.roomId != null && choices.dates.length === 0) {
    const roomName =
      choices.roomName ||
      brief.rooms.find((room) => room.roomId === choices.roomId)?.name ||
      "that room";
    const dateActions = buildDateChoiceQuickActions(brief, choices.roomId);
    if (dateActions.length === 0) {
      return {
        content: `Thanks${nameBit} — **${roomName}** for **${brief.title}**${venue}. There aren’t any dates listed for that room right now.`,
        actions: [],
      };
    }
    return {
      content: `Thanks${nameBit} — **${roomName}** for **${brief.title}**${venue}.\n\nWhich date would you like?`,
      actions: dateActions,
    };
  }

  if (choices.dates.length > 0 && choices.guestCount == null) {
    if (/i'?ll type the guest number/i.test(last)) {
      return {
        content: `No problem${nameBit} — type how many guests will be attending.`,
        actions: [],
      };
    }
    const roomBit = choices.roomName ? `, **${choices.roomName}**` : "";
    const dateBit = choices.dates.map((date) => date.label).join(" and ");
    return {
      content: `Great${nameBit} — **${brief.title}**${venue}${roomBit} on **${dateBit}**.\n\nHow many guests will be attending?`,
      actions: guestChoiceActions(),
    };
  }

  if (choices.guestCount != null && choices.dates.length > 0 && !choices.seating) {
    const roomBit = choices.roomName ? `, **${choices.roomName}**` : "";
    const dateBit = choices.dates.map((date) => date.label).join(" and ");
    const seating = seatingActions(choices.dates[0]?.bookingType);
    return {
      content: `Noted${nameBit} — **${choices.guestCount} guests** for **${brief.title}**${venue}${roomBit} on **${dateBit}**.\n\n${seating.prose}`,
      actions: seating.actions,
    };
  }

  if (
    choices.guestCount != null &&
    choices.dates.length > 0 &&
    choices.seating &&
    drinks.length > 0 &&
    choices.drinkTitles.length === 0
  ) {
    const roomBit = choices.roomName ? `, **${choices.roomName}**` : "";
    const dateBit = choices.dates.map((date) => date.label).join(" and ");
    return {
      content: `Thanks${nameBit} — **${choices.guestCount} guests**, ${seatingLabel(choices.seating)} for **${brief.title}**${venue}${roomBit} on **${dateBit}**.\n\nWhich drinks would you like?`,
      actions: drinks.slice(0, 6).map((drink) => ({
        id: `drink-${drink.id || drink.title}`,
        label: formatChatDrinkLabel(drink, brief.currencySymbol),
        sendText: drink.title,
      })),
    };
  }

  if (
    choices.guestCount != null &&
    choices.dates.length > 0 &&
    choices.seating &&
    (drinks.length === 0 || choices.drinkTitles.length > 0)
  ) {
    const includeCouponAsk =
      Boolean(brief.coupon?.code) &&
      !choices.couponApplied &&
      !choices.couponSkipped;
    return buildSummaryTurn({
      brief,
      choices,
      userName,
      includeCouponAsk,
    });
  }

  return null;
}

export function toChatQuickActions(
  actions: ChatQuickActionDraft[],
): ChatQuickActionDraft[] {
  return actions.filter((action) => {
    if (action.id === CHAT_PAY_FULL_ID || action.id === CHAT_PAY_DEPOSIT_ID) {
      return true;
    }
    if (action.sendText) return true;
    if (action.href?.startsWith("/auth/")) return true;
    return false;
  });
}
