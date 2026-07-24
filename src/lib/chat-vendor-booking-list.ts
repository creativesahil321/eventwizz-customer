/**
 * List pending (or filtered) bookings with customer contact for vendor chat.
 * Uses GET /vendor/bookings + GET /vendor/bookings/{id} for phone/email.
 */

import { formatMoneyLocale, parseFormattedMoney } from "@/lib/currency-format";
import {
  vendorBookingsService,
  type VendorBookingItem,
} from "@/services/vendor/bookings/bookings.service";

function money(value: unknown): string {
  const parsed = parseFormattedMoney(String(value ?? ""), "£");
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return formatMoneyLocale(amount, "£");
}

function pendingValue(b: VendorBookingItem): number {
  const n = Number.parseFloat(String(b.pending_amount ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Vendor wants a list of bookings / customer contacts to call. */
export function isVendorBookingListIntent(text: string): boolean {
  const t = text.toLowerCase();
  const wantsList =
    /\b(list|show|give\s+me|which|who|details?)\b/.test(t) &&
    /\b(booking|bookings|customer|customers|pending)\b/.test(t);
  const wantsContact =
    /\b(contact|phone|telephone|mobile|email|call|reach)\b/.test(t);
  return wantsList || wantsContact;
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
  const combined = [params.userText, ...(params.priorUserTexts ?? [])]
    .join(" ")
    .toLowerCase();

  const wantsPending =
    /\b(pending|outstanding|owed|unpaid|balance\s+due)\b/.test(combined) ||
    /\b(that|those|them)\b/.test(params.userText.toLowerCase());

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

  let filtered = items;
  if (wantsPending) {
    filtered = items.filter((b) => pendingValue(b) > 0);
    // If status filter returned empty, fall back to client filter on all
    if (filtered.length === 0 && items.length > 0) {
      filtered = items.filter((b) => pendingValue(b) > 0);
    }
    if (filtered.length === 0) {
      // Status=Partial may have returned only partial page — refetch without status
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

  if (filtered.length === 0) {
    return {
      reply: wantsPending
        ? `${greet}There are no bookings with a pending balance right now.`
        : `${greet}I couldn’t find bookings to list. Open [Bookings](${bookingsHref}) to browse them.`,
      bookingsHref,
    };
  }

  // Cap detail lookups to keep chat fast
  const maxDetail = 12;
  const slice = filtered.slice(0, maxDetail);

  const withContact = await Promise.all(
    slice.map(async (b) => {
      let email: string | null = null;
      let phone: string | null = null;
      try {
        const detail = await vendorBookingsService.getBookingById(b.booking_id);
        email = detail?.data?.user?.email?.trim() || null;
        phone = detail?.data?.user?.phone?.trim() || null;
      } catch {
        /* contact optional */
      }
      return { booking: b, email, phone };
    }),
  );

  const lines = withContact.map(({ booking: b, email, phone }, i) => {
    const pending = money(b.pending_amount);
    const phoneBit = phone ? ` · phone ${phone}` : " · phone not on file";
    const emailBit = email ? ` · ${email}` : "";
    return `${i + 1}. **${b.booking_number}** — ${b.user_name} · ${b.event_name} · pending **${pending}**${phoneBit}${emailBit} · [Open](/vendor/booking-history/${b.booking_id})`;
  });

  const more =
    filtered.length > maxDetail
      ? `\n\nShowing **${maxDetail}** of **${filtered.length}**. See the rest on [Open Bookings](${bookingsHref}).`
      : `\n\nOpen [Bookings](${bookingsHref}) for full history.`;

  const heading = wantsPending
    ? `${greet}Here are **${filtered.length}** booking${filtered.length === 1 ? "" : "s"} with a pending balance, and customer contact where available:`
    : `${greet}Here are **${slice.length}** booking${slice.length === 1 ? "" : "s"} with customer contact where available:`;

  return {
    reply: `${heading}\n\n${lines.join("\n")}${more}`,
    bookingsHref,
  };
}
