/**
 * Format live vendor dashboard + booking-summary data for the chat system prompt.
 * Numbers come from GET /vendor/dashboard and GET /vendor/bookings (summary).
 */

import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subDays,
  startOfYear,
  endOfYear,
} from "date-fns";
import { formatMoneyLocale, parseFormattedMoney } from "@/lib/currency-format";
import { getTenantCurrencySymbol } from "@/lib/tenant-currency";
import { normalizeVendorChatText } from "@/lib/chat-typo-normalizer";

export type VendorChatDashboardSnapshot = {
  current_location_id?: number;
  booking_period?: string | null;
  booking_period_start?: string | null;
  booking_period_end?: string | null;
  summary?: {
    total_events?: number;
    active_events?: number;
    past_events?: number;
    draft_events?: number;
  } | null;
  bookings_stats?: {
    total_bookings?: number;
    total_payment?: number;
    pending_partial_payment?: number;
    received_payment?: number;
  } | null;
  commissions_stats?: {
    total_bookings?: number;
    total_payment?: number;
    pending_partial_payment?: number;
    received_payment?: number;
    total_commission?: number;
    commission_due?: number;
  } | null;
  recent_bookings?: Array<{
    booking_id?: number | string;
    transaction_id?: string | null;
    customer?: string;
    event?: string;
    total?: number;
    balance_due?: number;
    status?: string;
  }> | null;
};

export type VendorChatBookingSummarySnapshot = {
  booking_count?: number;
  total_amount?: string | number;
  deposit_amount?: string | number;
  pending_amount?: string | number;
  refunded_amount?: string | number;
  total_platform_fee?: string | number;
  platform_fee_settled?: string | number;
  platform_fee_due?: string | number;
};

export type VendorChatLiveStats = {
  dashboard?: VendorChatDashboardSnapshot | null;
  bookingSummary?: VendorChatBookingSummarySnapshot | null;
  fetchedAt?: string;
  /** Human label for the range used (e.g. "last month") */
  periodLabel?: string;
};

export type ChatDateRange = {
  from_date: string | null;
  to_date: string | null;
  label: string;
  /** No date filter — matches Booking History summary cards */
  allTime?: boolean;
};

function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function isAllTimePeriod(text: string): boolean {
  const t = text.toLowerCase();
  // Do not treat "year to date" / YTD as all-time
  if (/\byear\s*to\s*date\b|\bytd\b/.test(t)) return false;
  return /\b(overall|all\s*-?\s*time|lifetime|altogether|in\s+total|grand\s+total|till\s+now|until\s+now|ever|entire|complete|full\s+history|not\s+this\s+month|not\s+monthly|across\s+all|everything)\b/.test(
    t,
  );
}

/** Resolve a date range from natural language (UK). Defaults to today. */
export function resolveChatDateRange(
  text: string,
  now: Date = new Date(),
): ChatDateRange {
  const t = normalizeVendorChatText(text).toLowerCase();

  // All-time / overall (Booking History style — no from/to dates)
  if (isAllTimePeriod(t)) {
    return {
      from_date: null,
      to_date: null,
      label: "all time",
      allTime: true,
    };
  }

  if (/\b(last\s+month|previous\s+month|past\s+month)\b/.test(t)) {
    const d = subMonths(now, 1);
    return {
      from_date: ymd(startOfMonth(d)),
      to_date: ymd(endOfMonth(d)),
      label: "last month",
    };
  }

  if (/\b(this\s+month|current\s+month)\b/.test(t)) {
    return {
      from_date: ymd(startOfMonth(now)),
      to_date: ymd(endOfMonth(now)),
      label: "this month",
    };
  }

  if (/\b(last\s+week|previous\s+week|past\s+week)\b/.test(t)) {
    const d = subDays(now, 7);
    return {
      from_date: ymd(startOfWeek(d, { weekStartsOn: 1 })),
      to_date: ymd(endOfWeek(d, { weekStartsOn: 1 })),
      label: "last week",
    };
  }

  if (/\b(this\s+week|current\s+week)\b/.test(t)) {
    return {
      from_date: ymd(startOfWeek(now, { weekStartsOn: 1 })),
      to_date: ymd(endOfWeek(now, { weekStartsOn: 1 })),
      label: "this week",
    };
  }

  if (/\b(last\s*7\s*days?|past\s*7\s*days?)\b/.test(t)) {
    const from = subDays(now, 6);
    return {
      from_date: ymd(from),
      to_date: ymd(now),
      label: "the last 7 days",
    };
  }

  if (/\b(last\s*30\s*days?|past\s*30\s*days?)\b/.test(t)) {
    const from = subDays(now, 29);
    return {
      from_date: ymd(from),
      to_date: ymd(now),
      label: "the last 30 days",
    };
  }

  if (/\b(yesterday)\b/.test(t)) {
    const d = subDays(now, 1);
    return { from_date: ymd(d), to_date: ymd(d), label: "yesterday" };
  }

  if (/\b(today|to\s*day)\b/.test(t)) {
    return { from_date: ymd(now), to_date: ymd(now), label: "today" };
  }

  if (
    /\b(this\s+year|current\s+year|year\s*to\s*date|ytd|yearly|annually|annual)\b/.test(
      t,
    ) &&
    !/\b(last|previous|past)\s+year\b/.test(t)
  ) {
    return {
      from_date: ymd(startOfYear(now)),
      to_date: ymd(endOfYear(now)),
      label: "this year",
    };
  }

  if (/\b(last\s+year|previous\s+year|past\s+year)\b/.test(t)) {
    const d = new Date(now.getFullYear() - 1, 0, 1);
    return {
      from_date: ymd(startOfYear(d)),
      to_date: ymd(endOfYear(d)),
      label: "last year",
    };
  }

  // Booking History card metrics with no period → all time (summary object)
  if (
    isVendorBookingSummaryIntent(t) &&
    !/\b(today|yesterday|week|month|year|days?)\b/.test(t)
  ) {
    return {
      from_date: null,
      to_date: null,
      label: "all time",
      allTime: true,
    };
  }

  // Earnings / performance with no period → this month
  if (isVendorEarningsIntent(t) && !/\b(today|yesterday)\b/.test(t)) {
    return {
      from_date: ymd(startOfMonth(now)),
      to_date: ymd(endOfMonth(now)),
      label: "this month",
    };
  }

  // Bookings / payments with no period → this month
  if (
    !/\b(today|yesterday|event|events)\b/.test(t) &&
    /\b(booking|payment|earn|revenue|sales|pending|commission|refund|deposit|stats?|performance|income|turnover)\b/i.test(
      t,
    )
  ) {
    return {
      from_date: ymd(startOfMonth(now)),
      to_date: ymd(endOfMonth(now)),
      label: "this month",
    };
  }

  return { from_date: ymd(now), to_date: ymd(now), label: "today" };
}

export function isVendorStatsIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return (
    isVendorEarningsIntent(norm) ||
    isVendorBookingSummaryIntent(norm) ||
    isVendorPendingIntent(norm) ||
    isVendorRefundIntent(norm) ||
    isVendorCommissionIntent(norm) ||
    /\b(total\s+events?|active\s+events?|past\s+events?|draft\s+events?|cancelled\s+(events?|bookings?)|how\s+many\s+events?|event\s+count|my\s+events?|total\s+bookings?|booking\s+count|bookings?\s+(today|this|last|total|cost)|how\s+many\s+(bookings?|payments?)|dashboard\s+stats?|my\s+stats?|business\s+stats?|venue\s+stats?|performance|summary|overview\s+stats?|recent\s+bookings?|platform\s+fee|pending\s+balance|pending\s+money|partial-?payment\s+bookings?)\b/i.test(
      norm,
    )
  );
}

export function isVendorEarningsIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  // “how much we refunded” is refunds, not earnings
  if (
    isVendorRefundIntent(norm) ||
    isVendorPendingIntent(norm) ||
    isVendorDepositIntent(norm) ||
    isVendorCommissionIntent(norm)
  ) {
    return false;
  }
  return /\b(earn(ings?|ed)?|revenue|income|sales|ben[ei]fits?|profits?|total\s+payment|received\s+payment|how\s+much\s+(did\s+i|have\s+i|was|we|have\s+we)|money\s+(made|earned)|turnover|made\s+(this|last|in)|takings?|cash\s+taken)\b/i.test(
    norm,
  );
}

export function isVendorPendingIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return /\b(pending\s+(payment|amount|balance|money)|(money|amount|balance|payment)\s+(?:is\s+)?(?:currently\s+)?pending|balance\s+due|outstanding|owed|still\s+to\s+(pay|collect)|unpaid)\b/i.test(
    norm,
  );
}

export function isVendorCommissionIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return /\b(commission|platform\s+fee|fees?\s+due|fee\s+settled)\b/i.test(
    norm,
  );
}

export function isVendorRefundIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return /\b(refunds?|refunded|refund)\b/i.test(norm);
}

export function isVendorDepositIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return /\b(deposits?|deposit\s+amount|total\s+deposit)\b/i.test(norm);
}

/** Booking History summary cards (total / deposit / pending / refund / fees). */
export function isVendorBookingSummaryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return (
    isVendorRefundIntent(norm) ||
    isVendorPendingIntent(norm) ||
    isVendorDepositIntent(norm) ||
    isVendorCommissionIntent(norm) ||
    /\b(total\s+amount|booking\s+summary|bookings?\s+summary|how\s+much\s+(in\s+)?total|grand\s+total)\b/i.test(
      norm,
    )
  );
}

function n(value: unknown): string {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

function money(value: unknown): string {
  const symbol = getTenantCurrencySymbol();
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatMoneyLocale(value, symbol);
  }
  const parsed = parseFormattedMoney(String(value ?? ""), symbol);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return formatMoneyLocale(amount, symbol);
}

/**
 * Deterministic short reply for earnings/stats so we never tell the vendor
 * to “open Dashboard and change the date filter” when we already have numbers.
 */
export function buildVendorStatsDirectReply(params: {
  userText: string;
  stats: VendorChatLiveStats;
  userName?: string | null;
}): string | null {
  const { userText, stats, userName } = params;
  if (!stats.dashboard && !stats.bookingSummary) return null;

  const period = stats.periodLabel || "this period";
  const b = stats.dashboard?.bookings_stats;
  const c = stats.dashboard?.commissions_stats;
  const s = stats.dashboard?.summary;
  const summary = stats.bookingSummary;
  const recent = stats.dashboard?.recent_bookings ?? [];
  const greet = userName?.trim() ? `Hello, ${userName.trim()}. ` : "";
  const t = userText.toLowerCase();

  // Prefer Booking History `summary` (same cards as /vendor/booking-history)
  const totalAmount = money(summary?.total_amount ?? b?.total_payment ?? 0);
  const pending = money(
    summary?.pending_amount ?? b?.pending_partial_payment ?? 0,
  );
  const bookingCountNum = Number(
    summary?.booking_count ?? b?.total_bookings ?? 0,
  );
  const bookingCount = n(bookingCountNum);
  const bookingLabel = bookingCountNum === 1 ? "booking" : "bookings";
  const deposit = money(summary?.deposit_amount ?? 0);
  const refunded = money(summary?.refunded_amount ?? 0);
  const platformFee = money(summary?.total_platform_fee ?? 0);
  const platformDue = money(
    summary?.platform_fee_due ?? c?.commission_due ?? 0,
  );
  const platformSettled = money(summary?.platform_fee_settled ?? 0);
  const received = money(
    b?.received_payment ?? summary?.total_amount ?? b?.total_payment ?? 0,
  );
  const totalPayment = totalAmount;

  if (isVendorRefundIntent(userText)) {
    return `${greet}The total refunded amount for **${period}** is **${refunded}**.`;
  }

  if (isVendorDepositIntent(userText)) {
    return `${greet}The total deposit for **${period}** is **${deposit}** across **${bookingCount}** ${bookingLabel}.`;
  }

  if (isVendorPendingIntent(userText)) {
    return `${greet}The pending amount for **${period}** is **${pending}** across **${bookingCount}** ${bookingLabel}.`;
  }

  if (isVendorCommissionIntent(userText)) {
    return `${greet}Platform fees for **${period}**: total **${platformFee}**, due **${platformDue}**, settled **${platformSettled}**.`;
  }

  if (/\b(total\s+amount|how\s+much\s+(in\s+)?total|grand\s+total|booking\s+summary)\b/.test(t)) {
    return `${greet}Booking totals for **${period}**: total **${totalAmount}**, deposit **${deposit}**, pending **${pending}**, refunded **${refunded}**, platform fee **${platformFee}**.`;
  }

  if (/\b(recent\s+bookings?|latest\s+bookings?)\b/.test(t)) {
    if (recent.length === 0) {
      return `${greet}There are no recent bookings to show for the current location.`;
    }
    const lines = recent.slice(0, 5).map((r, i) => {
      const total = money(r.total ?? 0);
      return `${i + 1}. **${r.customer ?? "Customer"}** · ${r.event ?? "Event"} · **${total}** · ${r.status ?? "—"}`;
    });
    return `${greet}Recent bookings:\n${lines.join("\n")}`;
  }

  if (
    /\b(active\s+events?|how\s+many\s+active)\b/.test(t) ||
    (/\bactive\b/.test(t) && /\bevents?\b/.test(t))
  ) {
    return `${greet}You have **${n(s?.active_events)}** active events (**${n(s?.total_events)}** total).`;
  }

  if (/\b(past\s+events?|old\s+events?)\b/.test(t)) {
    return `${greet}You have **${n(s?.past_events)}** past events (**${n(s?.total_events)}** total).`;
  }

  if (/\b(draft\s+events?)\b/.test(t)) {
    return `${greet}You have **${n(s?.draft_events)}** draft events.`;
  }

  if (
    /\b(total\s+events?|how\s+many\s+events?|event\s+count|my\s+events?)\b/.test(
      t,
    ) ||
    (/\bevents?\b/.test(t) && !/\bbookings?\b/.test(t))
  ) {
    return `${greet}You have **${n(s?.total_events)}** events in total (**${n(s?.active_events)}** active, **${n(s?.past_events)}** past, **${n(s?.draft_events)}** draft).`;
  }

  if (isVendorEarningsIntent(userText)) {
    return `${greet}Your earnings for **${period}** were **${received}** (received). Total payment **${totalPayment}**, with **${pending}** pending.`;
  }

  if (/\b(booking|bookings)\b/.test(t)) {
    return `${greet}You had **${bookingCount}** ${bookingLabel} in **${period}**, totalling **${totalPayment}** (**${pending}** pending).`;
  }

  return `${greet}For **${period}**: **${bookingCount}** ${bookingLabel}, **${received}** received, **${pending}** pending.`;
}

/** Compact prompt block — only include when vendor is logged in and data was fetched. */
export function buildVendorLiveStatsPromptBlock(
  stats: VendorChatLiveStats | null | undefined,
): string {
  if (!stats?.dashboard && !stats?.bookingSummary) return "";

  const d = stats.dashboard;
  const s = d?.summary;
  const b = d?.bookings_stats;
  const c = d?.commissions_stats;
  const summary = stats.bookingSummary;

  const recent = (d?.recent_bookings ?? []).slice(0, 5);
  const recentLines =
    recent.length === 0
      ? "- Recent bookings: none"
      : recent
          .map(
            (r, i) =>
              `- Recent #${i + 1}: ${r.customer ?? "Customer"} · ${r.event ?? "Event"} · total ${n(r.total)} · balance due ${n(r.balance_due)} · ${r.status ?? "—"}${r.transaction_id ? ` · txn ${r.transaction_id}` : ""}`,
          )
          .join("\n");

  const periodLabel =
    stats.periodLabel ||
    d?.booking_period ||
    (d?.booking_period_start
      ? `${d.booking_period_start} → ${d.booking_period_end ?? ""}`
      : "current filter");

  const earningsHint = n(
    b?.received_payment ?? b?.total_payment ?? summary?.total_amount ?? 0,
  );
  const pendingHint = n(
    b?.pending_partial_payment ?? summary?.pending_amount ?? 0,
  );

  return `
LIVE VENDOR STATS (MUST FOLLOW — authoritative for this session; do not invent numbers):
Fetched at: ${stats.fetchedAt ?? "now"}. Period: **${periodLabel}** (${d?.booking_period_start ?? "?"} → ${d?.booking_period_end ?? "?"}). Scope: current venue location${d?.current_location_id != null ? ` (id ${d.current_location_id})` : ""}.

CRITICAL ANSWER RULES:
- You already have the numbers below for **${periodLabel}**. Answer with those figures in 1–2 sentences.
- FORBIDDEN: saying stats are “only for today/current period”, telling them to open Dashboard/Transactions, or asking them to change a date filter.
- FORBIDDEN: markdown links to Dashboard, Transactions, or Bookings as a substitute for the number.
- Preferred earnings figure for ${periodLabel}: **${earningsHint}** (pending: **${pendingHint}**).
- Bold every count/amount with markdown (**16**, **1050**).

### Dashboard (${periodLabel})
- Events: total ${n(s?.total_events)}, active ${n(s?.active_events)}, past ${n(s?.past_events)}, draft ${n(s?.draft_events)}
- Bookings: total bookings ${n(b?.total_bookings)}, total payment ${n(b?.total_payment)}, pending/partial ${n(b?.pending_partial_payment)}, received ${n(b?.received_payment)}
- Commissions: total ${n(c?.total_payment ?? c?.total_commission)}, pending ${n(c?.pending_partial_payment ?? c?.commission_due)}, received ${n(c?.received_payment)}
${recentLines}

### Bookings list summary (${periodLabel})
- Bookings listed (meta total): ${n(summary?.booking_count)}
- Total amount: ${n(summary?.total_amount)}
- Deposit amount: ${n(summary?.deposit_amount)}
- Pending amount: ${n(summary?.pending_amount)}
- Refunded amount: ${n(summary?.refunded_amount)}
- Platform fee total: ${n(summary?.total_platform_fee)}, settled ${n(summary?.platform_fee_settled)}, due ${n(summary?.platform_fee_due)}

Speak in plain UK English. Give the number first. Do not send them elsewhere for this answer.
`.trim();
}
