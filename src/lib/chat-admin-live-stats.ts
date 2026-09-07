/**
 * Admin Dashboard On-Demand Live Stats for Chatbot
 *
 * Intent detection and live API fetching for admin dashboard queries.
 * Only called when the admin explicitly asks — never on render or idle.
 */

import { adminDashboardService } from "@/services/admin/dashboard/dashboard.service";
import { adminVenuesService } from "@/services/admin/venues/venues.service";
import type { AdminDashboardData, VendorOverviewRow } from "@/services/admin/dashboard/types";

/* ------------------------------------------------------------------ */
/*  Intent detection                                                   */
/* ------------------------------------------------------------------ */

const SUMMARY_PATTERNS = [
  /\b(summary|overview|how\s+many\s+vendor|total\s+vendor|active\s+vendor|disabled\s+vendor|vendor\s+(count|stats?|number)|platform\s+(stats?|summary|overview)|dashboard\s+(stats?|summary|overview))\b/i,
  /\b(how\s+is\s+the\s+platform|what.s\s+the\s+summary|give\s+me\s+(the\s+)?(summary|overview|stats))\b/i,
];

const PERFORMANCE_PATTERNS = [
  /\b(revenue|total\s+revenue|admin\s+commission|commission\s+pending|pending\s+commission|platform\s+revenue|total\s+earning|how\s+much\s+(revenue|commission|earning)|performance|platform\s+performance|financial|new\s+vendor)\b/i,
];

const VENUE_DETAIL_PATTERNS = [
  /\b(how\s+is\s+.+\s+doing|venue\s+detail|vendor\s+detail|show\s+me\s+.+\s+venue|show\s+me\s+.+\s+vendor|details?\s+(of|for|about)\s+.+\s+venue|details?\s+(of|for|about)\s+.+\s+vendor|.+\s+vendor.?\s+(stats?|performance|earning|commission|event)|highest\s+commission\s+venue|top\s+venue|top\s+vendor|newly\s+added\s+venue|recent\s+venue|new\s+venue)\b/i,
];

/**
 * Returns true if the user text is asking about admin dashboard summary stats
 * (total/active/disabled vendors, performance overview).
 */
export function isAdminDashboardStatsIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    SUMMARY_PATTERNS.some((r) => r.test(lower)) ||
    PERFORMANCE_PATTERNS.some((r) => r.test(lower))
  );
}

/**
 * Returns true if the user text is asking about a specific venue's details
 * or top/newly added venues.
 */
export function isAdminVenueDetailIntent(text: string): boolean {
  return VENUE_DETAIL_PATTERNS.some((r) => r.test(text));
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function fmt(value: number | string | undefined | null, prefix = "$"): string {
  if (value == null) return `${prefix}0.00`;
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `${prefix}0.00`;
  return `${prefix}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtInt(value: number | undefined | null): string {
  if (value == null) return "0";
  return value.toLocaleString("en-US");
}

/* ------------------------------------------------------------------ */
/*  Live API fetchers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fetches admin dashboard data and formats a reply about platform summary
 * and/or performance overview.
 */
export async function fetchAdminDashboardChatReply(params: {
  userText: string;
  userName: string | null;
}): Promise<{ reply: string } | null> {
  const { userText, userName } = params;

  try {
    const response = await adminDashboardService.getDashboard({
      vendor_per_page: 5,
      newly_added_per_page: 5,
    });

    const data: AdminDashboardData = response.data;
    if (!data) return null;

    const { summary, performance_overview, vendor_overview, newly_added_venues } = data;
    const nameBit = userName ? `, ${userName}` : "";
    const parts: string[] = [];

    // Check if asking about summary specifically
    const asksSummary = SUMMARY_PATTERNS.some((r) => r.test(userText));
    const asksPerformance = PERFORMANCE_PATTERNS.some((r) => r.test(userText));

    if (asksSummary && summary) {
      parts.push(
        `Here's the platform vendor summary${nameBit}:\n\n` +
        `| Metric | Count |\n` +
        `|--------|-------|\n` +
        `| Total Vendors | **${fmtInt(summary.total_vendors)}** |\n` +
        `| Active Vendors | **${fmtInt(summary.active_vendors)}** |\n` +
        `| Disabled Vendors | **${fmtInt(summary.disabled_vendors)}** |`
      );
    }

    if ((asksPerformance || asksSummary) && performance_overview) {
      const perfHeader = asksSummary && parts.length > 0
        ? "\n\n**Performance Overview:**"
        : `Here's the platform performance overview${nameBit}:`;
      parts.push(
        `${perfHeader}\n\n` +
        `| Metric | Value |\n` +
        `|--------|-------|\n` +
        `| Total Revenue | **${fmt(performance_overview.total_revenue)}** |\n` +
        `| Admin Commission | **${fmt(performance_overview.admin_commission)}** |\n` +
        `| Commission Pending | **${fmt(performance_overview.commission_pending)}** |\n` +
        `| New Vendors | **${fmtInt(performance_overview.new_vendors)}** |`
      );
    }

    // If asking about top vendors / highest commission
    if (/\b(top|highest\s+commission|best\s+performing)\b/i.test(userText)) {
      const topVenues = data.venues_highest_commission?.venues;
      if (topVenues && topVenues.length > 0) {
        parts.push(
          "\n\n**Top Venues by Commission:**\n\n" +
          `| Venue | Commission | Share |\n` +
          `|-------|------------|-------|\n` +
          topVenues
            .slice(0, 5)
            .map((v) =>
              `| ${v.venue_name} | **${v.total_commission_formatted || fmt(v.total_commission)}** | ${v.percentage}% |`
            )
            .join("\n")
        );
      }
    }

    // If asking about vendor overview
    if (/\b(vendor\s+overview|all\s+vendor)\b/i.test(userText) && vendor_overview?.data?.length) {
      parts.push(formatVendorOverviewTable(vendor_overview.data.slice(0, 5)));
    }

    // If asking about newly added venues
    if (/\b(new(ly)?\s+(added\s+)?venue|recent\s+venue)\b/i.test(userText) && newly_added_venues?.data?.length) {
      parts.push(
        "\n\n**Newly Added Venues:**\n\n" +
        `| # | Venue | Vendor | Registered | Status |\n` +
        `|---|-------|--------|------------|--------|\n` +
        newly_added_venues.data
          .slice(0, 5)
          .map((v) =>
            `| ${v.s_no} | ${v.venue_name} | ${v.vendor_name} | ${v.register_on} | ${v.account_status} |`
          )
          .join("\n")
      );
    }

    if (parts.length === 0) {
      // Generic fallback with full summary
      parts.push(
        `Here's the platform dashboard overview${nameBit}:\n\n` +
        `**Vendor Summary:** ${fmtInt(summary?.total_vendors)} total · ${fmtInt(summary?.active_vendors)} active · ${fmtInt(summary?.disabled_vendors)} disabled\n\n` +
        `**Performance:** Revenue ${fmt(performance_overview?.total_revenue)} · Commission ${fmt(performance_overview?.admin_commission)} · Pending ${fmt(performance_overview?.commission_pending)}`
      );
    }

    parts.push("\n\n[Open Dashboard](/admin/dashboard) · [Open All Venues](/admin/vendors)");

    return { reply: parts.join("") };
  } catch (error) {
    console.error("Admin dashboard chat fetch failed:", error);
    return {
      reply: "I couldn't fetch the dashboard data right now. Please try again or [open the Dashboard](/admin/dashboard) directly.",
    };
  }
}

/**
 * Fetches details about a specific venue/vendor by name and formats a reply.
 */
export async function fetchAdminVenueDetailChatReply(params: {
  userText: string;
  userName: string | null;
}): Promise<{ reply: string } | null> {
  const { userText, userName } = params;
  const nameBit = userName ? `, ${userName}` : "";

  try {
    // Extract the venue/vendor name from user text
    const vendorName = extractVendorName(userText);

    if (vendorName) {
      // Search by name in vendor overview
      const response = await adminDashboardService.getDashboard({
        vendor_search: vendorName,
        vendor_per_page: 5,
      });

      const vendors = response.data?.vendor_overview?.data ?? [];
      if (vendors.length > 0) {
        return {
          reply: formatVendorDetailReply(vendors, vendorName, nameBit),
        };
      }

      // Fallback: search in the venues endpoint
      const venuesResponse = await adminVenuesService.getVenues({
        search: vendorName,
        per_page: 5,
      });

      const venuesList = venuesResponse?.data ?? [];
      if (Array.isArray(venuesList) && venuesList.length > 0) {
        const lines = venuesList.slice(0, 5).map((v) => {
          const name = v.venue_name || "Unknown";
          const status = v.status || "—";
          const events = v.total_events != null ? `${v.total_events} events` : "";
          const earnings = v.total_earnings ? `Earnings: ${v.total_earnings}` : "";
          const extra = [events, earnings].filter(Boolean).join(", ");
          return `- **${name}** — Status: ${status}${extra ? ` (${extra})` : ""}`;
        });
        return {
          reply:
            `Here are the venues matching "${vendorName}"${nameBit}:\n\n${lines.join("\n")}\n\n[Open All Venues](/admin/vendors)`,
        };
      }

      return {
        reply: `I couldn't find a vendor or venue matching "${vendorName}"${nameBit}. Try checking [All Venues](/admin/vendors) for the exact name.`,
      };
    }

    // If asking about top/highest commission venues without a specific name
    if (/\b(top|highest|best)\b/i.test(userText)) {
      const response = await adminDashboardService.getDashboard({
        venues_limit: 5,
      });
      const topVenues = response.data?.venues_highest_commission?.venues ?? [];
      if (topVenues.length > 0) {
        return {
          reply:
            `Here are the top venues by commission${nameBit}:\n\n` +
            `| Venue | Commission | Share |\n` +
            `|-------|------------|-------|\n` +
            topVenues
              .map(
                (v) =>
                  `| ${v.venue_name} | **${v.total_commission_formatted || fmt(v.total_commission)}** | ${v.percentage}% |`
              )
              .join("\n") +
            `\n\n[Open Dashboard](/admin/dashboard)`,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Admin venue detail chat fetch failed:", error);
    return {
      reply: `I couldn't fetch venue details right now${nameBit}. Please try again or check [All Venues](/admin/vendors).`,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function extractVendorName(text: string): string | null {
  // "how is Sahil Sambyal doing" → "Sahil Sambyal"
  const howIsMatch = text.match(
    /how\s+is\s+(.+?)\s+(doing|performing|going)/i
  );
  if (howIsMatch) return howIsMatch[1].trim();

  // "details for/of/about X" → X
  const detailsMatch = text.match(
    /details?\s+(for|of|about)\s+(.+?)(\?|$)/i
  );
  if (detailsMatch) return detailsMatch[2].trim();

  // "show me X vendor/venue" → X
  const showMatch = text.match(
    /show\s+me\s+(.+?)\s+(vendor|venue)/i
  );
  if (showMatch) return showMatch[1].trim();

  // "X vendor stats/performance/earning" → X
  const statsMatch = text.match(
    /(.+?)\s+vendor.?\s+(stats?|performance|earning|commission|event)/i
  );
  if (statsMatch) return statsMatch[1].trim();

  return null;
}

function formatVendorOverviewTable(vendors: VendorOverviewRow[]): string {
  return (
    "\n\n**Vendor Overview:**\n\n" +
    `| # | Vendor | Events | Earnings | Commission | Pending |\n` +
    `|---|--------|--------|----------|------------|--------|\n` +
    vendors
      .map(
        (v) =>
          `| ${v.s_no} | ${v.vendor_name} | ${fmtInt(v.total_events)} | **${v.total_earning_formatted || fmt(v.total_earning)}** | ${v.commission_earned_formatted || fmt(v.commission_earned)} | ${v.commission_pending_formatted || fmt(v.commission_pending)} |`
      )
      .join("\n")
  );
}

function formatVendorDetailReply(
  vendors: VendorOverviewRow[],
  searchName: string,
  nameBit: string
): string {
  if (vendors.length === 1) {
    const v = vendors[0];
    return (
      `Here's the performance summary for **${v.vendor_name}**${nameBit}:\n\n` +
      `| Metric | Value |\n` +
      `|--------|-------|\n` +
      `| Total Events | **${fmtInt(v.total_events)}** |\n` +
      `| Total Earnings | **${v.total_earning_formatted || fmt(v.total_earning)}** |\n` +
      `| Commission Earned | **${v.commission_earned_formatted || fmt(v.commission_earned)}** |\n` +
      `| Commission Pending | **${v.commission_pending_formatted || fmt(v.commission_pending)}** |\n\n` +
      `[Open All Venues](/admin/vendors)`
    );
  }

  return (
    `Here are vendors matching "${searchName}"${nameBit}:\n\n` +
    `| Vendor | Events | Earnings | Commission |\n` +
    `|--------|--------|----------|------------|\n` +
    vendors
      .slice(0, 5)
      .map(
        (v) =>
          `| ${v.vendor_name} | ${fmtInt(v.total_events)} | **${v.total_earning_formatted || fmt(v.total_earning)}** | ${v.commission_earned_formatted || fmt(v.commission_earned)} |`
      )
      .join("\n") +
    `\n\n[Open All Venues](/admin/vendors)`
  );
}
