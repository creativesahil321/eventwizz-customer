import { NextRequest, NextResponse } from "next/server";
import {
  KNOWLEDGE_BASE,
  CHAT_INSTRUCTIONS,
} from "@/services/common/ai/knowledge-base";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

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

  // Add condensed versions of other important info
  condensed += `
## Quick Reference
- Roles: admin (platform management), vendor (venue/event management), customer (booking)
- Partner: White-label deployment (same code, custom branding via 4 env vars)
- Admin after login: Straight to Dashboard (no welcome step). Sidebar: Dashboard, All Venues, Transaction History, Notifications, Commission Overview, Manage Roles, Staff Management, Email Template, Site Essentials, Marketing Analytics, System Logs, Support, Referrals, Sales & Marketing, Seo Tools, Dispute Resolution Centre. Payment Settings = profile (top right) → Settings → Payment Settings. Manage a venue: All Venues → click venue → venue detail (domain approval, login as venue, reset password, edit, comments).
- Onboarding: 11 steps — Venue, Site, Event, Package, Dates, Catering, Other Packages, Brochure info, FAQs, Payment, Publish. AI option generates steps 2–9; vendor reviews then does Payment (Stripe etc.) and Publish (domain).
- Deposit: Per event date, for tables (or both); set in Step 5 (Dates). Payment (Step 10): Stripe, PayPal, TrueLayer, WorldPay, Klarna. Domain: Step 11 (Publish).
- Vendor after login: Welcome — Select Location (/welcome/select-location); pick venue → Continue to Dashboard. Dashboard sidebar: Dashboard, Events, Customers, Bookings, Email Templates, Menu Choice, Transactions, Sites Essentials, Event Locations, Marketing, Newsletter, Email Logs, System Logs, Manage Roles, Staff Management, Seo Tools, Notifications, Support, Dispute Resolution, Payment Settings. Create Event = header button. Domain Settings = profile dropdown → Settings → Domain Settings (72h verify). Bookings = booking history; Transactions = payment history; Payment Settings = connect Stripe/PayPal.
- Site Essentials: Branding, colors, typography, social, SEO (per location). Event location & brochure: Step 8.
- Customer: Book on vendor subdomain: event page → pick a date (adds date to cart) → /vendor/checkout. Ticket/table/drink selection is on checkout (per date: ticket types + quantity, table types + quantity + guest allocation if multiple tables, drink packages + quantity). Login required at checkout. If payment fails at checkout, same booking appears in Bookings → open it → pay balance on booking detail. From booking detail: pay balance, Reschedule (pick new date; add-ons for that date may be removed), Add-ons tab (add tables/tickets/drinks per date). After login → /customer/dashboard. Sidebar: Dashboard, Profile, Bookings, Notifications, Transactions.
`;

  return condensed.length < KNOWLEDGE_BASE.length ? condensed : KNOWLEDGE_BASE; // Fallback to full if condensed is larger
}

// Define the message type
type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    // Get API key from environment variable
    const apiKey = env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ API key is not configured" },
        { status: 500 }
      );
    }

    // Get the messages from the request
    const { messages } = await req.json();

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Optimize: Only include recent conversation context (last 5 messages)
    // This reduces token count while maintaining context
    const recentMessages = messages.slice(-5);

    // Use condensed knowledge base to reduce token count
    const condensedKB = getCondensedKnowledgeBase();

    // Use the knowledge base and chat instructions from the imported constants
    const systemMessage = {
      role: "system",
      content: `${CHAT_INSTRUCTIONS}
      
      Use this knowledge base to answer questions:
      ${condensedKB}
      
      If you don't know the answer to a question that is not covered in the knowledge base, 
      politely explain that you don't have that specific information yet.
      
      When giving answers based on the knowledge base, don't explicitly reference the knowledge base itself.
      Just incorporate the information naturally into your responses.
      
      When helping vendors, customers, or admins: use only plain, everyday language. Do not use URLs, paths, routes, or any technical or coding terms. Give directions by page names, menu names, and button names (e.g. "Go to Bookings in the left menu", "All Venues → click the venue", "Click View Details", "Open the Add-ons tab").
      `,
    };

    // Prepare the messages for the API call
    // Use recent messages only to reduce token count
    const apiMessages: Message[] = [systemMessage, ...recentMessages];

    // Use the fallback system to try models in sequence
    const result: FallbackResult = await tryModelsWithFallback(apiKey, {
      messages: apiMessages,
      max_tokens: 800,
      temperature: 0.7,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Error from GROQ API",
          details: result.error,
          status: result.status || 500,
          modelsTried: result.modelsTried,
          retryAfter: result.retryAfterHuman,
          retryAfterMs: result.retryAfterMs,
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

    const assistantMessage = result.data.choices[0].message.content;

    // Return the AI response with model info
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
