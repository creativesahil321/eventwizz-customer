/**
 * Vendor Dashboard On-Demand Live Queries for Chatbot
 *
 * Intent detection and live API fetching for vendor dashboard queries.
 * Only called when the vendor explicitly asks — never on render or idle.
 *
 * Supported query types:
 * - Specific Booking Lookup (e.g., VE-026, #VE-026, Sahil's booking)
 * - Specific Payment / Stripe Lookup (e.g., pi_3UAjo1BVFjH8Z4zV1cVA7Ns2, ch_...)
 * - Customers (e.g., "we have any customer name of sahil")
 * - Staff & Roles (e.g., "how much staff we have currently")
 * - Menu Choices
 * - Coupons / Discounts
 * - Locations
 * - Transactions & Ledger
 */

import { customersService } from "@/services/vendor/customers/customers.service";
import { menuChoicesService } from "@/services/vendor/menu_choices/menu_choices.service";
import { discountsService } from "@/services/vendor/discounts/discounts.service";
import { locationService } from "@/services/vendor/locations/locations.service";
import { staffManagementService } from "@/services/common/staff-management/staff-management.service";
import { manageRolesService } from "@/services/common/manage-roles/manage-roles.service";
import { fetchVendorTransactions } from "@/services/vendor/transactions/transactions.service";
import { vendorBookingsService } from "@/services/vendor/bookings/bookings.service";
import { roomService } from "@/services/vendor/onboarding/room.service";
import { normalizeVendorChatText } from "@/lib/chat-typo-normalizer";
import type { Discount } from "@/app/(protected)/vendor/discounts/_lib/types";

/* ------------------------------------------------------------------ */
/*  Intent detection                                                   */
/* ------------------------------------------------------------------ */

/**
 * Matches specific booking numbers (e.g. VE-026, EV-007, #VE-026, BK-101)
 * or natural language requests like "show me this booking VE-026" / "check booking for Sahil"
 */
export function isVendorBookingLookupIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);

  // If asking for a list of bookings or temporal/recent bookings without an explicit code,
  // let booking list intent handle it.
  if (
    /\b(list|all|recent|who\s+booked|today'?s?|yesterday'?s?)\b/i.test(norm) &&
    !/\b(VE|EV|BK|WB|BW|[A-Z]{2,4})-\d+\b/i.test(norm)
  ) {
    return false;
  }

  // If asking about a room or room bookings, let room intent handle it
  if (/\b(room|rooms|hall|halls|suite|suites)\b/i.test(norm)) {
    return false;
  }

  // Direct booking reference pattern like VE-026, EV-007, BK-104
  if (/\b(VE|EV|BK|WB|BW|[A-Z]{2,4})-\d+\b/i.test(norm)) {
    return true;
  }

  // Phrasing: "booking #123", "booking # 45"
  if (/\bbooking\s*#\s*\d+\b/i.test(norm)) {
    return true;
  }

  // "details of booking VE-..." or "status of booking VE-..."
  if (
    /\b(check|status\s+of|details?\s+of)\s+(this\s+|the\s+)?booking\s*(?:#?[A-Za-z0-9-]+)\b/i.test(
      norm
    ) &&
    /\b(VE|EV|BK|WB|BW|[A-Z]{2,4})-\d+\b/i.test(norm)
  ) {
    return true;
  }

  return false;
}

/**
 * Matches Stripe Payment Intent IDs (pi_...), Charge IDs (ch_...), Invoice IDs (in_...),
 * or queries asking to check transactions with customer/booking details.
 */
export function isVendorPaymentLookupIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);

  // Stripe Payment Intent ID or Charge ID
  if (/\b(pi_[a-zA-Z0-9_]{10,}|ch_[a-zA-Z0-9_]{10,}|in_[a-zA-Z0-9_]{10,})\b/.test(norm)) {
    return true;
  }

  // Cross-transaction with customer or payment: "check the transaction of Sahil 15 of this month check its booking how much they pay and how much pending"
  if (
    /\btransaction\b/i.test(norm) &&
    (/\b(of|for|by)\s+[A-Za-z]+\b/i.test(norm) ||
     /\b(how\s+much\s+(they|he|she)?\s*(pay|paid)|pending)\b/i.test(norm) ||
     /\bbooking\b/i.test(norm))
  ) {
    return true;
  }

  return false;
}

export function isVendorCustomerQueryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);

  // Exclude menu queries (they go to menu_choices)
  if (/\b(menu|meal|dish|food|dietary)\b/i.test(norm)) {
    return false;
  }

  // If asking about rooms or room-specific customers/bookings (e.g. "How many customers booked rooms?"),
  // let room intent handle it
  if (/\b(room|rooms|hall|halls|suite|suites|space|spaces|oaksmith|snowbell)\b/i.test(norm)) {
    return false;
  }

  // Asking about a specific person's profile, email, phone, or spend:
  // e.g. "Give me details for Russel Hackett", "What is Russel Hackett's email?", "What is Russel Hackett's phone number?"
  // "How much has Vikrant Mankotia spent?"
  if (
    /\b(?:details?\s+(?:for|of)|email\s+(?:of|for)|phone\s+(?:of|for|number)|how\s+much\s+has)\s+([A-Za-z'-]+(?:\s+[A-Za-z'-]+)?)/i.test(
      norm
    ) &&
    !/\b(booking|pi_|ch_|in_|SUM\d+|DINO\d+|VE-|EV-|BK-)\b/i.test(norm)
  ) {
    return true;
  }

  // "What is [Person]'s email/phone", "[Person]'s spend/bookings", "When was [Person]'s last booking?"
  const personPossessiveMatch = text.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:'s|\s+has)\s+(?:email|phone|contact|spend|spent|(?:last\s+|first\s+|recent\s+)?bookings?)\b/
  );
  if (personPossessiveMatch?.[1]) {
    const candidate = personPossessiveMatch[1].trim().toLowerCase();
    if (
      !/^(today|yesterday|tomorrow|this|last|next|week|month|year|here|now)$/i.test(
        candidate
      )
    ) {
      return true;
    }
  }

  // "Show me all bookings made by Vikrant Mankotia"
  if (
    /\b(?:made\s+by|booked\s+by|spent\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i.test(
      text
    )
  ) {
    return true;
  }

  return (
    /\b(customer|client|attendee|guest)s?\b/i.test(norm) &&
    (/\b(detail|details|info|list|data|record|records|show|email|phone|name|who|any|have|exist|check|find|search|profile|contact|look\s*up|registered|register|count|total|how\s+many|how\s+much|number\s+of|active|inactive|all)\b/i.test(
      norm
    ) ||
      /\b(do\s+we\s+have|we\s+have\s+any|is\s+there|name\s+of|named)\b/i.test(norm))
  );
}

export function isVendorMenuChoiceQueryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return /\b(menu\s*(choice|selection|preference|item)s?|meal\s*(choice|selection|preference)s?|dish\s*(selection|choice)s?|dietary|food\s*(choice|selection|preference)s?)\b/i.test(
    norm
  );
}

const PLATFORM_PRODUCT_QUESTION =
  /\b(features?|eventwizz|platform|what can|how does|product)\b/i;

const PROMO_NOUN =
  /\b(coupon|coupons|discount|discounts|promo|promos|promotion|promotions|voucher|vouchers)\b/i;

/** "special offer" / "our offers" — not the verb in "what does EventWizz offer". */
const PROMO_OFFER_NOUN =
  /\b((special|current|active|our|my|the)\s+offers?|offer\s+codes?)\b/i;

export function isVendorCouponQueryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);

  if (PLATFORM_PRODUCT_QUESTION.test(norm) && !PROMO_NOUN.test(norm)) {
    return false;
  }

  // Standalone code query like "Give me details for SUM30", "Is SUM30 active?", "When does SUM30 expire?"
  if (
    /\b([A-Z]{2,8}\d{1,4})\b/i.test(norm) &&
    /\b(active|expire|expired|expires|detail|details|code|discount|off|status)\b/i.test(
      norm
    ) &&
    !/\b(VE|EV|BK|WB|BW)-\d+\b/i.test(norm)
  ) {
    return true;
  }

  if (!PROMO_NOUN.test(norm) && !PROMO_OFFER_NOUN.test(norm)) {
    return false;
  }

  return (
    /\b(code|detail|details|list|active|inactive|expired|info|status|show|how\s+many|how\s+much|get|give|find|running|current|currently|valid|highest|best|sum\d+|dino\d+|what|which|are\s+there|do\s+we\s+have|running\s+right\s+now|offering)\b/i.test(
      norm
    )
  );
}

export function isVendorRoomQueryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return (
    (/\b(room|rooms|hall|halls|suite|suites|space|spaces|oaksmith|snowbell)\b/i.test(norm) &&
      (/\b(how\s+many|show|list|all|detail|details|info|booked|booking|bookings|occupancy|available|which|what|most\s+booked|highest\s+booking|customer|customers)\b/i.test(
        norm
      ) ||
        /\b(which\s+room|each\s+room|available\s+rooms|room\s+occupancy|room\s+system|booked\s+rooms?)\b/i.test(
          norm
        ))) &&
    !/\b(chat\s*room|clean\s*room)\b/i.test(norm)
  );
}

export function isVendorLocationQueryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return (
    /\b(venue\s*location|event\s*location|location)\s*(detail|info|list|show|status|address)?|\b(show|list|get)\s*(me\s+)?(location|venue\s*location)/i.test(
      norm
    ) && !/\b(book|ticket|event\s+at)\b/i.test(norm) // Avoid matching booking-related queries
  );
}

export function isVendorStaffRoleQueryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return (
    /\b(staff|team\s*member|employee|role)s?\b/i.test(norm) &&
    (/\b(detail|info|list|show|management|member|how\s+many|how\s+much|currently|count|roster|who\s+is|who\s+are)\b/i.test(
      norm
    ) ||
      /\bwho\s+(is|are)\s+(on\s+)?(my\s+|our\s+)?(staff|team)\b/i.test(norm) ||
      /\b(how\s+much|how\s+many)\s+(staff|employees?|team\s*members?)\b/i.test(norm))
  );
}

export function isVendorTransactionQueryIntent(text: string): boolean {
  const norm = normalizeVendorChatText(text);
  return (
    /\b(transaction|payment)\s*(detail|history|list|record|show|recent|status|info)?|\b(show|list|get)\s*(me\s+)?(transaction|payment)|recent\s+(transaction|payment)/i.test(
      norm
    ) &&
    // Avoid matching when user is asking about aggregate earnings/stats (those go to the vendor stats flow)
    !/\b(revenue|earning|commission|total|how\s+much|how\s+many|count|number\s+of|refund|deposit|booking|bookings)\b/i.test(norm)
  );
}

/**
 * Master check: returns the matched query type, or null if none match.
 */
export function detectVendorOnDemandQueryType(text: string): VendorQueryType | null {
  if (isVendorPaymentLookupIntent(text)) return "payment_lookup";
  if (isVendorBookingLookupIntent(text)) return "booking_lookup";
  if (isVendorMenuChoiceQueryIntent(text)) return "menu_choices";
  if (isVendorCustomerQueryIntent(text)) return "customers";
  if (isVendorRoomQueryIntent(text)) return "rooms";
  if (isVendorCouponQueryIntent(text)) return "coupons";
  if (isVendorStaffRoleQueryIntent(text)) return "staff_roles";
  if (isVendorLocationQueryIntent(text)) return "locations";
  if (isVendorTransactionQueryIntent(text)) return "transactions";
  return null;
}

export type VendorQueryType =
  | "booking_lookup"
  | "payment_lookup"
  | "customers"
  | "menu_choices"
  | "coupons"
  | "locations"
  | "staff_roles"
  | "transactions"
  | "rooms";

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function fmt(value: number | string | undefined | null, prefix = "$"): string {
  if (value == null) return `${prefix}0.00`;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `${prefix}0.00`;
  return `${prefix}${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Extract a search term from the user text if they're looking for something specific.
 * e.g. "show me customer John" → "John"
 * e.g. "hy we have any custoemr name of sahil ?" → "sahil"
 */
export function extractSearchTerm(text: string): string | undefined {
  const norm = normalizeVendorChatText(text);

  // Helper to check if a candidate string is an attribute, metric, or filler keyword
  const isExcludedTerm = (s: string): boolean => {
    const clean = s.trim().toLowerCase().replace(/[?.!]$/, "");
    if (!clean || clean.length < 2) return true;

    // Exact stop words / filler / commands
    if (
      /^(all|any|a|an|the|detail|details|info|information|list|data|record|records|status|active|inactive|this|that|these|those|who|what|where|how|how\s+many|how\s+much|why|give|show|check|find|search|profile|directory|history|help)$/i.test(
        clean
      )
    ) {
      return true;
    }

    // Property / attribute phrases (e.g. "contact number", "s contact number", "phone", "email")
    if (
      /\b(contact|phone|telephone|mobile|number|numbers|email|emails|address|addresses|balance|due|owed|paid|pending|unpaid|registered|guest|customer|client|attendee)\b/i.test(
        clean
      )
    ) {
      const stripped = clean
        .replace(
          /\b(s|the|a|an|me|our|my|their|his|her|all|and|also|or|of|for|in|with|about|to)\b/gi,
          ""
        )
        .replace(
          /\b(contact|phone|telephone|mobile|number|numbers|email|emails|address|addresses|balance|due|owed|paid|pending|unpaid|status|active|inactive|count|list|directory)\b/gi,
          ""
        )
        .trim();
      if (!stripped || stripped.length < 2) {
        return true;
      }
    }

    return false;
  };

  // Pattern 1: "name of sahil" / "named sahil" / "called sahil"
  const nameMatch = norm.match(
    /\b(?:name\s+of|named|called)\s+([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+)?)/i
  );
  if (nameMatch?.[1]) {
    const candidate = nameMatch[1].replace(/[?.!]$/, "").trim();
    if (!isExcludedTerm(candidate)) {
      return candidate;
    }
  }

  // Pattern 2: "details for Russel Hackett", "details for SUM30", "bookings made by Vikrant Mankotia", "spent by Vikrant Mankotia"
  const personActionMatch = norm.match(
    /\b(?:details?\s+(?:for|of)|bookings?\s+(?:made\s+by|for|of)|spent\s+by|email\s+(?:for|of)|phone\s+(?:for|of))\s+([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+)?)/i
  );
  if (personActionMatch?.[1]) {
    const candidate = personActionMatch[1].replace(/[?.!]$/, "").trim();
    if (!isExcludedTerm(candidate)) {
      return candidate;
    }
  }

  // Pattern 3: Specific Coupon code pattern e.g. SUM30, DINO76
  const couponMatch = norm.match(/\b(?:coupon|discount|code)?\s*([A-Za-z]{2,8}\d{1,4})\b/i);
  if (couponMatch?.[1]) {
    const candidate = couponMatch[1].toUpperCase();
    if (!isExcludedTerm(candidate)) {
      return candidate;
    }
  }

  // Pattern 4: "customer Sahil" / "customer John Smith"
  const custDirectMatch = norm.match(
    /\b(?:customer|client|attendee|guest)\s+([A-Za-z0-9'-]+(?:\s+[A-Za-z0-9'-]+)?)/i
  );
  if (custDirectMatch?.[1]) {
    const candidate = custDirectMatch[1].replace(/[?.!]$/, "").trim();
    if (!isExcludedTerm(candidate)) {
      return candidate;
    }
  }

  // Pattern 5: "What is Russel Hackett's email?", "Russel Hackett's phone number", "Vikrant Mankotia spent"
  const possessivePersonMatch = text.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:'s|\s+has|\s+spent|\s+booked)/
  );
  if (possessivePersonMatch?.[1]) {
    const candidate = possessivePersonMatch[1].trim();
    if (!isExcludedTerm(candidate) && !/^(What|How|Who|Which|Where|When)$/i.test(candidate)) {
      return candidate;
    }
  }

  // Pattern 6: Known room names (e.g. Snowbell, The Oaksmith)
  const roomNameMatch = norm.match(/\b(snowbell|the\s+oaksmith|oaksmith)\b/i);
  if (roomNameMatch?.[1]) {
    return roomNameMatch[1];
  }

  const patterns = [
    /(?:show|list|get|find|search|check)\s+(?:me\s+)?\b(?:customers?|clients?|attendees?|guests?|coupons?|discounts?|promos?|locations?|staffs?|teams?|transactions?|payments?|bookings?)\b\s*(?:named?\s+|called?\s+|for\s+)?(.+)/i,
    /\b(?:customers?|clients?|attendees?|guests?|coupons?|discounts?|promos?|locations?|staffs?|teams?|transactions?|payments?|bookings?)\b\s+(?:detail|info)\s+(?:for|of|about)\s+(.+)/i,
    /details?\s+(?:for|of|about)\s+\b(?:customers?|clients?|bookings?|payments?|transactions?)\b\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = norm.match(pattern);
    if (match?.[1]) {
      const term = match[1].replace(/[?.!]$/, "").trim();
      if (!isExcludedTerm(term)) {
        return term;
      }
    }
  }

  return undefined;
}

/**
 * Extract a booking reference (e.g. VE-026, #EV-007, 1024) or target name.
 */
export function extractBookingIdentifier(text: string): string | undefined {
  const norm = normalizeVendorChatText(text);

  // Exact reference code (VE-026, EV-007, BK-105, etc.)
  const codeMatch = norm.match(/\b([A-Za-z]{2,5}-\d+)\b/i);
  if (codeMatch?.[1]) {
    return codeMatch[1].toUpperCase();
  }

  // Hash code (#VE-026 or #1234)
  const hashMatch = norm.match(/#\s*([A-Za-z0-9-]+)\b/);
  if (hashMatch?.[1]) {
    return hashMatch[1];
  }

  // "this booking VE-026" / "booking VE-026"
  const bookingWordMatch = norm.match(/\bbooking\s+(?:named?\s+|called?\s+|#\s*)?([A-Za-z0-9-]+)\b/i);
  if (bookingWordMatch?.[1]) {
    const val = bookingWordMatch[1].trim();
    if (!/^(details?|status|info|list|all|for|this|how|check|history|pending|today'?s?|yesterday'?s?)$/i.test(val)) {
      return val;
    }
  }

  // Customer name attached: "transaction of Sahil ... check its booking" -> "Sahil"
  const customerAttachedMatch = norm.match(/\b(?:of|for|by)\s+([A-Za-z0-9'-]+)\b/i);
  if (customerAttachedMatch?.[1]) {
    const val = customerAttachedMatch[1].trim();
    if (!/^(this|the|any|all|our|my|a|an|month|week|today|today'?s?|yesterday|yesterday'?s?)$/i.test(val)) {
      return val;
    }
  }

  return undefined;
}

/**
 * Extract Stripe Payment Intent ID (`pi_...`), Charge ID (`ch_...`), or Invoice ID (`in_...`)
 */
export function extractPaymentIdentifier(text: string): string | undefined {
  const norm = normalizeVendorChatText(text);
  const match = norm.match(/\b(pi_[a-zA-Z0-9_]{10,}|ch_[a-zA-Z0-9_]{10,}|in_[a-zA-Z0-9_]{10,})\b/);
  if (match?.[1]) {
    return match[1];
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Live API fetchers                                                  */
/* ------------------------------------------------------------------ */

export async function fetchVendorOnDemandChatReply(params: {
  userText: string;
  userName: string | null;
  queryType: VendorQueryType;
}): Promise<{ reply: string } | null> {
  const { userText, userName, queryType } = params;
  const nameBit = userName ? `, ${userName}` : "";

  // Check if this is a compound request (e.g. asking for staff AND a payment ID pi_...)
  const hasPaymentId = Boolean(extractPaymentIdentifier(userText));
  const asksStaff = isVendorStaffRoleQueryIntent(userText);

  if (hasPaymentId && asksStaff) {
    // Answer both compound parts!
    const [staffResult, paymentResult] = await Promise.allSettled([
      fetchStaffRolesReply(nameBit, undefined, userText),
      fetchPaymentLookupReply(nameBit, userText),
    ]);
    const staffText =
      staffResult.status === "fulfilled" ? staffResult.value.reply : "";
    const paymentText =
      paymentResult.status === "fulfilled" ? paymentResult.value.reply : "";
    if (staffText && paymentText) {
      return {
        reply: `${staffText}\n\n---\n\n${paymentText}`,
      };
    }
  }

  const search = extractSearchTerm(userText);

  try {
    switch (queryType) {
      case "booking_lookup":
        return await fetchBookingLookupReply(nameBit, userText);
      case "payment_lookup":
        return await fetchPaymentLookupReply(nameBit, userText);
      case "customers":
        return await fetchCustomersReply(nameBit, search, userText);
      case "menu_choices":
        return await fetchMenuChoicesReply(nameBit, search);
      case "coupons":
        return await fetchCouponsReply(nameBit, search, userText);
      case "rooms":
        return await fetchRoomsReply(nameBit, search, userText);
      case "locations":
        return await fetchLocationsReply(nameBit, search);
      case "staff_roles":
        return await fetchStaffRolesReply(nameBit, search, userText);
      case "transactions":
        return await fetchTransactionsReply(nameBit, search);
      default:
        return null;
    }
  } catch (error) {
    console.error(`Vendor on-demand chat (${queryType}) fetch failed:`, error);
    return {
      reply: `I couldn't fetch the ${queryType.replace("_", " ")} data right now${nameBit}. Please try again later.`,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Individual fetchers                                                */
/* ------------------------------------------------------------------ */

/**
 * Handles specific booking inquiries (e.g. "show me this booking VE-026" or "check its booking how much they pay and how much pending")
 */
async function fetchBookingLookupReply(
  nameBit: string,
  userText: string
): Promise<{ reply: string }> {
  const target = extractBookingIdentifier(userText);
  const searchParam = target ? { search: target, per_page: 5, page: 1 } : { per_page: 5, page: 1 };

  const response = await vendorBookingsService.getBookings(searchParam);
  const bookings = response?.data ?? [];

  if (bookings.length === 0) {
    const notFoundMsg = target
      ? `No booking found matching "**${target}**"${nameBit}.`
      : `No matching bookings found${nameBit}.`;
    return {
      reply: `${notFoundMsg} You can search and manage all bookings in [Booking History](/vendor/booking-history).`,
    };
  }

  // If a specific single booking was requested or returned:
  if (bookings.length === 1 || target?.includes("-")) {
    const b = bookings[0];
    const totalAmt = fmt(b.amount);
    const depositAmt = fmt((b as any).deposit_amount ?? "0.00");
    const pendingAmt = fmt((b as any).pending_amount ?? "0.00");
    const statusLabel = (b as any).status || "Confirmed";
    const eventDates = Array.isArray(b.event_date)
      ? b.event_date.map((d) => d.date).join(", ")
      : b.booking_date;

    return {
      reply:
        `Here are the details for booking **${b.booking_number}**${nameBit}:\n\n` +
        `- **Booking Reference:** #${b.booking_number}\n` +
        `- **Customer:** ${b.user_name || "Guest"}\n` +
        `- **Event:** ${b.event_name || "Event"}\n` +
        `- **Event Date(s):** ${eventDates}\n` +
        `- **Total Amount:** **${totalAmt}**\n` +
        `- **Deposit / Paid:** **${depositAmt}**\n` +
        `- **Pending Balance:** **${pendingAmt}**\n` +
        `- **Status:** ${statusLabel}\n\n` +
        `[Open Booking History](/vendor/booking-history)`,
    };
  }

  // Multiple bookings matching (e.g. customer name search)
  const cards = bookings.slice(0, 8).map((b, idx) => {
    const totalAmt = fmt(b.amount);
    const depositAmt = fmt((b as any).deposit_amount ?? "0.00");
    const pendingAmt = fmt((b as any).pending_amount ?? "0.00");
    const status = (b as any).status || "Confirmed";
    const eventDates = Array.isArray(b.event_date)
      ? b.event_date.map((d) => d.date).join(", ")
      : b.booking_date;
    const pendingBit =
      (b as any).pending_amount && Number((b as any).pending_amount) > 0
        ? ` · Pending: **${pendingAmt}**`
        : "";

    return (
      `${idx + 1}. **#${b.booking_number}** — **${b.user_name || "Guest"}**\n` +
      `   📅 ${b.event_name || "Event"} (${eventDates})\n` +
      `   💵 Total: **${totalAmt}** · Paid: **${depositAmt}**${pendingBit} · Status: **${status}**\n` +
      `   [Open Booking Details](/vendor/booking-history/${b.booking_id})`
    );
  });

  const targetLabel = target ? ` matching "**${target}**"` : "";
  return {
    reply:
      `Here are the booking records found${targetLabel}${nameBit}:\n\n` +
      `${cards.join("\n\n")}\n\n[Open Booking History](/vendor/booking-history)`,
  };
}

/**
 * Handles payment and transaction inquiries (e.g. Stripe ID `pi_...` or customer payment check)
 */
async function fetchPaymentLookupReply(
  nameBit: string,
  userText: string
): Promise<{ reply: string }> {
  const paymentId = extractPaymentIdentifier(userText);
  const target = paymentId || extractBookingIdentifier(userText) || extractSearchTerm(userText);

  // 1. Check transactions first
  const txnResponse = await fetchVendorTransactions({
    search: target,
    per_page: 10,
    page: 1,
  });

  const transactions = txnResponse?.data ?? [];

  if (transactions.length > 0) {
    if (paymentId || transactions.length === 1) {
      const t = transactions[0];
      const method = t.payment_method || t.card_brand || "Card (Stripe)";
      return {
        reply:
          `Here are the transaction details for **${target}**${nameBit}:\n\n` +
          `- **Transaction / Reference:** \`${t.booking_number || target}\`\n` +
          `- **Customer:** ${t.full_name || "Customer"}\n` +
          `- **Amount Paid:** **${fmt(t.amount)}**\n` +
          `- **Platform Fee:** ${fmt(t.platform_fee)}\n` +
          `- **Payment Method:** ${method}\n` +
          `- **Status:** ${t.status || "Paid"}\n` +
          `- **Date:** ${t.booking_date || "—"}\n\n` +
          `[Open Transactions](/vendor/transactions)`,
      };
    }

    const cards = transactions.slice(0, 8).map((t, idx) => {
      const method = t.payment_method || t.card_brand || "Stripe";
      const bNum = t.booking_number ? ` (Booking #${t.booking_number})` : "";
      return (
        `${idx + 1}. **${t.full_name || "Customer"}**${bNum}\n` +
        `   💳 Method: ${method} · Date: ${t.booking_date || "—"}\n` +
        `   💵 Paid: **${fmt(t.amount)}** · Fee: ${fmt(t.platform_fee)} · Status: **${t.status || "Paid"}**`
      );
    });

    return {
      reply:
        `Here are the payment transaction records found for "**${target}**"${nameBit}:\n\n` +
        `${cards.join("\n\n")}\n\n[Open Transactions](/vendor/transactions)`,
    };
  }

  // 2. If not found in transactions directly, check bookings for customer / payment status
  if (target) {
    const bookingResponse = await vendorBookingsService.getBookings({
      search: target,
      per_page: 5,
      page: 1,
    });
    const bookings = bookingResponse?.data ?? [];
    if (bookings.length > 0) {
      const b = bookings[0];
      return {
        reply:
          `Found booking record for **${b.user_name}** (#${b.booking_number})${nameBit}:\n\n` +
          `- **Event:** ${b.event_name}\n` +
          `- **Date:** ${b.booking_date}\n` +
          `- **Total Amount:** **${fmt(b.amount)}**\n` +
          `- **Paid / Deposit:** **${fmt((b as any).deposit_amount ?? "0.00")}**\n` +
          `- **Pending Balance:** **${fmt((b as any).pending_amount ?? "0.00")}**\n` +
          `- **Status:** ${(b as any).status || "Confirmed"}\n\n` +
          `[Open Transactions](/vendor/transactions) · [Open Booking History](/vendor/booking-history)`,
      };
    }
  }

  return {
    reply:
      `No transaction or payment found matching "**${target || userText}**"${nameBit}. ` +
      `Please check the ID or search directly in [Transactions](/vendor/transactions).`,
  };
}

async function fetchCustomersReply(
  nameBit: string,
  search?: string,
  userText?: string
): Promise<{ reply: string }> {
  const norm = normalizeVendorChatText(userText || "").toLowerCase();

  const wantsCount =
    /\b(how\s+many|count|total|number\s+of)\b/i.test(norm) ||
    /\b(active\s+and\s+inactive|active\s*\?|inactive\s*\?)\b/i.test(norm);

  const wantsStatus = /\b(active|inactive|status)\b/i.test(norm);

  const wantsContact = /\b(contact|phone|telephone|mobile|number|call)s?\b/i.test(
    norm
  );

  const wantsAll =
    /\b(all|every|full\s+list|everything|show\s+all|list\s+all|see\s+all|view\s+all|display\s+all)\b/i.test(
      norm
    ) || /\bwhy\s+(?:did\s+you\s+)?only\s+(?:give|show)\b/i.test(norm);

  const askedWhyOnlyFive =
    /\bwhy\s+(?:did\s+you\s+)?only\s+(?:give|show)\s*5?\b/i.test(norm);

  const perPage = search
    ? 10
    : wantsAll || wantsCount || wantsStatus || wantsContact
      ? 50
      : 15;

  const response = await customersService.getCustomers({
    search,
    per_page: perPage,
    page: 1,
  });

  const customers = response?.data ?? [];
  const total = response?.meta?.total ?? customers.length;

  if (customers.length === 0) {
    return {
      reply: search
        ? `No customers found matching "**${search}**"${nameBit}. [Open Customers](/vendor/customers) to see all or register a new customer.`
        : `No customers found${nameBit}. [Open Customers](/vendor/customers) to manage your customer list.`,
    };
  }

  // Single customer detailed lookup with booking history & spend correlation
  if (search && customers.length >= 1) {
    const exact =
      customers.find(
        (c) =>
          `${c.first_name} ${c.last_name}`.toLowerCase() === search.toLowerCase() ||
          c.first_name.toLowerCase() === search.toLowerCase() ||
          c.last_name.toLowerCase() === search.toLowerCase()
      ) || customers[0];

    const asksBookingsOrSpend =
      /\b(booking|bookings|spent|spend|paid|order|orders|last\s+booking)\b/i.test(
        norm
      );

    let bookingsBit = "";
    if (asksBookingsOrSpend) {
      try {
        const bRes = await vendorBookingsService.getBookings({
          search: `${exact.first_name} ${exact.last_name}`,
          per_page: 50,
        });
        const custBookings = bRes?.data ?? [];
        const totalSpent = custBookings.reduce(
          (sum, b) => sum + (parseFloat(String(b.amount)) || 0),
          0
        );
        const lastBooking = custBookings[0];
        bookingsBit =
          `\n\n📅 **Booking History:**\n` +
          `- **Total Bookings:** **${custBookings.length}**\n` +
          `- **Total Spent:** **${fmt(totalSpent)}**\n` +
          (lastBooking
            ? `- **Last Booking:** #${lastBooking.booking_number} (${lastBooking.event_name} · ${lastBooking.booking_date})`
            : "");
      } catch {
        /* bookings optional */
      }
    }

    const phoneBit = exact.phone ? `\`${exact.phone}\`` : "*No phone on file*";
    const statusLabel = exact.status === "active" ? "🟢 Active" : "⚪ Inactive";

    return {
      reply:
        `Here are the customer details for **${exact.first_name} ${exact.last_name}**${nameBit}:\n\n` +
        `- **Full Name:** ${exact.first_name} ${exact.last_name}\n` +
        `- **Status:** ${statusLabel}\n` +
        `- **Email:** \`${exact.email}\`\n` +
        `- **Phone:** ${phoneBit}\n` +
        `- **Customer ID:** #${exact.id}${bookingsBit}\n\n` +
        `[Open Customers](/vendor/customers)`,
    };
  }

  // Active / Inactive breakdown
  let activeCount = customers.filter(
    (c) => String(c.status).toLowerCase() === "active"
  ).length;
  let inactiveCount = customers.filter(
    (c) => String(c.status).toLowerCase() === "inactive"
  ).length;

  // If there are more total customers than our current page and user asked for exact status/count,
  // query status counts for exact numbers
  if (total > customers.length && (wantsStatus || wantsCount)) {
    try {
      const [activeRes, inactiveRes] = await Promise.allSettled([
        customersService.getCustomers({ status: "active", per_page: 1 }),
        customersService.getCustomers({ status: "inactive", per_page: 1 }),
      ]);
      if (activeRes.status === "fulfilled" && activeRes.value?.meta?.total != null) {
        activeCount = activeRes.value.meta.total;
      }
      if (
        inactiveRes.status === "fulfilled" &&
        inactiveRes.value?.meta?.total != null
      ) {
        inactiveCount = inactiveRes.value.meta.total;
      }
    } catch {
      // fallback to current page sample
    }
  }

  // Format cards
  const displayLimit = wantsAll ? 50 : wantsCount && !wantsContact ? 5 : 15;
  const displaySlice = customers.slice(0, displayLimit);

  const list = displaySlice
    .map((c, idx) => {
      const phoneBit = c.phone
        ? ` · 📞 **${c.phone}**`
        : wantsContact
          ? " · 📞 *No phone on file*"
          : " · 📞 No phone";
      const statusBadge = c.status ? ` · **${c.status.toUpperCase()}**` : "";
      return (
        `${idx + 1}. **${c.first_name} ${c.last_name}**${statusBadge}\n` +
        `   ✉️ ${c.email}${phoneBit}`
      );
    })
    .join("\n\n");

  const showing =
    displaySlice.length < total
      ? ` (showing ${displaySlice.length} of ${total})`
      : "";

  let header = "";

  if (search) {
    header = `Yes, we found customer record(s) matching "**${search}**"${nameBit}${showing}:`;
  } else if (askedWhyOnlyFive) {
    header = `I initially showed 5 to keep the chat reply quick and compact${nameBit}! Here is the complete list of your **${total}** customers:`;
  } else if (wantsStatus || wantsCount) {
    const statHeader =
      `You currently have **${total}** registered customer(s)${nameBit}:\n\n` +
      `📊 **Status Summary:**\n` +
      `- **Active Customers:** **${activeCount}**\n` +
      `- **Inactive Customers:** **${inactiveCount}**\n` +
      `- **Total Customers:** **${total}**`;

    const dirTitle = wantsContact
      ? `\n\n📞 **Customer Contact Directory:**`
      : `\n\n**Recent Customers${showing}:**`;

    header = `${statHeader}${dirTitle}`;
  } else if (wantsContact) {
    header = `Here is your customer contact directory${nameBit}${showing}:`;
  } else {
    header = `Here are your customers${nameBit}${showing}:`;
  }

  const contactNote =
    wantsContact && customers.some((c) => !c.phone)
      ? `\n\n*(Note: Phone numbers are recorded when entered during checkout or profile registration. All customers have verified email addresses on file.)*`
      : "";

  return {
    reply: `${header}\n\n${list}${contactNote}\n\n[Open Customers](/vendor/customers)`,
  };
}

async function fetchMenuChoicesReply(
  nameBit: string,
  search?: string
): Promise<{ reply: string }> {
  const response = await menuChoicesService.getCustomerMenuChoices({
    search,
    per_page: 5,
    page: 1,
  });

  const items = response?.data ?? [];
  const total = response?.meta?.total ?? items.length;

  if (items.length === 0) {
    return {
      reply: search
        ? `No menu choices found matching "${search}"${nameBit}. [Open Menu Choices](/vendor/menu-choices) to see all.`
        : `No menu choices found${nameBit}. [Open Menu Choices](/vendor/menu-choices) to manage menu selections.`,
    };
  }

  const list = items
    .map((m, idx) => {
      const statusBadge =
        m.status === "1" || m.status === "completed"
          ? "✅ Completed"
          : "⏳ Pending";
      return (
        `${idx + 1}. **${m.customer_name}** — ${m.event_name}\n` +
        `   📅 ${m.event_date} · ✉️ ${m.customer_email} · Status: **${statusBadge}**`
      );
    })
    .join("\n\n");

  const showing =
    items.length < total ? ` (showing ${items.length} of ${total})` : "";

  return {
    reply: `Here are your customer menu choices${nameBit}${showing}:\n\n${list}\n\n[Open Menu Choices](/vendor/menu-choices)`,
  };
}

async function fetchCouponsReply(
  nameBit: string,
  search?: string,
  userText?: string
): Promise<{ reply: string }> {
  const norm = normalizeVendorChatText(userText || "").toLowerCase();

  const wantsCount =
    /\b(how\s+many|how\s+much|count|total|number\s+of)\b/i.test(norm);
  const wantsActive =
    /\b(active|live|running|current|currently|valid)\b/i.test(norm) &&
    !/\b(inactive|expired)\b/i.test(norm);
  const wantsExpired = /\b(expired|past|ended)\b/i.test(norm);
  const wantsInactive = /\b(inactive|paused)\b/i.test(norm);
  const wantsHighest =
    /\b(highest|biggest|max|maximum|best|largest|most)\b/i.test(norm);
  const wantsAll =
    /\b(all|every|complete|full\s+list|everything|show\s+all|list\s+all)\b/i.test(
      norm
    );

  // Extract explicit coupon code from query if any (e.g. SUM30, DINO76)
  const codeMatch = norm.match(/\b([A-Za-z]{2,10}\d{1,4})\b/);
  const potentialCode =
    codeMatch?.[1] &&
    !/^(discount|discounts|coupon|coupons|promo|promos|voucher|active|status|detail|details|expired|highest|amount|percentage)$/i.test(
      codeMatch[1]
    )
      ? codeMatch[1].toUpperCase()
      : undefined;

  const targetCode = search || potentialCode;

  const response = await discountsService.getDiscounts({
    search: targetCode,
    per_page: 50,
    page: 1,
  });

  const discounts = response?.data ?? [];
  const total = response?.meta?.total ?? discounts.length;

  if (discounts.length === 0) {
    return {
      reply: targetCode
        ? `No coupon or discount found matching "**${targetCode}**"${nameBit}. [Open Discounts](/vendor/discounts) to see all or create a new promo.`
        : `No coupons/discounts found in your venue${nameBit}. [Open Discounts](/vendor/discounts) to create your first discount.`,
    };
  }

  const now = new Date();

  // Helper to test if a discount is currently active
  const isDiscountActive = (d: Discount): boolean => {
    const st = String(d.status || d.stored_status || "").toLowerCase();
    const isLiveStatus = st === "active" || st === "1" || st === "live";
    if (!isLiveStatus) return false;
    if (d.expires_at) {
      const expDate = new Date(d.expires_at);
      if (!isNaN(expDate.getTime()) && expDate < now) {
        return false;
      }
    }
    return true;
  };

  // Helper to test if a discount is expired
  const isDiscountExpired = (d: Discount): boolean => {
    const st = String(d.status || d.stored_status || "").toLowerCase();
    if (st === "expired") return true;
    if (d.expires_at) {
      const expDate = new Date(d.expires_at);
      if (!isNaN(expDate.getTime()) && expDate < now) {
        return true;
      }
    }
    return false;
  };

  // Specific single coupon detail lookup
  if (
    targetCode &&
    (discounts.length === 1 ||
      discounts.some(
        (d) => d.coupon_code?.toUpperCase() === targetCode.toUpperCase()
      ))
  ) {
    const exact =
      discounts.find(
        (d) =>
          d.coupon_code?.toUpperCase() === targetCode.toUpperCase() ||
          d.name?.toUpperCase() === targetCode.toUpperCase()
      ) || discounts[0];

    const active = isDiscountActive(exact);
    const expired = isDiscountExpired(exact);
    const statusLabel = active
      ? "🟢 Active & Live"
      : expired
        ? "🔴 Expired"
        : "⏸️ Inactive / Paused";

    const discountVal =
      exact.discount_type === "percentage"
        ? `${exact.amount}% off`
        : fmt(exact.amount) + " off";
    const eventName = exact.event?.name ? ` for event **${exact.event.name}**` : "";
    const expiryStr = exact.expires_at ? ` · Expires: **${exact.expires_at}**` : "";

    return {
      reply:
        `Here are the details for **${exact.coupon_code || exact.name}**${nameBit}:\n\n` +
        `- **Code:** \`${exact.coupon_code || exact.name}\`\n` +
        `- **Discount:** **${discountVal}**${eventName}\n` +
        `- **Status:** ${statusLabel}${expiryStr}\n` +
        `- **Category:** ${exact.category === "coupon_code" ? "Coupon Code" : "Date Discount"}\n\n` +
        `[Open Discounts](/vendor/discounts)`,
    };
  }

  const activeDiscounts = discounts.filter(isDiscountActive);
  const expiredDiscounts = discounts.filter(isDiscountExpired);
  const inactiveDiscounts = discounts.filter(
    (d) => !isDiscountActive(d) && !isDiscountExpired(d)
  );

  const activeCount = activeDiscounts.length;
  const expiredCount = expiredDiscounts.length;
  const inactiveCount = inactiveDiscounts.length;

  // Highest discount query
  if (wantsHighest) {
    const sorted = [...discounts].sort(
      (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)
    );
    const highest = sorted[0];
    const val =
      highest.discount_type === "percentage"
        ? `${highest.amount}% off`
        : fmt(highest.amount) + " off";
    const st = isDiscountActive(highest) ? "Active" : "Expired";
    return {
      reply:
        `The highest discount in your system is **${highest.coupon_code || highest.name}** offering **${val}** (Status: **${st}**)${nameBit}.\n\n` +
        `[Open Discounts](/vendor/discounts)`,
    };
  }

  // If user specifically asks for ACTIVE discounts or asks "how many / how much active"
  if (wantsActive) {
    if (activeCount === 0) {
      return {
        reply:
          `You currently have **0 active discounts**${nameBit} (all ${total} discounts in your system are expired or paused).\n\n` +
          `📊 **Discounts Status:**\n` +
          `- **Active Discounts:** **0**\n` +
          `- **Expired Discounts:** **${expiredCount}**\n` +
          `- **Paused / Inactive:** **${inactiveCount}**\n\n` +
          `[Create a New Discount](/vendor/discounts) · [Review Expired Discounts](/vendor/discounts)`,
      };
    }

    const list = activeDiscounts
      .map((d, idx) => {
        const discountValue =
          d.discount_type === "percentage" ? `${d.amount}%` : fmt(d.amount);
        const expiry = d.expires_at ? ` · Expires: ${d.expires_at}` : "";
        return (
          `${idx + 1}. **${d.coupon_code || d.name || "Promo"}** — **${discountValue} off**\n` +
          `   Status: **Active**${expiry}`
        );
      })
      .join("\n\n");

    const header = wantsCount
      ? `You currently have **${activeCount} active discount(s)**${nameBit} (out of ${total} total):`
      : `Here are your currently active discounts${nameBit} (${activeCount} active):`;

    return {
      reply: `${header}\n\n${list}\n\n[Open Discounts](/vendor/discounts)`,
    };
  }

  // If user specifically asks for EXPIRED discounts
  if (wantsExpired) {
    if (expiredCount === 0) {
      return {
        reply: `You don't have any expired discounts${nameBit}. [Open Discounts](/vendor/discounts) to view all promos.`,
      };
    }

    const displaySlice = wantsAll
      ? expiredDiscounts
      : expiredDiscounts.slice(0, 10);
    const list = displaySlice
      .map((d, idx) => {
        const discountValue =
          d.discount_type === "percentage" ? `${d.amount}%` : fmt(d.amount);
        const expiry = d.expires_at ? ` · Expired: ${d.expires_at}` : "";
        return (
          `${idx + 1}. **${d.coupon_code || d.name || "Promo"}** — **${discountValue} off**\n` +
          `   Status: **Expired**${expiry}`
        );
      })
      .join("\n\n");

    const showing =
      displaySlice.length < expiredCount
        ? ` (showing ${displaySlice.length} of ${expiredCount})`
        : "";
    return {
      reply: `Here are your expired discounts${nameBit}${showing}:\n\n${list}\n\n[Open Discounts](/vendor/discounts)`,
    };
  }

  // General discounts count or summary query
  if (wantsCount) {
    return {
      reply:
        `You have **${total}** discount(s) in your system${nameBit}:\n\n` +
        `📊 **Discount Status Breakdown:**\n` +
        `- **Active / Live:** **${activeCount}**\n` +
        `- **Expired:** **${expiredCount}**\n` +
        `- **Paused / Inactive:** **${inactiveCount}**\n\n` +
        `[Open Discounts](/vendor/discounts)`,
    };
  }

  // Standard listing: list active first, then expired
  const displayDiscounts = wantsAll ? discounts : discounts.slice(0, 10);
  const list = displayDiscounts
    .map((d, idx) => {
      const discountValue =
        d.discount_type === "percentage" ? `${d.amount}%` : fmt(d.amount);
      const active = isDiscountActive(d);
      const statusLabel = active
        ? "Active"
        : isDiscountExpired(d)
          ? "Expired"
          : "Inactive";
      const expiry = d.expires_at ? ` · Expires: ${d.expires_at}` : "";
      return (
        `${idx + 1}. **${d.coupon_code || d.name || "Promo"}** — **${discountValue} off**\n` +
        `   Status: **${statusLabel}**${expiry}`
      );
    })
    .join("\n\n");

  const showing =
    displayDiscounts.length < total
      ? ` (showing ${displayDiscounts.length} of ${total})`
      : "";
  return {
    reply: `Here are your coupons and discounts${nameBit}${showing}:\n\n${list}\n\n[Open Discounts](/vendor/discounts)`,
  };
}

/**
 * Handles rooms and spaces inquiries
 */
async function fetchRoomsReply(
  nameBit: string,
  search?: string,
  userText?: string
): Promise<{ reply: string }> {
  const norm = normalizeVendorChatText(userText || "").toLowerCase();

  const wantsCount = /\b(how\s+many|count|number\s+of|total)\b/i.test(norm);
  const wantsBookings =
    /\b(booked|booking|bookings|occupancy|who\s+booked|how\s+many\s+customers\s+booked)\b/i.test(
      norm
    );
  const wantsMostBooked =
    /\b(most\s+booked|highest\s+booking|popular)\b/i.test(norm);

  let roomsList: Array<{ id: number; name: string; [key: string]: unknown }> =
    [];
  try {
    const roomRes = await roomService.listVendorRooms();
    roomsList = roomRes?.data ?? [];
  } catch (err) {
    console.error("Room service fetch failed:", err);
  }

  // If user asks about bookings in rooms or occupancy:
  if (wantsBookings || wantsMostBooked) {
    try {
      const bookingsRes = await vendorBookingsService.getBookings({
        per_page: 1000,
      });
      const allBookings = bookingsRes?.data ?? [];

      // Filter bookings associated with rooms
      const roomBookings = allBookings.filter(
        (b) =>
          b.room_name ||
          b.room_id ||
          (Array.isArray(b.event_date) &&
            b.event_date.some((ed) => ed.room_name))
      );

      // Group bookings by room name
      const roomCounts: Record<string, number> = {};
      for (const b of roomBookings) {
        const rName =
          b.room_name ||
          (Array.isArray(b.event_date) &&
            b.event_date.find((ed) => ed.room_name)?.room_name) ||
          "Main Space";
        roomCounts[rName] = (roomCounts[rName] || 0) + 1;
      }

      if (search) {
        const matchingBookings = allBookings.filter(
          (b) =>
            (b.room_name &&
              b.room_name.toLowerCase().includes(search.toLowerCase())) ||
            (Array.isArray(b.event_date) &&
              b.event_date.some((ed) =>
                ed.room_name?.toLowerCase().includes(search.toLowerCase())
              ))
        );
        return {
          reply:
            `Here are the bookings for room **${search}**${nameBit} (${matchingBookings.length} found):\n\n` +
            matchingBookings
              .slice(0, 8)
              .map(
                (b, i) =>
                  `${i + 1}. **#${b.booking_number}** — ${b.user_name} (${b.event_name}) · ${fmt(b.amount)}`
              )
              .join("\n") +
            `\n\n[Open Bookings](/vendor/booking-history)`,
        };
      }

      if (wantsMostBooked) {
        const sorted = Object.entries(roomCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          return {
            reply:
              `The most booked room in your venue is **${sorted[0][0]}** with **${sorted[0][1]} booking(s)**${nameBit}.\n\n` +
              `[Open Bookings](/vendor/booking-history)`,
          };
        }
      }

      return {
        reply:
          `You have **${roomBookings.length} booking(s)** across your venue rooms${nameBit}:\n\n` +
          Object.entries(roomCounts)
            .map(([r, c]) => `- **${r}:** ${c} booking(s)`)
            .join("\n") +
          `\n\n[Open Bookings](/vendor/booking-history)`,
      };
    } catch {
      // fallback to rooms list
    }
  }

  // Room listing or count
  if (roomsList.length === 0) {
    return {
      reply: `You currently have **0 rooms** configured in your venue${nameBit}. [Open Venue Settings](/vendor/onboarding) to configure multi-room spaces.`,
    };
  }

  if (wantsCount) {
    const list = roomsList.map((r, i) => `${i + 1}. **${r.name}**`).join("\n");
    return {
      reply:
        `You currently have **${roomsList.length} room(s)** configured in your venue${nameBit}:\n\n` +
        `${list}\n\n` +
        `[Open Venue Settings](/vendor/onboarding)`,
    };
  }

  const list = roomsList.map((r, i) => `${i + 1}. **${r.name}**`).join("\n");
  return {
    reply:
      `Here are your configured venue rooms${nameBit}:\n\n` +
      `${list}\n\n` +
      `[Open Venue Settings](/vendor/onboarding)`,
  };
}

async function fetchLocationsReply(
  nameBit: string,
  search?: string
): Promise<{ reply: string }> {
  const response = await locationService.getLocations({
    search,
    per_page: 5,
    page: 1,
  });

  const locData = response?.data as unknown;
  const locations: Array<Record<string, unknown>> = Array.isArray(locData)
    ? (locData as Array<Record<string, unknown>>)
    : locData &&
        typeof locData === "object" &&
        Array.isArray((locData as { data?: unknown[] }).data)
      ? (locData as { data: Array<Record<string, unknown>> }).data
      : [];
  const metaTotal =
    locData && typeof locData === "object" && "meta" in locData
      ? (locData as { meta?: { total?: number } }).meta?.total
      : undefined;
  const total = metaTotal ?? locations.length;

  if (locations.length === 0) {
    return {
      reply: search
        ? `No locations found matching "${search}"${nameBit}. [Open Locations](/vendor/venue-locations) to see all.`
        : `No venue locations found${nameBit}. [Open Locations](/vendor/venue-locations) to add one.`,
    };
  }

  const list = locations
    .map((loc, idx) => {
      const name = (loc.name || loc.city || loc.title || "Unknown") as string;
      const address = (loc.address || loc.street || "—") as string;
      const status = (loc.status || "active") as string;
      return `${idx + 1}. **${name}** (${status})\n   📍 ${address}`;
    })
    .join("\n\n");

  const showing =
    locations.length < total
      ? ` (showing ${locations.length} of ${total})`
      : "";

  return {
    reply: `Here are your venue locations${nameBit}${showing}:\n\n${list}\n\n[Open Locations](/vendor/venue-locations)`,
  };
}

async function fetchStaffRolesReply(
  nameBit: string,
  search?: string,
  userText?: string
): Promise<{ reply: string }> {
  const norm = normalizeVendorChatText(userText || "");
  const asksRoles = /\brole\b/i.test(norm) && !/\bstaff\b/i.test(norm);

  if (asksRoles) {
    const rolesResponse = await manageRolesService.getRoles({ per_page: 10 });
    const roles = rolesResponse?.data ?? [];

    if (roles.length === 0) {
      return {
        reply: `No roles found${nameBit}. [Open Manage Roles](/vendor/manage-roles) to create one.`,
      };
    }

    const list = roles
      .map(
        (r, idx) =>
          `${idx + 1}. **${r.label}** · ${r.permissions?.length ?? 0} permissions`
      )
      .join("\n");

    return {
      reply: `Here are your defined roles${nameBit}:\n\n${list}\n\n[Open Manage Roles](/vendor/manage-roles)`,
    };
  }

  // Staff members
  const response = await staffManagementService.getStaff({
    search,
    per_page: 10,
    page: 1,
  });

  const staff = response?.data ?? [];
  const total = response?.meta?.total ?? staff.length;

  if (staff.length === 0) {
    return {
      reply: search
        ? `No staff members found matching "${search}"${nameBit}. [Open Staff Management](/vendor/staff-management) to see all.`
        : `You currently have **0** staff members registered${nameBit}. [Open Staff Management](/vendor/staff-management) to invite your team.`,
    };
  }

  const list = staff
    .map((s, idx) => {
      const email = s.email ? ` · ✉️ ${s.email}` : "";
      return `${idx + 1}. **${s.first_name} ${s.last_name}** (${s.role || "Staff"} · ${s.status || "active"})${email}`;
    })
    .join("\n");

  const showing =
    staff.length < total ? ` (showing ${staff.length} of ${total})` : "";

  return {
    reply: `You currently have **${total}** staff member(s) registered${nameBit}${showing}:\n\n${list}\n\n[Open Staff Management](/vendor/staff-management)`,
  };
}

async function fetchTransactionsReply(
  nameBit: string,
  search?: string
): Promise<{ reply: string }> {
  const response = await fetchVendorTransactions({
    search,
    per_page: 5,
    page: 1,
  });

  const transactions = response?.data ?? [];
  const total = response?.meta?.total ?? transactions.length;

  if (transactions.length === 0) {
    return {
      reply: search
        ? `No transactions found matching "${search}"${nameBit}. [Open Transactions](/vendor/transactions) to see all.`
        : `No transactions found${nameBit}. [Open Transactions](/vendor/transactions) to view your transaction history.`,
    };
  }

  const list = transactions
    .map((t, idx) => {
      const method = t.payment_method || t.card_brand || "Stripe";
      const bNum = t.booking_number ? ` (Booking #${t.booking_number})` : "";
      return (
        `${idx + 1}. **${t.full_name || "Customer"}**${bNum}\n` +
        `   📅 ${t.booking_date || "—"} · ${method}\n` +
        `   💵 Paid: **${fmt(t.amount)}** · Fee: ${fmt(t.platform_fee)} · Status: **${t.status || "Paid"}**`
      );
    })
    .join("\n\n");

  const showing =
    transactions.length < total
      ? ` (showing ${transactions.length} of ${total})`
      : "";

  const earningsLine = response?.earnings
    ? `\n\n**Total Earnings:** ${fmt(response.earnings)}`
    : "";

  return {
    reply: `Here are your recent transactions${nameBit}${showing}:\n\n${list}${earningsLine}\n\n[Open Transactions](/vendor/transactions)`,
  };
}

/* ------------------------------------------------------------------ */
/*  Conversational follow-up detection & topic inheritance             */
/* ------------------------------------------------------------------ */

export function isVendorFollowUpQuery(text: string): boolean {
  const norm = normalizeVendorChatText(text)
    .trim()
    .toLowerCase()
    .replace(/[?.!]+$/, "");
  return (
    /^(show\s+(?:me\s+)?all|show\s+all|see\s+all|view\s+all|display\s+all|list\s+all|give\s+(?:me\s+)?all|all\s+of\s+them|full\s+list|everything|all)$/i.test(
      norm
    ) ||
    /^(?:show|see|view|list|give\s+me)\s+all\b/i.test(norm) ||
    /^why\s+(?:did\s+you|do\s+you|would\s+you|are\s+there|you)?\s*(?:only|just)\s*(?:give|show|display|return|list)?\s*\d*/i.test(
      norm
    ) ||
    /^(show\s+more|more\s+please|more|next\s+page|next)\b/i.test(norm) ||
    /^(how\s+many\s+(?:are\s+)?(?:active|inactive)|how\s+many\s+active|how\s+many\s+inactive)\b/i.test(
      norm
    ) ||
    /^(what\s+about\s+(?:contact|phone|email)s?|show\s+(?:their\s+)?(?:contact|phone|email)s?)\b/i.test(
      norm
    )
  );
}

export function resolveVendorTopicFromHistory(
  messages: Array<{ role: string; content: string }>
): VendorQueryType | "booking_list" | null {
  const recent = [...messages].reverse().slice(0, 6);
  for (const m of recent) {
    const text = m.content.toLowerCase();
    if (m.role === "assistant") {
      if (
        text.includes("/vendor/customers") ||
        text.includes("here are your customers") ||
        text.includes("customer record") ||
        text.includes("registered customer")
      ) {
        return "customers";
      }
      if (
        text.includes("/vendor/booking-history") ||
        text.includes("here are your bookings") ||
        text.includes("booking records found")
      ) {
        return "booking_list";
      }
      if (
        text.includes("/vendor/transactions") ||
        text.includes("recent transactions") ||
        text.includes("transaction details")
      ) {
        return "transactions";
      }
      if (text.includes("/vendor/discounts") || text.includes("coupons/discounts")) {
        return "coupons";
      }
      if (text.includes("/vendor/venue-locations") || text.includes("venue locations")) {
        return "locations";
      }
      if (text.includes("/vendor/staff-management") || text.includes("staff members")) {
        return "staff_roles";
      }
      if (text.includes("/vendor/menu-choices") || text.includes("menu choices")) {
        return "menu_choices";
      }
      if (
        text.includes("/vendor/onboarding") ||
        text.includes("venue rooms") ||
        text.includes("room(s)")
      ) {
        return "rooms";
      }
    }
    if (m.role === "user") {
      const qType = detectVendorOnDemandQueryType(m.content);
      if (qType) return qType;
      if (
        /\b(booking|bookings|reservation|reservations)\b/i.test(m.content) &&
        !/\b(how\s+to\s+book)\b/i.test(m.content)
      ) {
        return "booking_list";
      }
    }
  }
  return null;
}
