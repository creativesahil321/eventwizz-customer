/**
 * List pending, date-filtered (today, yesterday, this month), or recent bookings
 * with customer contact and status for vendor chat.
 * Uses GET /vendor/bookings + GET /vendor/bookings/{id} for phone/email.
 */

import {
  formatMoneyLocale,
  parseFormattedMoney,
} from "@/lib/currency-format";
import { getTenantCurrencySymbol } from "@/lib/tenant-currency";
import {
  vendorBookingsService,
  type VendorBookingItem,
} from "@/services/vendor/bookings/bookings.service";
import {
  resolveChatDateRange,
  type ChatDateRange,
} from "@/lib/chat-vendor-live-stats";
import { normalizeVendorChatText } from "@/lib/chat-typo-normalizer";
import { format } from "date-fns";

function money(value: unknown): string {
  const symbol = getTenantCurrencySymbol();
  const parsed = parseFormattedMoney(String(value ?? ""), symbol);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return formatMoneyLocale(amount, symbol);
}

function pendingValue(b: VendorBookingItem): number {
  const n = Number.parseFloat(String(b.pending_amount ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse booking date string (e.g. "01-09-2026 10:31AM", "04-09-2026", "2026-09-04")
 */
function parseBookingDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  // Match "DD-MM-YYYY" or "DD-MM-YYYY HH:mm..."
  const dmyMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }

  // Match "YYYY-MM-DD"
  const ymdMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function matchesDateRange(date: Date, range: ChatDateRange): boolean {
  if (range.allTime || !range.from_date) return true;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateYmd = `${y}-${m}-${d}`;

  if (range.from_date && range.to_date) {
    return dateYmd >= range.from_date && dateYmd <= range.to_date;
  }
  if (range.from_date) {
    return dateYmd >= range.from_date;
  }
  return true;
}

/** Vendor wants a list of bookings / customer contacts to call. */
export function isVendorBookingListIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text).toLowerCase();

  // If asking about a specific room's bookings or rooms in general, let room handler take it
  if (/\b(room|rooms|hall|suite|spaces?|oaksmith|snowbell)\b/i.test(norm) && !/\b(book\s+a\s+room)\b/i.test(norm)) {
    return false;
  }

  // If asking for a named event (e.g. Diwali Party, Christmas Event), let event overview handle it
  if (
    /\b(for|of)\s+([A-Za-z0-9\s]+)\b/i.test(text) &&
    /\b(party|event|celebration|night|festival|gala|diwali|christmas)\b/i.test(norm) &&
    !/\b(VE|EV|BK|WB|BW)-\d+\b/i.test(norm)
  ) {
    return false;
  }

  // Specific single booking reference e.g. "VE-026" without list request goes to booking_lookup
  if (
    /\b(VE|EV|BK|WB|BW|[A-Z]{2,4})-\d+\b/i.test(norm) &&
    !/\b(list|all|show\s+all)\b/i.test(norm)
  ) {
    return false;
  }

  const wantsList =
    /\b(list|show|give\s+me|get|tell\s+me|which|who|see|view|display)\b/i.test(
      norm
    ) &&
    /\b(booking|bookings|reservation|reservations|order|orders)\b/i.test(norm);

  const temporalBooking =
    /\b(today'?s?|yesterday'?s?|this\s+week'?s?|this\s+month'?s?|recent|latest|upcoming|pending|unpaid|new)\s+(booking|bookings|orders?|reservations?)\b/i.test(
      norm
    );

  const bookingsTemporal =
    /\b(booking|bookings|orders?|reservations?)\s+(today|for\s+today|yesterday|this\s+week|this\s+month|recently|now)\b/i.test(
      norm
    );

  // Note: Contact query MUST be coupled with booking / reservations (not just customer contact!)
  const wantsContact =
    /\b(contact|phone|telephone|mobile|email|call|reach)\b/i.test(norm) &&
    /\b(booking|bookings|reservation|reservations|guest\s+booking|attendee\s+booking)\b/i.test(
      norm
    );

  return wantsList || temporalBooking || bookingsTemporal || wantsContact;
}

export type VendorBookingListChatResult = {
  reply: string;
  bookingsHref?: string;
};

export async function fetchVendorBookingListChatReply(params: {
  userText: string;
  userName?: string | null;
  /** Prior user messages — for “list those pending bookings” follow-ups */
  priorUserTexts?: string[];
}): Promise<VendorBookingListChatResult | null> {
  const norm = normalizeVendorChatText(params.userText);
  const combined = [norm, ...(params.priorUserTexts ?? []).map(normalizeVendorChatText)]
    .join(" ")
    .toLowerCase();

  const wantsPending =
    /\b(pending|outstanding|owed|unpaid|balance\s+due)\b/.test(combined) ||
    /\b(that|those|them)\b/.test(norm.toLowerCase());

  const wantsContact =
    /\b(contact|phone|telephone|mobile|email|call|reach)\b/i.test(norm);

  const dateRange = resolveChatDateRange(norm);
  const isTemporalFilter =
    !dateRange.allTime &&
    dateRange.from_date != null &&
    /\b(today|yesterday|week|month|days?)\b/i.test(norm);

  const greet = params.userName?.trim()
    ? `Hello, ${params.userName.trim()}. `
    : "";

  const bookingsHref = "/vendor/booking-history";

  let items: VendorBookingItem[] = [];
  try {
    const res = await vendorBookingsService.getBookings({
      page: 1,
      per_page: 1000,
      ...(wantsPending ? { status: "Partial" } : {}),
    });
    items = res?.data ?? [];
  } catch (error) {
    console.error("Chat booking list failed:", error);
    return {
      reply: `${greet}I couldn’t load bookings just now. Please try again in a moment.`,
      bookingsHref,
    };
  }

  if (items.length === 0) {
    return {
      reply: `${greet}You don't have any bookings in your system yet. Open [Bookings](${bookingsHref}) to manage event reservations.`,
      bookingsHref,
    };
  }

  // 1. Pending filter
  let filtered = items;
  if (wantsPending) {
    filtered = items.filter((b) => pendingValue(b) > 0);
    if (filtered.length === 0) {
      try {
        const all = await vendorBookingsService.getBookings({
          page: 1,
          per_page: 1000,
        });
        filtered = (all?.data ?? []).filter((b) => pendingValue(b) > 0);
      } catch {
        /* keep empty */
      }
    }
  }

  // 2. Date filter (today, yesterday, this week, this month, etc.)
  let matchedDateItems: VendorBookingItem[] = [];
  if (isTemporalFilter) {
    matchedDateItems = filtered.filter((b) => {
      const bDate = parseBookingDate(b.booking_date);
      if (bDate && matchesDateRange(bDate, dateRange)) return true;
      if (Array.isArray(b.event_date)) {
        for (const ed of b.event_date) {
          const eDate = parseBookingDate(ed.date);
          if (eDate && matchesDateRange(eDate, dateRange)) return true;
        }
      }
      return false;
    });
  } else {
    matchedDateItems = filtered;
  }

  // If temporal filter was requested (e.g. "today's booking") and 0 bookings matched:
  if (isTemporalFilter && matchedDateItems.length === 0) {
    const todayFormatted = format(new Date(), "dd-MM-yyyy");
    const recentSlice = filtered.slice(0, 5);

    const recentLines = recentSlice.map((b, i) => {
      const pending = pendingValue(b) > 0 ? ` · pending **${money(b.pending_amount)}**` : "";
      return `${i + 1}. **${b.booking_number}** — ${b.user_name} · ${b.event_name} · Total **${money(b.amount)}** (Booked: ${b.booking_date}${pending}) · [Open](/vendor/booking-history/${b.booking_id})`;
    });

    const recentBlock =
      recentLines.length > 0
        ? `\n\nHere are your most recent bookings:\n${recentLines.join("\n")}`
        : "";

    return {
      reply: `${greet}You have no bookings recorded for **${dateRange.label}** (${todayFormatted}).${recentBlock}\n\nOpen [Bookings](${bookingsHref}) for complete history.`,
      bookingsHref,
    };
  }

  // If pending was requested and 0 pending found:
  if (wantsPending && matchedDateItems.length === 0) {
    return {
      reply: `${greet}There are no bookings with a pending balance right now. Open [Bookings](${bookingsHref}) to browse all bookings.`,
      bookingsHref,
    };
  }

  // Cap detail lookups to keep chat responsive
  const maxDetail = 10;
  const slice = matchedDateItems.slice(0, maxDetail);

  const withContact = await Promise.all(
    slice.map(async (b) => {
      let email: string | null = null;
      let phone: string | null = null;
      if (wantsContact || wantsPending) {
        try {
          const detail = await vendorBookingsService.getBookingById(b.booking_id);
          email = detail?.data?.user?.email?.trim() || null;
          phone = detail?.data?.user?.phone?.trim() || null;
        } catch {
          /* contact optional */
        }
      }
      return { booking: b, email, phone };
    })
  );

  const lines = withContact.map(({ booking: b, email, phone }, i) => {
    const pending = pendingValue(b) > 0 ? ` · pending **${money(b.pending_amount)}**` : "";
    const phoneBit = phone ? ` · 📞 ${phone}` : "";
    const emailBit = email ? ` · ✉️ ${email}` : "";
    const statusBit = b.status ? ` · Status: **${b.status}**` : "";
    return `${i + 1}. **${b.booking_number}** — ${b.user_name} · ${b.event_name} · Total **${money(b.amount)}** (Booked: ${b.booking_date}${pending}${statusBit}${phoneBit}${emailBit}) · [Open](/vendor/booking-history/${b.booking_id})`;
  });

  const more =
    matchedDateItems.length > maxDetail
      ? `\n\nShowing **${maxDetail}** of **${matchedDateItems.length}** bookings. See the rest on [Open Bookings](${bookingsHref}).`
      : `\n\nOpen [Bookings](${bookingsHref}) for full history.`;

  let heading = `${greet}Here are your bookings:`;
  if (isTemporalFilter) {
    heading = `${greet}Here are your bookings for **${dateRange.label}** (**${matchedDateItems.length}** found):`;
  } else if (wantsPending) {
    heading = `${greet}Here are **${matchedDateItems.length}** booking${matchedDateItems.length === 1 ? "" : "s"} with a pending balance:`;
  }

  return {
    reply: `${heading}\n\n${lines.join("\n")}${more}`,
    bookingsHref,
  };
}
