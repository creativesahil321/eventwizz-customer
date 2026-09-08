/**
 * Customer storefront on-demand queries — own bookings, payments, profile,
 * and support only. Never invent rows. Never expose other customers or venue
 * revenue.
 */

import { bookingsService } from "@/services/customer/bookings/bookings.service";
import type {
  BookingDetailsData,
  BookingItem,
} from "@/services/customer/bookings/type";
import { fetchCustomerTransactions } from "@/services/customer/transactions/transaction.service";
import { customerSupportService } from "@/services/customer/support/support.service";
import { fetchProfileData } from "@/app/(protected)/_shared/profile/_lib/queries";
import { normalizeVendorChatText } from "@/lib/chat-typo-normalizer";
import {
  DEFAULT_CURRENCY_SYMBOL,
  formatMoneyCompact,
} from "@/lib/currency-format";

export type CustomerQueryType =
  | "forbidden"
  | "my_bookings"
  | "my_next_booking"
  | "booking_lookup"
  | "my_payments"
  | "my_account"
  | "my_support"
  | "cancel_request"
  | "change_request"
  | "refund_request";

const BOOKING_REF = /\b((?:VE|EV|BK|WB|BW)-?\d+)\b/i;
const MAX_LIST = 6;

function norm(text: string): string {
  return normalizeVendorChatText(text).replace(/\s+/g, " ").trim();
}

function money(value: number | string | null | undefined, symbol = DEFAULT_CURRENCY_SYMBOL): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || Number.isNaN(Number(n))) return `${symbol}0`;
  return formatMoneyCompact(Number(n), symbol);
}

export function extractCustomerBookingRef(text: string): string | null {
  const match = norm(text).match(BOOKING_REF);
  if (!match?.[1]) return null;
  return match[1].replace(/^(VE|EV|BK|WB|BW)(\d+)$/i, "$1-$2").toUpperCase();
}

export function isCustomerForbiddenIntent(text: string): boolean {
  const t = norm(text);
  if (
    /\b(all customers|another customer|other customer|another person|someone else'?s|other people'?s)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /\b(vendor'?s?\s+revenue|how much .{0,24}(did |has )?(the )?vendor (make|earn|made)|business earnings|admin (dashboard|information)|vendor dashboard)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /\b(show|give|list)\s+(me\s+)?all\s+bookings\b/i.test(t) &&
    !/\bmy\b/i.test(t)
  ) {
    return true;
  }
  if (
    /\b(show|give|list)\s+(me\s+)?all\s+payments\b/i.test(t) &&
    !/\bmy\b/i.test(t)
  ) {
    return true;
  }
  if (
    /\b(delete|refund|change|cancel)\s+(another|someone else'?s|other)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

export function isCustomerMyBookingsIntent(text: string): boolean {
  const t = norm(text);
  if (
    /\b(book an event|i want to book|find (me )?(an )?event|what events|available tickets?|ticket types?|buy (a )?ticket|need a ticket)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  if (/\b(issue|problem|help|support|can't book|cannot book|can't make)\b/i.test(t)) {
    return false;
  }
  if (extractCustomerBookingRef(t)) return false;
  return (
    /\b(my bookings?|my reservations?|what (bookings|reservations) do i have|do i have (any )?(bookings?|reservations?)|what did i book|upcoming bookings?|past bookings?|show (me )?(my )?(bookings?|reservations?))\b/i.test(
      t,
    ) ||
    (/\bshow (me )?(my )?tickets?\b/i.test(t) &&
      !/\b(available|buy|types?)\b/i.test(t)) ||
    (/\b(bokings?|reservations?)\b/i.test(t) && /\b(my|i have|show)\b/i.test(t))
  );
}

export function isCustomerNextBookingIntent(text: string): boolean {
  const t = norm(text);
  return /\b(my next booking|next booking|what'?s my next|when is my next event)\b/i.test(
    t,
  );
}

export function isCustomerBookingLookupIntent(text: string): boolean {
  return Boolean(extractCustomerBookingRef(text));
}

export function isCustomerPaymentsIntent(text: string): boolean {
  const t = norm(text);
  if (isCustomerForbiddenIntent(t)) return false;
  return /\b(my (payment|payments|transactions?|receipt|invoice|invoices)|how much (have i|did i) paid?|how much do i (still )?(need to |owe|have (left )?to )?pay|remaining (balance|payment)|payment (history|status|failed)|i was charged|paymant|paymnt)\b/i.test(
    t,
  );
}

export function isCustomerAccountIntent(text: string): boolean {
  const t = norm(text);
  return /\b(my (profile|account|email|phone)|what (email|phone|information) (is on|do you have)|change my (email|phone|name|password)|update my profile|forgot my password|reset my password|log out|delete my account)\b/i.test(
    t,
  );
}

export function isCustomerSupportInboxIntent(text: string): boolean {
  const t = norm(text);
  return /\b(my support (requests?|tickets?)|show (me )?(my )?support|status of my support|reply to support)\b/i.test(
    t,
  );
}

export function isCustomerCancelIntent(text: string): boolean {
  const t = norm(text);
  return /\b(cancel (my )?.{0,32}(booking|ticket|table|reservation)|i want to cancel|can i cancel my)\b/i.test(
    t,
  );
}

export function isCustomerChangeIntent(text: string): boolean {
  const t = norm(text);
  if (/\b(book an event|which date|what date would|what events)\b/i.test(t)) {
    return false;
  }
  if (extractCustomerBookingRef(t)) {
    return /\b(change|modify|reschedule|add|remove)\b/i.test(t);
  }
  return (
    /\b(change|modify|update|reschedule)\s+(my\s+)?booking\b/i.test(t) ||
    /\b(change the booking date|change my booking date|modify my booking|how do i modify my booking)\b/i.test(
      t,
    ) ||
    (/\b(add another guest|remove a guest|change (my )?(date|table|package|menu|location|time|guests?))\b/i.test(
      t,
    ) &&
      /\b(booking|reservation)\b/i.test(t))
  );
}

export function isCustomerBookingFactIntent(text: string): boolean {
  const t = norm(text);
  if (isCustomerNextBookingIntent(t)) return false;
  return /\b(what (package|food|drinks?|table|date|location|menu) did i|how many people .{0,24}(my )?booking|what'?s my booking (status|reference|confirmation)|show me my (booking )?(confirmation|reference)|where is my (booking )?confirmation|where('?s| is) my ticket|i can'?t find my ticket)\b/i.test(
    t,
  );
}

export function isCustomerRefundIntent(text: string): boolean {
  const t = norm(text);
  return /\b(refund|get my money back|can i get a refund)\b/i.test(t);
}

export function detectCustomerOnDemandQueryType(
  text: string,
): CustomerQueryType | null {
  if (isCustomerForbiddenIntent(text)) return "forbidden";
  if (isCustomerCancelIntent(text)) return "cancel_request";
  if (isCustomerRefundIntent(text)) return "refund_request";
  if (isCustomerChangeIntent(text)) return "change_request";
  if (isCustomerNextBookingIntent(text)) return "my_next_booking";
  if (isCustomerBookingFactIntent(text)) return "my_next_booking";
  if (isCustomerPaymentsIntent(text)) return "my_payments";
  if (isCustomerAccountIntent(text)) return "my_account";
  if (isCustomerSupportInboxIntent(text)) return "my_support";
  if (isCustomerMyBookingsIntent(text)) return "my_bookings";
  if (isCustomerBookingLookupIntent(text)) return "booking_lookup";
  return null;
}

export function isCustomerFollowUpQuery(text: string): boolean {
  const t = norm(text)
    .toLowerCase()
    .replace(/[?.!]+$/, "");
  return (
    /^(what'?s the next one|the next one|and the next|how much did i pay|remaining balance|what'?s the remaining|can i change the date|show details|more details|and the payment)$/i.test(
      t,
    ) || /^(show|see|give me)\s+(all|more|details)$/i.test(t)
  );
}

export function resolveCustomerTopicFromHistory(
  messages: Array<{ role: string; content: string }>,
  followUpText: string,
): CustomerQueryType | null {
  const follow = norm(followUpText).toLowerCase();
  const recent = [...messages].reverse().slice(0, 8);
  for (const m of recent) {
    if (m.role !== "assistant") continue;
    const text = m.content.toLowerCase();
    if (text.includes("/customer/bookings") || text.includes("your bookings")) {
      if (/next/.test(follow)) return "my_next_booking";
      if (/pay|balance|paid/.test(follow)) return "my_payments";
      if (/change|date/.test(follow)) return "change_request";
      return "my_bookings";
    }
    if (text.includes("/customer/transactions") || text.includes("your payments")) {
      return "my_payments";
    }
    if (text.includes("/customer/profile")) return "my_account";
    if (text.includes("/customer/support")) return "my_support";
  }
  return null;
}

function nameBit(userName?: string | null): string {
  return userName?.trim() ? `, ${userName.trim()}` : "";
}

function firstDate(item: BookingItem): string {
  return item.booking_dates?.[0]?.date || item.created_date || "";
}

function isUpcoming(item: BookingItem, now = new Date()): boolean {
  const dates = item.booking_dates ?? [];
  if (dates.length === 0) return !/cancel/i.test(item.status);
  return dates.some((d) => {
    const iso = d.date?.slice(0, 10);
    return Boolean(iso && iso >= formatIso(now) && !/cancel/i.test(d.status));
  });
}

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function listBookings(items: BookingItem[], symbol: string): string {
  return items
    .slice(0, MAX_LIST)
    .map((item) => {
      const when = firstDate(item) || "date TBC";
      const paid = money(item.payment_summary?.total_paid_amount ?? item.total, symbol);
      const pending = item.payment_summary?.total_pending_amount;
      const pendingBit =
        pending != null && Number(pending) > 0
          ? ` · ${money(pending, symbol)} left`
          : "";
      return `- **${item.booking_number}** — ${item.event_name} · ${when} · ${item.status} · ${paid}${pendingBit}`;
    })
    .join("\n");
}

function unwrapBookings(raw: unknown): BookingItem[] {
  if (!raw || typeof raw !== "object") return [];
  const row = raw as { data?: unknown };
  if (Array.isArray(row.data)) return row.data as BookingItem[];
  if (row.data && typeof row.data === "object") {
    const inner = row.data as { data?: unknown };
    if (Array.isArray(inner.data)) return inner.data as BookingItem[];
  }
  return [];
}

async function loadBookings(): Promise<BookingItem[]> {
  const res = await bookingsService.getBookings({ per_page: 20, page: 1 });
  return unwrapBookings(res);
}

function bookingHref(ref: string): string {
  return `/customer/bookings/${encodeURIComponent(ref)}`;
}

export function buildCustomerLoginReply(userName?: string | null): string {
  return `I can only show your bookings, payments, and account after you log in${nameBit(userName)}.\n\n[Log in](/auth/login) · [Create account](/auth/register/customer)`;
}

export function buildCustomerForbiddenReply(userName?: string | null): string {
  return `I can only access information related to **your** account and bookings${nameBit(userName)}. I can’t show other customers’ details, venue revenue, or staff dashboards.\n\nI can help with your bookings, a payment, or finding an event.`;
}

function emptyBookingsReply(userName?: string | null): string {
  return `You don’t have any bookings yet${nameBit(userName)}. When you book an event, it will show here.\n\n[Open Bookings](/customer/bookings)`;
}

export async function fetchCustomerOnDemandChatReply(options: {
  userText: string;
  userName?: string | null;
  queryType: CustomerQueryType;
  currencySymbol?: string | null;
}): Promise<{ reply: string } | null> {
  const { userText, userName, queryType } = options;
  const symbol = options.currencySymbol?.trim() || DEFAULT_CURRENCY_SYMBOL;
  const greet = nameBit(userName);
  const refFromText = extractCustomerBookingRef(userText);

  if (queryType === "forbidden") {
    return { reply: buildCustomerForbiddenReply(userName) };
  }

  try {
    if (queryType === "my_account") {
      const profile = await fetchProfileData();
      const data = profile?.data;
      if (!data) {
        return {
          reply: `I couldn’t load your profile just now${greet}. You can update it here: [Open Profile](/customer/profile)`,
        };
      }
      if (/\bdelete my account\b/i.test(norm(userText))) {
        return {
          reply: `I can’t delete your account from chat${greet}. Open [Profile](/customer/profile) if you want to update details, or [start a support enquiry](/customer/support/new) if you want the venue to close the account.`,
        };
      }
      if (/\b(password|forgot|reset|log out)\b/i.test(norm(userText))) {
        return {
          reply: `I can’t change passwords or log you out from chat${greet}. Use [Open Profile](/customer/profile) to update your password, or [Log in](/auth/login) if you’ve forgotten it.`,
        };
      }
      const phone = data.phone?.trim() || "not set";
      return {
        reply: `Here’s what’s on your account${greet}:\n- **Name:** ${data.full_name || `${data.first_name} ${data.last_name}`.trim()}\n- **Email:** ${data.email}\n- **Phone:** ${phone}\n\nTo change these, use [Open Profile](/customer/profile). I won’t ask you to type a password here.`,
      };
    }

    if (queryType === "my_support") {
      const tickets = await customerSupportService.getTickets({ sort: "newest" });
      const rows = tickets?.data ?? [];
      if (!rows.length) {
        return {
          reply: `You don’t have any support requests yet${greet}.\n\n[New enquiry](/customer/support/new) · [Open Support](/customer/support)`,
        };
      }
      const lines = rows
        .slice(0, MAX_LIST)
        .map(
          (ticket) =>
            `- **${ticket.ticket_key}** — ${ticket.subject} · ${ticket.status_label}`,
        )
        .join("\n");
      return {
        reply: `Here are your support requests${greet}:\n\n${lines}\n\n[Open Support](/customer/support) · [New enquiry](/customer/support/new)`,
      };
    }

    if (queryType === "my_payments") {
      const [bookings, tx] = await Promise.all([
        loadBookings(),
        fetchCustomerTransactions({ page: 1, limit: 5 }).catch(() => null),
      ]);
      if (refFromText) {
        const detail = await bookingsService.getBookingDetails(refFromText);
        const data = detail?.data;
        if (!data) {
          return {
            reply: `I couldn’t find **${refFromText}** on your account${greet}. I can only open bookings that belong to you.\n\n[Open Bookings](/customer/bookings)`,
          };
        }
        const paid = money(
          data.payment_summary?.total_paid_amount ?? data.payment_summary?.paid_amount,
          symbol,
        );
        const pending = money(
          data.payment_summary?.total_pending_amount ??
          data.payment_summary?.pending_amount,
          symbol,
        );
        return {
          reply: `**${data.booking_number || refFromText}** — ${data.event_name}${greet}\n- Paid: **${paid}**\n- Remaining: **${pending}**\n- Status: ${data.payment_status_label || data.status || "—"}\n\n[Open booking](${bookingHref(data.booking_number || refFromText)}) · [Open Transactions](/customer/transactions)`,
        };
      }
      const owing = bookings.filter(
        (item) => Number(item.payment_summary?.total_pending_amount ?? 0) > 0,
      );
      const txLines = (tx?.data ?? [])
        .slice(0, 5)
        .map((row) => {
          const amount = money(row.amount, symbol);
          const label = row.description?.trim() || row.status || "Payment";
          return `- ${label} · ${amount}`;
        })
        .join("\n");
      const owingBit = owing.length
        ? `\nBookings with a balance:\n${listBookings(owing, symbol)}`
        : "\nYou don’t have a remaining balance on the bookings I can see.";
      return {
        reply: `Here’s your payment picture${greet}.${owingBit}${txLines ? `\n\nRecent transactions:\n${txLines}` : ""
          }\n\n[Open Transactions](/customer/transactions) · [Open Bookings](/customer/bookings)`,
      };
    }

    const bookings = await loadBookings();

    if (queryType === "booking_lookup" && refFromText) {
      const detail = await bookingsService.getBookingDetails(refFromText);
      const data = detail?.data;
      if (!data) {
        return {
          reply: `I couldn’t find **${refFromText}** on your account${greet}. I can only open bookings that belong to you.\n\n[Open Bookings](/customer/bookings)`,
        };
      }
      return { reply: formatBookingDetail(data, greet, symbol) };
    }

    if (queryType === "my_next_booking") {
      const upcoming = bookings
        .filter((item) => isUpcoming(item))
        .sort((a, b) => firstDate(a).localeCompare(firstDate(b)));
      const next = upcoming[0];
      if (!next) {
        return {
          reply: `You don’t have an upcoming booking${greet}.\n\n[Open Bookings](/customer/bookings)`,
        };
      }
      const detail = await bookingsService
        .getBookingDetails(next.booking_number)
        .catch(() => null);
      if (detail?.data) {
        return { reply: formatBookingDetail(detail.data, greet, symbol) };
      }
      return {
        reply: `Your next booking${greet} is **${next.booking_number}** — ${next.event_name} on ${firstDate(next)}.\n\n[Open booking](${bookingHref(next.booking_number)})`,
      };
    }

    if (queryType === "cancel_request") {
      const target =
        refFromText ||
        bookings.find((item) => isUpcoming(item))?.booking_number ||
        bookings[0]?.booking_number;
      if (!target) {
        return { reply: emptyBookingsReply(userName) };
      }
      const match = bookings.find((item) => item.booking_number === target);
      return {
        reply: `I found **${target}**${match ? ` for **${match.event_name}**` : ""}${greet}. I can’t cancel a booking from chat.\n\nOpen the booking to cancel if the venue allows it, or start a support enquiry and I’ll let the team handle it.\n\n[Open booking](${bookingHref(target)}) · [New enquiry](/customer/support/new)`,
      };
    }

    if (queryType === "change_request") {
      const target =
        refFromText ||
        bookings.find((item) => isUpcoming(item))?.booking_number;
      if (!target) {
        return { reply: emptyBookingsReply(userName) };
      }
      return {
        reply: `I can help you request a change to **${target}**${greet}, but I can’t edit the booking from chat.\n\nUse **Reschedule** or **Add extras for this date** on the booking page if those options are shown. After a booking exists you can’t add or change rooms — that needs a new booking.\n\n[Open booking](${bookingHref(target)}) · [Open Bookings](/customer/bookings)`,
      };
    }

    if (queryType === "refund_request") {
      const target = refFromText || bookings[0]?.booking_number;
      return {
        reply: `I can’t issue a refund from chat${greet}. Refunds follow the venue’s cancellation policy.\n\n${target
            ? `If this is about **${target}**, open the booking or start an enquiry.\n\n[Open booking](${bookingHref(target)}) · `
            : ""
          }[New enquiry](/customer/support/new)`,
      };
    }

    if (queryType === "my_bookings") {
      if (!bookings.length) return { reply: emptyBookingsReply(userName) };
      const t = norm(userText);
      const filtered = /\bpast\b/i.test(t)
        ? bookings.filter((item) => !isUpcoming(item))
        : /\bupcoming\b/i.test(t)
          ? bookings.filter((item) => isUpcoming(item))
          : bookings;
      if (!filtered.length) {
        return {
          reply: /\bpast\b/i.test(t)
            ? `You don’t have any past bookings${greet}.\n\n[Open Bookings](/customer/bookings)`
            : `You don’t have any upcoming bookings${greet}.\n\n[Open Bookings](/customer/bookings)`,
        };
      }
      const more =
        filtered.length > MAX_LIST
          ? `\nShowing ${MAX_LIST} of ${filtered.length}.`
          : "";
      return {
        reply: `Here are your bookings${greet}:${more}\n\n${listBookings(filtered, symbol)}\n\n[Open Bookings](/customer/bookings)`,
      };
    }
  } catch (error) {
    console.error("Customer on-demand chat failed:", error);
    return {
      reply: `I couldn’t load that just now${greet}. Please try again in a moment, or open [Bookings](/customer/bookings).`,
    };
  }

  return null;
}

function formatBookingDetail(
  data: BookingDetailsData,
  greet: string,
  symbol: string,
): string {
  const ref = data.booking_number || String(data.booking_id);
  const dates = (data.dates ?? [])
    .slice(0, 4)
    .map((d) => {
      const room = d.room_name ? ` · ${d.room_name}` : "";
      return `${d.date_label || d.date_key}${room}`;
    })
    .join("; ");
  const paid = money(
    data.payment_summary?.total_paid_amount ?? data.payment_summary?.paid_amount,
    symbol,
  );
  const pending = money(
    data.payment_summary?.total_pending_amount ??
    data.payment_summary?.pending_amount,
    symbol,
  );
  const firstDateRow = data.dates?.[0];
  const packages = [
    firstDateRow?.package_title,
    ...(firstDateRow?.packages ?? []).map((item) => item.name),
  ]
    .filter((name): name is string => Boolean(name?.trim()))
    .filter((name, index, all) => all.indexOf(name) === index);
  const tables = (firstDateRow?.tables ?? [])
    .map((item) => item.name)
    .filter(Boolean);
  const extras = [
    packages.length ? `- Package: ${packages.join(", ")}` : "",
    tables.length ? `- Table: ${tables.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `**${ref}** — ${data.event_name}${greet}
- Location: ${data.location || "—"}
- Dates: ${dates || "—"}
- Status: ${data.status || data.payment_status_label || "—"}
- Paid: **${paid}** · Remaining: **${pending}**
${extras ? `${extras}\n` : ""}
[Open booking](${bookingHref(ref)}) · [Open Bookings](/customer/bookings)`;
}
