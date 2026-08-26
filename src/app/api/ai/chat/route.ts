import { NextRequest, NextResponse } from "next/server";
import {
  KNOWLEDGE_BASE,
  CHAT_INSTRUCTIONS,
  getVendorStorefrontChatInstructions,
  VENDOR_STOREFRONT_KNOWLEDGE,
  PLATFORM_VENDOR_CUSTOMER_TRAINING,
} from "@/services/common/ai/knowledge-base";
import { buildCurrentPagePromptBlock } from "@/lib/chat-page-context";
import { getAllowedNavLinksForPrompt } from "@/lib/chat-nav-links";
import {
  buildVendorLiveStatsPromptBlock,
  type VendorChatLiveStats,
} from "@/lib/chat-vendor-live-stats";
import { buildCompactLiveEventsPromptBlock, buildLiveEventsPromptBlock } from "@/lib/chat-live-events";
import type { LiveEvent } from "@/types/theme.types";
import {
  buildBookingConciergeInstructions,
  buildEventBookingPromptBlock,
  type ChatEventBookingBrief,
} from "@/lib/chat-event-booking";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import {
  AI_HIDE_REASONING,
  toUserFacingChatReply,
} from "../lib/extract-json";
import {
  aiRuntimeFailureMeta,
  aiUnconfiguredPayload,
  resolveAiRuntimeConfig,
} from "../lib/provider-config";

/**
 * Get condensed knowledge base to reduce token count
 * Removes verbose sections while keeping essential information
 */
function getCondensedKnowledgeBase(): string {
  // Extract key sections only
  const sections = KNOWLEDGE_BASE.split("## ");
  const essentialSections = [
    "About EventWizz",
    "System Overview",
    "Partner White-Label Deployments",
    "Vendor Onboarding",
    "Vendor Registration Process",
    "Vendor Welcome",
    "Vendor Dashboard",
    "Admin Dashboard",
    "Customer Flow",
    "User Types & Access",
    "Checkout & Booking System",
    "Onboarding Process",
    "Common User Questions & Solutions",
    "Site Essentials",
  ];

  let condensed = "";
  for (const section of sections) {
    const title = section.split("\n")[0];
    if (
      essentialSections.some((essential) =>
        title.toLowerCase().includes(essential.toLowerCase())
      )
    ) {
      condensed += `## ${section}\n\n`;
    }
  }

  // Authoritative training (prefer when older sections conflict)
  condensed += `
## Authoritative product training (prefer this)
${PLATFORM_VENDOR_CUSTOMER_TRAINING}

## Quick Reference
- Roles: admin (platform), vendor (venue), customer (booking)
- Onboarding (exact order): Venue → Site → Event → Timeline & Package → Dates → Catering → Brochure info → Other Packages → FAQs → Domain → Payment. AI option generates content; vendor finishes Domain + Payment.
- Dates: Tickets / Tables / Both; deposits for tables (or both) + balance due date.
- Rooms: optional Multiple event spaces (up to 3) — packages/dates/menus per room. Public: Choose Your Room.
- Vendor after login: Welcome — Select Location only when on that page; then Dashboard. Sidebar includes Table Assignment, Sites Essentials, Payment Settings, Support. Create Event = header. Domain Settings = profile → Settings → Domain Settings.
- Sites Essentials: Presets, Branding (Site identity, Main home page if multi-location, Location/Home page, Info pages), Colors, Typography, Social, SEO. Preview before Save. Not for tickets/domain.
- Logged-in vendors may receive LIVE VENDOR STATS for the period they asked about (today, last month, this week, etc.). Always answer with those figures first. Optional Dashboard/Bookings links only after the number — never instead of it.
- Customer book: location → event → optional room → Select a Date → Checkout (tickets/tables/drinks + guest allocation) → Pay in Full or Table deposit. Login at checkout. **Add room** only on Checkout before payment.
- Customer after login: Dashboard, Profile, Bookings, Support, Notifications, Transactions. Booking detail: Pay Now, Reschedule, **Add extras for this date** (tickets/tables/drinks), menu choices on booking page.
- **CRITICAL**: After booking, customers **cannot** add or change rooms. Never invent “Additional Rooms” / “Add room” on the booking page. Different room = new booking on the venue site.
`;

  return condensed.length < KNOWLEDGE_BASE.length + PLATFORM_VENDOR_CUSTOMER_TRAINING.length
    ? condensed
    : `${PLATFORM_VENDOR_CUSTOMER_TRAINING}\n\n${KNOWLEDGE_BASE}`;
}

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatContext = {
  /** "vendor" = venue storefront; anything else = main platform assistant */
  websiteRole?: string | null;
  siteName?: string | null;
  isLoggedInCustomer?: boolean;
  /** Session account type when authenticated: vendor | customer | admin */
  accountType?: string | null;
  userName?: string | null;
  isAuthenticated?: boolean;
  /** Browser pathname, e.g. /vendor/dashboard */
  pathname?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  /** Live dashboard + booking summary for logged-in vendors */
  vendorLiveStats?: VendorChatLiveStats | null;
  /** Theme live_events for public venue storefront booking redirects */
  liveEvents?: LiveEvent[] | null;
  /** Compact public event detail (dates, rooms, drinks, coupon) for concierge booking */
  eventBookingBrief?: ChatEventBookingBrief | null;
};

function buildLoggedInUserContextBlock(context: ChatContext): string {
  if (!context.isAuthenticated || !context.accountType) {
    return `
CURRENT VISITOR (MUST FOLLOW):
- This person is a **guest** (not logged in).
- You may ask briefly whether they need help as a venue owner, a customer booking events, or something else — only if their message is vague (e.g. just “hi”).
- Keep it professional and UK English. Do not mention EventWizz SaaS branding unnecessarily.
`;
  }

  const roleLabel =
    context.accountType === "vendor"
      ? "a logged-in **venue vendor**"
      : context.accountType === "admin"
        ? "a logged-in **platform admin**"
        : context.accountType === "customer"
          ? "a logged-in **customer**"
          : `a logged-in user (${context.accountType})`;

  const namePart = context.userName?.trim()
    ? ` Their first name is **${context.userName.trim()}**.`
    : "";

  const roleFocus =
    context.accountType === "vendor"
      ? `
- Help them with the vendor experience using the **CURRENT PAGE** below. Do not invent which screen they are on.
- If LIVE VENDOR STATS are present, answer booking/payment/event count questions from those figures.
- Keep stats answers short and bold every number with markdown (**16**). Only include metrics they asked for.
- Never tell them to open Dashboard and change the date filter when LIVE VENDOR STATS already cover the period they asked about — give the number first.
`
      : context.accountType === "admin"
        ? `
- Help them with the admin experience using the **CURRENT PAGE** below.
`
        : `
- Help them with the customer experience using the **CURRENT PAGE** below.
`;

  const nameInstruction = context.userName?.trim()
    ? `
- **MUST** address them by first name (e.g. “Hello, ${context.userName.trim()}”). Use the name on greetings — do not announce that they are “signed in” or explain their account type unless they ask.
- Do not overuse the name in every sentence.
`
    : `
- No first name is available — greet politely without inventing a name.
- Do not announce that they are “signed in” or explain their account type unless they ask.
`;

  return `
CURRENT USER SESSION (MUST FOLLOW — CRITICAL):
- This person is already signed in as ${roleLabel}.${namePart}
- **NEVER** ask if they are a vendor, customer, or admin. You already know.
- **NEVER** treat them like a guest or ask them to “identify themselves”.
- **NEVER** say things like “You’re signed in to your venue account” or “You’re logged in as a vendor” — that sounds odd and confuses users. Just help them professionally.
${nameInstruction}
- Answer helpfully for their role straight away.
${roleFocus}
`;
}

function buildSystemPrompt(context: ChatContext): string {
  const isVendorStorefront = context.websiteRole === "vendor";
  const siteName = context.siteName?.trim() || "";
  const pageBlock = buildCurrentPagePromptBlock(context.pathname);
  const navBlock = getAllowedNavLinksForPrompt({
    accountType: context.accountType,
    isAuthenticated: Boolean(context.isAuthenticated),
    isVendorStorefront,
  });
  const liveStatsBlock =
    context.accountType === "vendor"
      ? buildVendorLiveStatsPromptBlock(context.vendorLiveStats)
      : "";
  const liveEventsBlock = isVendorStorefront
    ? context.eventBookingBrief
      ? buildCompactLiveEventsPromptBlock(context.liveEvents)
      : buildLiveEventsPromptBlock(context.liveEvents)
    : "";
  const eventBookingBlock = isVendorStorefront
    ? buildEventBookingPromptBlock(context.eventBookingBrief)
    : "";
  const conciergeBlock = isVendorStorefront
    ? buildBookingConciergeInstructions(Boolean(context.isLoggedInCustomer))
    : "";

  if (isVendorStorefront) {
    return `${getVendorStorefrontChatInstructions({
      siteName,
      isLoggedInCustomer: Boolean(context.isLoggedInCustomer),
      isLoggedInVendor: context.accountType === "vendor",
      userName: context.userName,
      contactPhone: context.contactPhone,
      contactEmail: context.contactEmail,
      contactAddress: context.contactAddress,
    })}

      ${pageBlock}

      ${navBlock}

      ${liveStatsBlock}

      ${liveEventsBlock}

      ${eventBookingBlock}

      ${conciergeBlock}
      
      Use this knowledge to answer questions about the venue site:
      ${
        context.eventBookingBrief
          ? "Guests book in chat (room → date → party size → tables/tickets → drinks → coupon), or visit the event page. After a booking exists, rooms cannot be changed. Ticket/table quantities are confirmed on Checkout."
          : VENDOR_STOREFRONT_KNOWLEDGE
      }
      
      If you don't know the answer, politely say you don't have that specific information and follow the SUPPORT & CONTACT rules for this user (logged-in → New enquiry link; guest → Contact page + contact details).
      
      When giving answers, don't explicitly reference a knowledge base. Incorporate information naturally.
      
      Use plain, everyday UK English. Include the required markdown navigation links when directing someone to a page.

      OUTPUT (MUST FOLLOW): Reply with ONLY the message the visitor should read. Never append planning notes, policy checks, or lines like "User asks", "We need to respond", "This is disallowed", or "Must refuse".
      `;
  }

  return `${CHAT_INSTRUCTIONS}

      ${buildLoggedInUserContextBlock(context)}

      ${pageBlock}

      ${navBlock}

      ${liveStatsBlock}
      
      Use this knowledge base to answer questions:
      ${getCondensedKnowledgeBase()}
      
      If you don't know the answer to a question that is not covered in the knowledge base, 
      politely explain that you don't have that specific information yet.
      
      When giving answers based on the knowledge base, don't explicitly reference the knowledge base itself.
      Just incorporate the information naturally into your responses.
      
      Use plain UK English. Prefer page and button names. When sending someone to a section, include a markdown link from the NAVIGATION LINKS list (e.g. [Open Payment Settings](/vendor/payment-settings)).

      OUTPUT (MUST FOLLOW): Reply with ONLY the message the user should read. Never append planning notes, policy checks, or lines like "User asks", "We need to respond", "This is disallowed", or "Must refuse".
      `;
}

export async function POST(req: NextRequest) {
  try {
    const aiConfig = await resolveAiRuntimeConfig();

    if (!aiConfig.isConfigured) {
      return NextResponse.json(aiUnconfiguredPayload(), { status: 500 });
    }

    const { messages, context } = (await req.json()) as {
      messages: Message[];
      context?: ChatContext;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // GROQ only accepts role + content — drop any UI-only fields (e.g. supportCta)
    const sanitizedMessages: Message[] = messages
      .filter(
        (m): m is Message =>
          Boolean(m) &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .map(({ role, content }) => ({
        role,
        content: role === "assistant" ? toUserFacingChatReply(content) : content,
      }));

    const isVendorStorefront = context?.websiteRole === "vendor";

    // Optimize: keep the prompt small on venue booking (small models reject long context).
    const recentMessages = sanitizedMessages.slice(isVendorStorefront ? -6 : -10);

    const systemMessage = {
      role: "system" as const,
      content: buildSystemPrompt(context ?? {}),
    };

    const apiMessages: Message[] = [systemMessage, ...recentMessages];

    const result: FallbackResult = await tryModelsWithFallback(aiConfig, {
      messages: apiMessages,
      max_tokens: isVendorStorefront ? 500 : 1100,
      temperature: 0.7,
      ...AI_HIDE_REASONING,
    });

    if (!result.success) {
      const raw = String(result.error ?? "");
      const isLength =
        /reduce the length|request too large|context length|maximum context|too many tokens/i.test(
          raw,
        );
      return NextResponse.json(
        {
          error: "Error from AI provider",
          code: isLength ? "context_too_long" : "provider_error",
          status: result.status || 500,
          modelsTried: result.modelsTried,
          retryAfter: result.retryAfterHuman,
          retryAfterMs: result.retryAfterMs,
          ...aiRuntimeFailureMeta(aiConfig),
        },
        { status: result.status || 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "No response data from AI" },
        { status: 500 }
      );
    }

    const assistantMessage =
      toUserFacingChatReply(result.data.choices[0].message.content ?? "") ||
      "Sorry, I didn’t catch that. Could you say it another way?";

    return NextResponse.json({
      message: assistantMessage,
      model: result.model,
      modelUsed: result.modelUsed,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
