import { NextRequest, NextResponse } from "next/server";
import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";
import {
  BANNER_HEADING_MAX_WORDS,
  truncateToMaxWords,
} from "@/lib/word-count";
import {
  DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
  DRINK_PACKAGE_PRICE_MAX,
  DRINK_PACKAGE_QTY_MAX,
  DRINK_SECTION_DESCRIPTION_MAX_CHARS,
  DRINK_SECTION_TITLE_MAX_CHARS,
  RICH_DESCRIPTION_MAX_CHARS,
} from "@/lib/event-form-limits";
import type { AIDate, AIRoomDates, AIRoomDrinks } from "@/app/api/ai/generate-onboarding/route";
import { normalizeAIDatePaymentFields } from "@/app/(on-boarding)/on-boarding/_lib/ai-onboarding-sanitize";
import {
  AI_EVENT_MAX_ROOMS,
  AI_EVENT_MIN_ROOMS,
  buildAiEventJsonSchemaBlock,
  buildAiEventSystemPrompt,
  buildAiEventUserPrompt,
  ensureStepFiveEventDrinkRooms,
  ensureStepThreeEventRooms,
  parseAiEventVendorIntent,
  type AIEventRoomBrochure,
  type AIEventRoomMenu,
  type AIEventRoomPackage,
} from "@/app/(protected)/vendor/events/_lib/ai-event-vendor-intent";

export interface AIEventInput {
  eventName: string;
  eventType: string;
  eventDescription?: string;
  guestCount?: string;
  priceRange?: string;
  venueName?: string;
  venueCity?: string;
  venueAddress?: string;
  has_room_system?: boolean;
  room_names?: string[];
  /** Existing venue room ids when user picked rooms in AI create (multiselect). */
  selected_room_ids?: number[];
}

export type { AIEventRoomPackage, AIEventRoomMenu, AIEventRoomBrochure };

const AI_EVENT_MIN_ROOMS_LOCAL = AI_EVENT_MIN_ROOMS;
const AI_EVENT_MAX_ROOMS_LOCAL = AI_EVENT_MAX_ROOMS;

function normalizeAiEventRoomNames(roomNames: string[] | undefined): string[] {
  const unique = Array.from(
    new Set(
      (roomNames ?? [])
        .map((name) => String(name || "").trim())
        .filter((name) => name.length > 0),
    ),
  ).slice(0, AI_EVENT_MAX_ROOMS_LOCAL);

  if (unique.length >= AI_EVENT_MIN_ROOMS_LOCAL) return unique;
  if (unique.length === 1) return [unique[0], "Room 2"];
  return ["Room 1", "Room 2"];
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
  };
  stepTwo: {
    package_title: string;
    package_description: string;
    package_details: Array<{ title: string }>;
    event_schedular_title: string;
    event_schedule_subtitle: string;
    event_schedular: Array<{ title: string; time: string }>;
    rooms?: AIEventRoomPackage[];
  };
  stepThree: {
    dates: AIEventDate[];
    rooms?: AIRoomDates[];
  };
  stepFour: {
    catering_option: number;
    menu_title: string;
    menu_description: string;
    menus: Array<{
      name: string;
      items: Array<{ title: string; description: string }>;
    }>;
    rooms?: AIEventRoomMenu[];
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
    rooms?: AIRoomDrinks[];
  };
  stepSix: {
    event_address: string;
    price_start_from: string;
    price_start_from_button_text: string;
    rooms?: AIEventRoomBrochure[];
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

    const addressTrimmed = input.venueAddress?.trim() ?? "";
    if (addressTrimmed.length < 5) {
      return NextResponse.json(
        { error: "Event address is required (where the event takes place)" },
        { status: 400 }
      );
    }

    const normalizedRoomNames = normalizeAiEventRoomNames(input.room_names);
    const hasRoomSystem =
      input.has_room_system === true &&
      normalizedRoomNames.length >= AI_EVENT_MIN_ROOMS_LOCAL;

    const vendorHints = parseAiEventVendorIntent(
      input.eventDescription,
      normalizedRoomNames,
    );

    const jsonSchemaBlock = buildAiEventJsonSchemaBlock(
      input,
      hasRoomSystem,
      normalizedRoomNames,
      STEP_NINE_MAX_FAQS,
    );

    const systemPrompt = buildAiEventSystemPrompt(STEP_NINE_MAX_FAQS);
    const userPrompt = buildAiEventUserPrompt({
      input,
      hints: vendorHints,
      hasRoomSystem,
      roomNames: normalizedRoomNames,
      jsonSchemaBlock,
      maxFaqs: STEP_NINE_MAX_FAQS,
    });

    const result: FallbackResult = await tryModelsWithFallback(apiKey, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4500,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: "Failed to generate event content",
          details: result.error,
          modelsTried: result.modelsTried,
          retryAfter: result.retryAfterHuman,
          retryAfterMs: result.retryAfterMs,
          lastError: result.lastError,
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
        content.stepOne.event_banner_heading = truncateToMaxWords(
          content.stepOne.event_banner_heading,
          BANNER_HEADING_MAX_WORDS,
        );
        content.stepOne.event_banner_sub_heading = truncate(content.stepOne.event_banner_sub_heading, 80);
        content.stepOne.about_event_heading = truncate(content.stepOne.about_event_heading, 50);
        content.stepOne.about_event_sub_heading = truncate(content.stepOne.about_event_sub_heading, 80);
        content.stepOne.about_event_description = truncate(content.stepOne.about_event_description, 340);

      }

      if (content.stepTwo) {
        content.stepTwo.package_title = truncate(content.stepTwo.package_title, 40);
        content.stepTwo.package_description = truncate(content.stepTwo.package_description, 160);
        if (content.stepTwo.package_details) {
          content.stepTwo.package_details = content.stepTwo.package_details.map((d) => ({
            title: truncate(d.title, 40),
          }));
          content.stepTwo.event_schedular_title = truncate(content.stepTwo.event_schedular_title, 40);
          content.stepTwo.event_schedule_subtitle = truncate(content.stepTwo.event_schedule_subtitle, 160);
          if (content.stepTwo.event_schedular) {
            content.stepTwo.event_schedular = content.stepTwo.event_schedular.map((s) => ({
              title: truncate(s.title, 40),
              time: /^([01]\d|2[0-3]):([0-5]\d)$/.test(s.time) ? s.time : "12:00",
            }));
          }
          content.stepTwo.event_schedular.sort((a, b) => {
            const [ha, ma] = a.time.split(":").map(Number);
            const [hb, mb] = b.time.split(":").map(Number);
            return ha * 60 + ma - (hb * 60 + mb);
          });
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
          const todayStart = new Date(now.toISOString().split("T")[0] + "T00:00:00").getTime();
          const eventTime = isValidDate ? new Date(date.event_date + "T00:00:00").getTime() : todayStart;
          const eventDate = isValidDate && eventTime >= todayStart ? date.event_date : fallbackDate;

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
        // Sort by event_date ascending and remove duplicates
        const seen = new Set<string>();
        content.stepThree.dates = content.stepThree.dates
          .sort(
            (a, b) =>
              new Date(a.event_date + "T00:00:00").getTime() -
              new Date(b.event_date + "T00:00:00").getTime()
          )
          .filter((d) => {
            if (!d.event_date || seen.has(d.event_date)) return false;
            seen.add(d.event_date);
            return true;
          })
          .map((d) => normalizeAIDatePaymentFields(d as AIDate) as AIEventDate);

        if (vendorHints.wantsBothTicketsAndTables) {
          content.stepThree.dates = content.stepThree.dates.map((d) => {
            if (d.booking_type === "tickets") {
              return normalizeAIDatePaymentFields({
                ...(d as AIDate),
                booking_type: "both",
                tables:
                  (d.tables?.length ?? 0) > 0
                    ? (d.tables as AIDate["tables"])
                    : [{ min_persons: "2", max_persons: "8", price: "100", total_tables: "20" }],
              }) as AIEventDate;
            }
            return d;
          });
        }

        if (vendorHints.prefersDepositPayment) {
          content.stepThree.dates = content.stepThree.dates.map((d) => {
            if (d.booking_type !== "tables" && d.booking_type !== "both") return d;
            return normalizeAIDatePaymentFields({
              ...(d as AIDate),
              payment_type: "deposit",
              is_deposit_enabled: true,
              deposit_type:
                d.deposit_type === "amount" ? "amount" : ("percentage" as const),
              deposit_value: d.deposit_value || "25",
            }) as AIEventDate;
          });
        }
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

      if (hasRoomSystem && content.stepThree) {
        const baseDates = (content.stepThree.dates ?? []) as AIDate[];
        const sanitizeRoomDates = (dates: AIDate[] | undefined): AIDate[] =>
          (dates ?? []).map((d) => normalizeAIDatePaymentFields(d));

        const filteredRooms = Array.isArray(content.stepThree.rooms)
          ? content.stepThree.rooms
              .map((room) => ({
                room_name: truncate(String(room.room_name ?? "").trim(), 80),
                dates: sanitizeRoomDates(room.dates as AIDate[]),
              }))
              .filter((room) => room.room_name.length > 0)
          : [];

        content.stepThree.rooms = ensureStepThreeEventRooms(
          filteredRooms,
          normalizedRoomNames,
          baseDates,
          vendorHints,
          (dates, _offset) => {
            const sanitized = sanitizeRoomDates(dates as AIDate[]);
            return sanitized.length > 0 ? sanitized : baseDates;
          },
        );
      } else if (content.stepThree?.rooms) {
        content.stepThree.rooms = [];
      }

      if (content.stepFour) {
        content.stepFour.menu_title = truncate(content.stepFour.menu_title, 40);
        content.stepFour.menu_description = truncate(content.stepFour.menu_description, 160);
        content.stepFour.catering_option = content.stepFour.catering_option === 0 ? 0 : 1;
      } else {
        content.stepFour = { catering_option: 0, menu_title: "", menu_description: "", menus: [] };
      }

      if (content.stepFive) {
        content.stepFive.drink_title = truncate(
          content.stepFive.drink_title,
          DRINK_SECTION_TITLE_MAX_CHARS
        );
        content.stepFive.drink_description = truncate(
          content.stepFive.drink_description,
          DRINK_SECTION_DESCRIPTION_MAX_CHARS
        );
        const rawPkgs = content.stepFive.packages;
        content.stepFive.packages = Array.isArray(rawPkgs) && rawPkgs.length > 0
          ? rawPkgs.map((p) => ({
            title: truncate(p.title, DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS),
            description: truncate(p.description, RICH_DESCRIPTION_MAX_CHARS),
            price: Math.max(
              1,
              Math.min(
                DRINK_PACKAGE_PRICE_MAX,
                Math.round(Number(p.price) || 50)
              )
            ),
            available_quantity: Math.max(
              1,
              Math.min(
                DRINK_PACKAGE_QTY_MAX,
                Math.round(Number(p.available_quantity) || 100)
              )
            ),
          }))
          : [];
      } else {
        content.stepFive = { drink_title: "Drinks & Packages", drink_description: "", packages: [] };
      }

      if (hasRoomSystem && content.stepFive) {
        content.stepFive.rooms = ensureStepFiveEventDrinkRooms(
          content.stepFive.rooms,
          normalizedRoomNames,
          {
            drink_title: content.stepFive.drink_title,
            drink_description: content.stepFive.drink_description,
            packages: content.stepFive.packages,
          },
          vendorHints,
        );
      } else if (content.stepFive?.rooms) {
        content.stepFive.rooms = [];
      }

      if (content.stepSeven?.faqs) {
        content.stepSeven.faqs = content.stepSeven.faqs
          .slice(0, STEP_NINE_MAX_FAQS)
          .map((f) => ({
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
