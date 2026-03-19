import { NextRequest, NextResponse } from "next/server";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

export interface AIOnboardingInput {
  venueName: string;
  venueType: string;
  event_category_id?: number;
  city: string;
  address: string;
  contactNumber: string;
  email: string;
  eventType?: string;
  guestCount?: string;
  priceRange?: string;
  description?: string;
}

export interface AITicket {
  title: string;
  description: string;
  total_capacity: string;
  price: string;
}

export interface AITable {
  min_persons: string;
  max_persons: string;
  price: string;
  total_tables: string;
}

export interface AIDate {
  event_date: string;
  booking_type: "tickets" | "tables" | "both";
  tickets: AITicket[];
  tables: AITable[];
  payment_type?: "full" | "deposit";
  is_deposit_enabled?: boolean;
  deposit_type?: "amount" | "percentage";
  deposit_value?: string;
  deposit_due_date?: string;
}

export interface AIGeneratedContent {
  stepTwo: {
    banner_heading: string;
    banner_sub_heading: string;
    about_title: string;
    about_description: string;
    about_link_title: string;
  };
  stepThree: {
    event_name: string;
    event_banner_heading: string;
    event_banner_sub_heading: string;
    about_event_heading: string;
    about_event_sub_heading: string;
    about_event_description: string;
    event_schedular_title: string;
    event_schedular: Array<{ title: string; time: string }>;
  };
  stepFour: {
    package_title: string;
    package_description: string;
    package_button_name: string;
    package_details: Array<{ title: string }>;
  };
  stepFive: {
    dates: AIDate[];
  };
  stepSix: {
    menu_title: string;
    menu_description: string;
    menus: Array<{
      name: string;
      items: Array<{ title: string; description: string }>;
    }>;
  };
  stepSeven: {
    drink_title: string;
    drink_description: string;
    packages: Array<{
      title: string;
      description: string;
      price: number;
      available_quantity: number;
    }>;
  };
  stepEight: {
    event_address: string;
    price_start_from: string;
    price_start_from_button_text: string;
    location: { title: string; description: string };
  };
  stepNine: {
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

    const input: AIOnboardingInput = await req.json();

    if (!input.venueName || !input.venueType) {
      return NextResponse.json(
        { error: "Venue name and type are required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert event venue marketing copywriter. Generate professional, engaging content for an event venue website. 

CRITICAL RULES:
1. Return ONLY valid JSON, no explanations or markdown
2. Respect ALL character limits exactly
3. All text must be professional, engaging, and relevant to the venue type
4. Times must be in HH:mm 24-hour format
5. Prices must be realistic whole numbers
6. FAQ answers should be helpful and detailed but within limits
7. Descriptions should be compelling and SEO-friendly
8. Do NOT include any HTML tags in text fields unless specifically stated
9. IMPORTANT: If the vendor provides specific details about tickets, tables, pricing, seating, food, or capacity in the "Additional Info", use those EXACT numbers and specifications in stepFive (dates/tickets/tables), stepSix (menu), and stepSeven (drinks). Always honor the vendor's stated preferences over defaults.
10. For dates with booking_type "tables" or "both": include payment_type ("full" or "deposit"). If deposit is used, set is_deposit_enabled true and include deposit_type ("amount" or "percentage"), deposit_value (e.g. "50" for £50 or "25" for 25%), and deposit_due_date (YYYY-MM-DD, before event_date).
11. stepFive.dates: event_date must be YYYY-MM-DD. List dates in chronological ascending order (earliest first). No duplicate event_dates. Each event_date should be today or in the future.
11. stepSix (menu) is OPTIONAL: some venues have no catering. If the venue type or vendor info suggests no food/catering, set menus to an empty array [] and keep menu_title/menu_description short; the vendor can also remove the menu section in review.
12. stepSeven (drinks) is OPTIONAL: some venues have no drink packages. If the venue type or vendor info suggests no drinks/beverage packages, set packages to an empty array [] and keep drink_title/drink_description short; the vendor can also remove the drinks section in review.`;

    const userPrompt = `Generate complete event venue website content for:

VENUE INFO:
- Name: "${input.venueName}"
- Type: "${input.venueType}"
- City: "${input.city}"
- Address: "${input.address}"
${input.eventType ? `- Event Type: "${input.eventType}"` : ""}
${input.guestCount ? `- Typical Guest Count: "${input.guestCount}"` : ""}
${input.priceRange ? `- Price Range: "${input.priceRange}"` : ""}
${input.description ? `\nVENDOR'S DETAILED REQUIREMENTS (USE THESE EXACT SPECS FOR TICKETS/TABLES/PRICING):\n"${input.description}"` : ""}

Generate this EXACT JSON structure:

{
  "stepTwo": {
    "banner_heading": "string (max 50 chars, compelling headline for landing page)",
    "banner_sub_heading": "string (max 80 chars, engaging tagline)",
    "about_title": "string (max 40 chars, title for about section)",
    "about_description": "string (max 340 chars / 50 words, professional about text, no HTML)",
    "about_link_title": "string (max 18 chars, CTA button text like 'Explore Events')"
  },
  "stepThree": {
    "event_name": "string (max 40 chars, name for the main event)",
    "event_banner_heading": "string (max 50 chars, event page banner heading)",
    "event_banner_sub_heading": "string (max 80 chars, event page banner subheading)",
    "about_event_heading": "string (max 50 chars, about event section heading)",
    "about_event_sub_heading": "string (max 80 chars, about event section subheading)",
    "about_event_description": "string (max 340 chars, event description, no HTML)",
    "event_schedular_title": "string (max 40 chars, schedule section title)",
    "event_schedular": [
      {"title": "string (max 40 chars)", "time": "HH:mm"},
      {"title": "string (max 40 chars)", "time": "HH:mm"},
      {"title": "string (max 40 chars)", "time": "HH:mm"},
      {"title": "string (max 40 chars)", "time": "HH:mm"}
    ]
  },
  "stepFour": {
    "package_title": "string (max 40 chars, packages section title)",
    "package_description": "string (max 160 chars, packages section description)",
    "package_button_name": "string (max 18 chars, package CTA button)",
    "package_details": [
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"},
      {"title": "string (max 40 chars, package feature)"}
    ]
  },
  "stepFive": {
    "dates": [
      {
        "event_date": "YYYY-MM-DD (a date 2 months from now)",
        "booking_type": "both",
        "tickets": [
          {"title": "string (max 25 chars)", "description": "string (max 160 chars)", "total_capacity": "string (number)", "price": "string"},
          {"title": "string (e.g. 'VIP Pass')", "description": "string", "total_capacity": "string", "price": "string"}
        ],
        "tables": [
          {"min_persons": "string", "max_persons": "string", "price": "string", "total_tables": "string"},
          {"min_persons": "string", "max_persons": "string", "price": "string", "total_tables": "string"}
        ],
        "payment_type": "full or deposit",
        "is_deposit_enabled": false,
        "deposit_type": "amount or percentage (only when payment_type is deposit)",
        "deposit_value": "string (e.g. 50 for £50 or 25 for 25%, only when deposit enabled)",
        "deposit_due_date": "YYYY-MM-DD (before event_date, only when deposit enabled)"
      },
      {
        "event_date": "YYYY-MM-DD (later than first date; no duplicates)",
        "booking_type": "tickets",
        "tickets": [
          {"title": "string (e.g. 'Early Bird')", "description": "string", "total_capacity": "string", "price": "string"},
          {"title": "string (e.g. 'Standard')", "description": "string", "total_capacity": "string", "price": "string"}
        ],
        "tables": [],
        "payment_type": "full"
      }
    ]
  },
  "stepSix": {
    "menu_title": "string (max 40 chars, menu section title)",
    "menu_description": "string (max 160 chars, menu section description)",
    "menus": [
      {
        "name": "string (max 40 chars, category name like 'Starters')",
        "items": [
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"},
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"},
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"}
        ]
      },
      {
        "name": "string (max 40 chars, category name like 'Main Course')",
        "items": [
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"},
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"},
          {"title": "string (max 40 chars)", "description": "string (max 160 chars)"}
        ]
      }
    ]
  },
  "stepSeven": {
    "drink_title": "string (max 40 chars, drinks section title)",
    "drink_description": "string (max 160 chars, drinks section description)",
    "packages": "array of drink packages, OR empty array [] if venue has no drink packages",
    "packages item": {"title": "string (max 25 chars)", "description": "string (max 160 chars)", "price": number, "available_quantity": number}
  },
  "stepEight": {
    "event_address": "${input.address || input.city}",
    "price_start_from": "string (realistic starting price number as string, e.g. '50')",
    "price_start_from_button_text": "Book Now",
    "location": {
      "title": "string (max 40 chars, location section title)",
      "description": "string (max 160 chars, location section description)"
    }
  },
  "stepNine": {
    "faqs": [
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"},
      {"question": "string (max 160 chars)", "answer": "string (max 500 chars)"}
    ]
  }
}

Make times chronologically ascending. Make prices realistic for the venue type and location. Return ONLY the JSON.`;

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
          error: "Failed to generate onboarding content",
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
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const content: AIGeneratedContent = JSON.parse(jsonMatch[0]);

      const truncate = (str: string, max: number) =>
        str && str.length > max ? str.substring(0, max) : str || "";

      // Enforce character limits
      if (content.stepTwo) {
        content.stepTwo.banner_heading = truncate(content.stepTwo.banner_heading, 50);
        content.stepTwo.banner_sub_heading = truncate(content.stepTwo.banner_sub_heading, 80);
        content.stepTwo.about_title = truncate(content.stepTwo.about_title, 40);
        content.stepTwo.about_description = truncate(content.stepTwo.about_description, 340);
        content.stepTwo.about_link_title = truncate(content.stepTwo.about_link_title, 18);
      }

      if (content.stepThree) {
        content.stepThree.event_name = truncate(content.stepThree.event_name, 40);
        content.stepThree.event_banner_heading = truncate(content.stepThree.event_banner_heading, 50);
        content.stepThree.event_banner_sub_heading = truncate(content.stepThree.event_banner_sub_heading, 80);
        content.stepThree.about_event_heading = truncate(content.stepThree.about_event_heading, 50);
        content.stepThree.about_event_sub_heading = truncate(content.stepThree.about_event_sub_heading, 80);
        content.stepThree.about_event_description = truncate(content.stepThree.about_event_description, 340);
        content.stepThree.event_schedular_title = truncate(content.stepThree.event_schedular_title, 40);

        if (content.stepThree.event_schedular) {
          content.stepThree.event_schedular = content.stepThree.event_schedular.map((s) => ({
            title: truncate(s.title, 40),
            time: /^([01]\d|2[0-3]):([0-5]\d)$/.test(s.time) ? s.time : "12:00",
          }));
        }
      }

      if (content.stepFour) {
        content.stepFour.package_title = truncate(content.stepFour.package_title, 40);
        content.stepFour.package_description = truncate(content.stepFour.package_description, 160);
        content.stepFour.package_button_name = truncate(content.stepFour.package_button_name, 18);
        if (content.stepFour.package_details) {
          content.stepFour.package_details = content.stepFour.package_details.map((d) => ({
            title: truncate(d.title, 40),
          }));
        }
      }

      // Enforce stepFive validation
      if (content.stepFive?.dates) {
        const now = new Date();
        content.stepFive.dates = content.stepFive.dates.map((date, idx) => {
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
          const isDepositEnabled = isTablesOrBoth && paymentType === "deposit" && (date.is_deposit_enabled === true);

          return {
            event_date: eventDate,
            booking_type: bookingType as "tickets" | "tables" | "both",
            tickets: bookingType !== "tables" && tickets.length > 0
              ? tickets
              : bookingType !== "tables"
              ? [{ title: "General Admission", description: "Standard entry ticket", total_capacity: "100", price: "50" }]
              : [],
            tables: bookingType !== "tickets" && tables.length > 0
              ? tables
              : bookingType !== "tickets"
              ? [{ min_persons: "2", max_persons: "6", price: "100", total_tables: "10" }]
              : [],
            payment_type: isTablesOrBoth ? paymentType : "full",
            is_deposit_enabled: isTablesOrBoth ? (isDepositEnabled && paymentType === "deposit") : false,
            deposit_type: isTablesOrBoth && isDepositEnabled ? (date.deposit_type === "percentage" ? "percentage" : "amount") : undefined,
            deposit_value: isTablesOrBoth && isDepositEnabled && date.deposit_value ? String(date.deposit_value) : "",
            deposit_due_date: isTablesOrBoth && isDepositEnabled && date.deposit_due_date ? String(date.deposit_due_date) : "",
          };
        });
        // Sort by event_date ascending and remove duplicates
        const seen = new Set<string>();
        content.stepFive.dates = content.stepFive.dates
          .sort(
            (a, b) =>
              new Date(a.event_date + "T00:00:00").getTime() -
              new Date(b.event_date + "T00:00:00").getTime()
          )
          .filter((d) => {
            if (!d.event_date || seen.has(d.event_date)) return false;
            seen.add(d.event_date);
            return true;
          });
      } else {
        // Fallback: generate default dates if AI missed stepFive
        const d1 = new Date();
        d1.setMonth(d1.getMonth() + 2);
        const d2 = new Date();
        d2.setMonth(d2.getMonth() + 3);
        content.stepFive = {
          dates: [
            {
              event_date: d1.toISOString().split("T")[0],
              booking_type: "both",
              tickets: [
                { title: "General Admission", description: "Standard entry with full event access", total_capacity: "100", price: "50" },
                { title: "VIP Pass", description: "Premium access with exclusive perks", total_capacity: "30", price: "120" },
              ],
              tables: [
                { min_persons: "2", max_persons: "6", price: "150", total_tables: "15" },
                { min_persons: "6", max_persons: "10", price: "250", total_tables: "8" },
              ],
              payment_type: "full",
              is_deposit_enabled: false,
              deposit_type: "amount",
              deposit_value: "",
              deposit_due_date: "",
            },
            {
              event_date: d2.toISOString().split("T")[0],
              booking_type: "tickets",
              tickets: [
                { title: "Early Bird", description: "Early booking ticket", total_capacity: "150", price: "35" },
                { title: "Standard", description: "Regular entry ticket", total_capacity: "200", price: "55" },
              ],
              tables: [],
              payment_type: "full",
            },
          ],
        };
      }

      if (content.stepSeven) {
        const rawPackages = content.stepSeven.packages;
        content.stepSeven.packages = Array.isArray(rawPackages) && rawPackages.length > 0
          ? rawPackages.map((p) => ({
              title: truncate(p.title, 25),
              description: truncate(p.description, 160),
              price: Math.max(1, Math.min(999999, Math.round(Number(p.price) || 50))),
              available_quantity: Math.max(1, Math.min(500, Math.round(Number(p.available_quantity) || 100))),
            }))
          : [];
      } else {
        content.stepSeven = {
          drink_title: "Drinks & Packages",
          drink_description: "",
          packages: [],
        };
      }

      if (content.stepNine?.faqs) {
        content.stepNine.faqs = content.stepNine.faqs.map((f) => ({
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
      console.error("Failed to parse AI onboarding response:", parseError);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("AI onboarding generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
