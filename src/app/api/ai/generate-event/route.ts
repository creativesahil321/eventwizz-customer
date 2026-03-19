import { NextRequest, NextResponse } from "next/server";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

export interface AIEventInput {
  eventName: string;
  eventType: string;
  eventDescription?: string;
  guestCount?: string;
  priceRange?: string;
  venueName?: string;
  venueCity?: string;
  venueAddress?: string;
}

export interface AIEventTicket {
  title: string;
  description: string;
  total_capacity: string;
  price: string;
}

export interface AIEventTable {
  min_persons: string;
  max_persons: string;
  price: string;
  total_tables: string;
}

export interface AIEventDate {
  event_date: string;
  booking_type: "tickets" | "tables" | "both";
  tickets: AIEventTicket[];
  tables: AIEventTable[];
  payment_type?: "full" | "deposit";
  is_deposit_enabled?: boolean;
  deposit_type?: "amount" | "percentage";
  deposit_value?: string;
  deposit_due_date?: string;
}

export interface AIEventGeneratedContent {
  stepOne: {
    event_name: string;
    event_banner_heading: string;
    event_banner_sub_heading: string;
    about_event_heading: string;
    about_event_sub_heading: string;
    about_event_description: string;
    event_schedular_title: string;
    event_schedular: Array<{ title: string; time: string }>;
  };
  stepTwo: {
    package_title: string;
    package_description: string;
    package_button_name: string;
    package_details: Array<{ title: string }>;
  };
  stepThree: {
    dates: AIEventDate[];
  };
  stepFour: {
    catering_option: number;
    menu_title: string;
    menu_description: string;
    menus: Array<{
      name: string;
      items: Array<{ title: string; description: string }>;
    }>;
  };
  stepFive: {
    drink_title: string;
    drink_description: string;
    packages: Array<{
      title: string;
      description: string;
      price: number;
      available_quantity: number;
    }>;
  };
  stepSix: {
    event_address: string;
    price_start_from: string;
    price_start_from_button_text: string;
  };
  stepSeven: {
    faqs: Array<{ question: string; answer: string }>;
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 500 }
      );
    }

    const input: AIEventInput = await req.json();

    if (!input.eventName || !input.eventType) {
      return NextResponse.json(
        { error: "Event name and type are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert event marketing copywriter. Generate professional, engaging content for an event listing on a venue booking platform.

CRITICAL RULES:
1. Return ONLY valid JSON, no explanations or markdown
2. Respect ALL character limits exactly
3. All text must be professional, engaging, and relevant to the event type
4. Times must be in HH:mm 24-hour format
5. Prices must be realistic whole numbers
6. FAQ answers should be helpful and detailed but within limits
7. Descriptions should be compelling and SEO-friendly
8. Do NOT include any HTML tags in text fields
9. IMPORTANT: If the vendor provides specific details about tickets, tables, pricing, seating, food, or capacity in the description, use those EXACT numbers and specifications.
10. For dates with booking_type "tables" or "both": include payment_type ("full" or "deposit"). If deposit, set is_deposit_enabled true and include deposit_type, deposit_value, and deposit_due_date (YYYY-MM-DD, before event_date).
11. stepFour (menu) is OPTIONAL: If the event type suggests no food/catering, set catering_option to 0 and menus to an empty array.
12. stepFive (drinks) is OPTIONAL: If the event type suggests no drinks, set packages to an empty array.`;

    const userPrompt = `Generate complete event content for:

EVENT INFO:
- Event Name: "${input.eventName}"
- Event Type: "${input.eventType}"
${input.venueName ? `- Venue: "${input.venueName}"` : ""}
${input.venueCity ? `- City: "${input.venueCity}"` : ""}
${input.venueAddress ? `- Address: "${input.venueAddress}"` : ""}
${input.guestCount ? `- Expected Guests: "${input.guestCount}"` : ""}
${input.priceRange ? `- Price Range: "${input.priceRange}"` : ""}
${input.eventDescription ? `\nVENDOR'S REQUIREMENTS (USE THESE SPECS):\n"${input.eventDescription}"` : ""}

Generate this EXACT JSON structure:

{
  "stepOne": {
    "event_name": "string (max 40 chars, the event name)",
    "event_banner_heading": "string (max 50 chars, compelling banner headline)",
    "event_banner_sub_heading": "string (max 80 chars, engaging banner tagline)",
    "about_event_heading": "string (max 50 chars, about section heading)",
    "about_event_sub_heading": "string (max 80 chars, about section subheading)",
    "about_event_description": "string (max 340 chars, event description, no HTML)",
    "event_schedular_title": "string (max 40 chars, schedule section title)",
    "event_schedular": [
      {"title": "string (max 40 chars)", "time": "HH:mm"},
      {"title": "string (max 40 chars)", "time": "HH:mm"},
      {"title": "string (max 40 chars)", "time": "HH:mm"},
      {"title": "string (max 40 chars)", "time": "HH:mm"}
    ]
  },
  "stepTwo": {
    "package_title": "string (max 40 chars, packages section title)",
    "package_description": "string (max 160 chars, packages description)",
    "package_button_name": "string (max 18 chars, CTA button text)",
    "package_details": [
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"}
    ]
  },
  "stepThree": {
    "dates": [
      {
        "event_date": "YYYY-MM-DD (2 months from now)",
        "booking_type": "both",
        "tickets": [
          {"title": "string (max 25 chars)", "description": "string (max 160 chars)", "total_capacity": "string (number)", "price": "string"},
          {"title": "string", "description": "string", "total_capacity": "string", "price": "string"}
        ],
        "tables": [
          {"min_persons": "string", "max_persons": "string", "price": "string", "total_tables": "string"},
          {"min_persons": "string", "max_persons": "string", "price": "string", "total_tables": "string"}
        ],
        "payment_type": "full",
        "is_deposit_enabled": false
      }
    ]
  },
  "stepFour": {
    "catering_option": 1,
    "menu_title": "string (max 40 chars)",
    "menu_description": "string (max 160 chars)",
    "menus": [
      {
        "name": "string (max 40 chars, category like 'Starters')",
        "items": [
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"},
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"}
        ]
      }
    ]
  },
  "stepFive": {
    "drink_title": "string (max 40 chars)",
    "drink_description": "string (max 160 chars)",
    "packages": [
      {"title": "string (max 25 chars)", "description": "string (max 160 chars)", "price": number, "available_quantity": number}
    ]
  },
  "stepSix": {
    "event_address": "${input.venueAddress || input.venueCity || ""}",
    "price_start_from": "string (realistic starting price as string, e.g. '50')",
    "price_start_from_button_text": "Book Now"
  },
  "stepSeven": {
    "faqs": [
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"}
    ]
  }
}

Make times chronologically ascending. Make prices realistic for the event type. Return ONLY the JSON.`;

    const result: FallbackResult = await tryModelsWithFallback(apiKey, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: "Failed to generate event content",
          details: result.error,
          modelsTried: result.modelsTried,
        },
        { status: result.status || 500 }
      );
    }

    const rawContent = result.data.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 500 }
      );
    }

    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No valid JSON found in response");

      const content: AIEventGeneratedContent = JSON.parse(jsonMatch[0]);
      const truncate = (str: string, max: number) =>
        str && str.length > max ? str.substring(0, max) : str || "";

      if (content.stepOne) {
        content.stepOne.event_name = truncate(content.stepOne.event_name, 40);
        content.stepOne.event_banner_heading = truncate(content.stepOne.event_banner_heading, 50);
        content.stepOne.event_banner_sub_heading = truncate(content.stepOne.event_banner_sub_heading, 80);
        content.stepOne.about_event_heading = truncate(content.stepOne.about_event_heading, 50);
        content.stepOne.about_event_sub_heading = truncate(content.stepOne.about_event_sub_heading, 80);
        content.stepOne.about_event_description = truncate(content.stepOne.about_event_description, 340);
        content.stepOne.event_schedular_title = truncate(content.stepOne.event_schedular_title, 40);
        if (content.stepOne.event_schedular) {
          content.stepOne.event_schedular = content.stepOne.event_schedular.map((s) => ({
            title: truncate(s.title, 40),
            time: /^([01]\d|2[0-3]):([0-5]\d)$/.test(s.time) ? s.time : "12:00",
          }));
        }
      }

      if (content.stepTwo) {
        content.stepTwo.package_title = truncate(content.stepTwo.package_title, 40);
        content.stepTwo.package_description = truncate(content.stepTwo.package_description, 160);
        content.stepTwo.package_button_name = truncate(content.stepTwo.package_button_name, 18);
        if (content.stepTwo.package_details) {
          content.stepTwo.package_details = content.stepTwo.package_details.map((d) => ({
            title: truncate(d.title, 40),
          }));
        }
      }

      // Enforce stepThree date validation
      if (content.stepThree?.dates) {
        const now = new Date();
        content.stepThree.dates = content.stepThree.dates.map((date, idx) => {
          const futureDate = new Date(now);
          futureDate.setMonth(futureDate.getMonth() + 2 + idx);
          const fallbackDate = futureDate.toISOString().split("T")[0];

          const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date.event_date || "");
          const eventDate = isValidDate ? date.event_date : fallbackDate;

          const validBookingTypes = ["tickets", "tables", "both"];
          const bookingType = validBookingTypes.includes(date.booking_type)
            ? date.booking_type
            : "tickets";

          const tickets = (date.tickets || []).map((t) => ({
            title: truncate(t.title || "General Admission", 25),
            description: truncate(t.description || "Standard entry ticket", 160),
            total_capacity: String(Math.max(1, Math.min(100000, parseInt(t.total_capacity) || 100))),
            price: String(Math.max(1, Math.min(9999, parseInt(t.price) || 50))),
          }));

          const tables = (date.tables || []).map((t) => ({
            min_persons: String(Math.max(1, parseInt(t.min_persons) || 2)),
            max_persons: String(Math.max(1, parseInt(t.max_persons) || 6)),
            price: String(Math.max(0, Math.min(9999, parseInt(t.price) || 100))),
            total_tables: String(Math.max(1, Math.min(5000, parseInt(t.total_tables) || 10))),
          }));

          const isTablesOrBoth = bookingType === "tables" || bookingType === "both";
          const paymentType = (date.payment_type === "deposit" ? "deposit" : "full") as "full" | "deposit";
          const isDepositEnabled = isTablesOrBoth && paymentType === "deposit" && date.is_deposit_enabled === true;

          return {
            event_date: eventDate,
            booking_type: bookingType as "tickets" | "tables" | "both",
            tickets:
              bookingType !== "tables" && tickets.length > 0
                ? tickets
                : bookingType !== "tables"
                  ? [{ title: "General Admission", description: "Standard entry ticket", total_capacity: "100", price: "50" }]
                  : [],
            tables:
              bookingType !== "tickets" && tables.length > 0
                ? tables
                : bookingType !== "tickets"
                  ? [{ min_persons: "2", max_persons: "6", price: "100", total_tables: "10" }]
                  : [],
            payment_type: isTablesOrBoth ? paymentType : "full",
            is_deposit_enabled: isTablesOrBoth ? isDepositEnabled : false,
            deposit_type: isTablesOrBoth && isDepositEnabled ? (date.deposit_type === "percentage" ? "percentage" : "amount") : undefined,
            deposit_value: isTablesOrBoth && isDepositEnabled && date.deposit_value ? String(date.deposit_value) : "",
            deposit_due_date: isTablesOrBoth && isDepositEnabled && date.deposit_due_date ? String(date.deposit_due_date) : "",
          };
        });
      } else {
        const d1 = new Date();
        d1.setMonth(d1.getMonth() + 2);
        content.stepThree = {
          dates: [
            {
              event_date: d1.toISOString().split("T")[0],
              booking_type: "both",
              tickets: [
                { title: "General Admission", description: "Standard entry with full access", total_capacity: "100", price: "50" },
                { title: "VIP Pass", description: "Premium access with exclusive perks", total_capacity: "30", price: "120" },
              ],
              tables: [
                { min_persons: "2", max_persons: "6", price: "150", total_tables: "15" },
                { min_persons: "6", max_persons: "10", price: "250", total_tables: "8" },
              ],
              payment_type: "full",
              is_deposit_enabled: false,
            },
          ],
        };
      }

      if (content.stepFour) {
        content.stepFour.menu_title = truncate(content.stepFour.menu_title, 40);
        content.stepFour.menu_description = truncate(content.stepFour.menu_description, 160);
        content.stepFour.catering_option = content.stepFour.catering_option === 0 ? 0 : 1;
      } else {
        content.stepFour = { catering_option: 0, menu_title: "", menu_description: "", menus: [] };
      }

      if (content.stepFive) {
        content.stepFive.drink_title = truncate(content.stepFive.drink_title, 40);
        content.stepFive.drink_description = truncate(content.stepFive.drink_description, 160);
        const rawPkgs = content.stepFive.packages;
        content.stepFive.packages = Array.isArray(rawPkgs) && rawPkgs.length > 0
          ? rawPkgs.map((p) => ({
              title: truncate(p.title, 25),
              description: truncate(p.description, 160),
              price: Math.max(1, Math.min(999999, Math.round(Number(p.price) || 50))),
              available_quantity: Math.max(1, Math.min(500, Math.round(Number(p.available_quantity) || 100))),
            }))
          : [];
      } else {
        content.stepFive = { drink_title: "Drinks & Packages", drink_description: "", packages: [] };
      }

      if (content.stepSeven?.faqs) {
        content.stepSeven.faqs = content.stepSeven.faqs.map((f) => ({
          question: truncate(f.question, 160),
          answer: truncate(f.answer, 500),
        }));
      }

      return NextResponse.json({
        content,
        model: result.model,
        modelUsed: result.modelUsed,
      });
    } catch (parseError) {
      console.error("Failed to parse AI event response:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("AI event generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
