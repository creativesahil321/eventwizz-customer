import { NextRequest, NextResponse } from "next/server";
import { tryModelsWithFallback, AI_JSON_MAX_TOKENS, type FallbackResult } from "../lib/utils";
import { AI_JSON_COMPLETION, extractJsonObject } from "../lib/extract-json";
import {
  aiRuntimeFailureMeta,
  aiUnconfiguredPayload,
  resolveAiRuntimeConfig,
} from "../lib/provider-config";
import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import {
  BANNER_HEADING_MAX_WORDS,
  truncateToMaxWords,
} from "@/lib/word-count";
import { clipFooterBrandDescription } from "@/lib/footer-brand-description";
import {
  DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
  DRINK_PACKAGE_PRICE_MAX,
  DRINK_PACKAGE_QTY_MAX,
  EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS,
  EVENT_PACKAGE_SUB_HEADING_MAX_CHARS,
  PACKAGE_BUTTON_NAME_MAX_CHARS,
  PACKAGE_DETAIL_LINE_MAX_CHARS,
  RICH_DESCRIPTION_MAX_CHARS,
} from "@/lib/event-form-limits";
import {
  fillOnboardingContentDefaults,
  buildAiOnboardingSystemPrompt,
  buildAiOnboardingUserPrompt,
  buildAiOnboardingJsonSchemaBlock,
  coerceAiStepFiveRooms,
  coerceAiDateList,
  ensureStepFiveRooms,
  ensureStepSevenRooms,
  normalizeAIDatePaymentFields,
  normalizeAiRoomNames,
  parseVendorDescriptionHints,
  sanitizeVendorDescription,
} from "@/app/(on-boarding)/on-boarding/_lib/ai-onboarding-sanitize";

export interface AIOnboardingInput {
  venueName: string;
  venueType: string;
  event_category_id?: number;
  city: string;
  address: string;
  contactNumber: string;
  email: string;
  /** When true, venueName is the brand / primary Google place for a multi-location business. */
  has_multiple_locations?: boolean;
  /** Whether venue operates multiple event spaces / room system. */
  has_room_system?: boolean;
  /** Optional room names used when has_room_system is true. */
  room_names?: string[];
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

export interface AIRoomDates {
  room_name: string;
  dates: AIDate[];
}

export interface AIRoomDrinks {
  room_name: string;
  drink_title: string;
  drink_description: string;
  packages: Array<{
    title: string;
    description: string;
    price: number;
    available_quantity: number;
  }>;
}

export interface AIGeneratedContent {
  stepTwo: {
    banner_heading: string;
    banner_sub_heading: string;
    about_title: string;
    about_description: string;
    footer_brand_description: string;
  };
  stepThree: {
    event_name: string;
    event_address?: string;
    latitude?: number;
    longitude?: number;
    event_banner_heading: string;
    event_banner_sub_heading: string;
    about_event_heading: string;
    about_event_sub_heading: string;
    about_event_description: string;
  };
  stepFour: {
    package_title: string;
    package_description: string;
    package_button_name: string;
    package_details: Array<{ title: string }>;
    event_schedular_title: string;
    event_schedule_subtitle?: string;
    event_schedular_custom_copy?: string;
    event_schedular: Array<{ title: string; time: string }>;
  };
  stepFive: {
    dates: AIDate[];
    rooms?: AIRoomDates[];
  };
  stepSix: {
    menu_title: string;
    menu_description: string;
    menus: Array<{
      name: string;
      items: Array<{ title: string; description: string }>;
    }>;
    rooms?: Array<{
      room_name: string;
      catering_option?: 0 | 1;
      menu_title?: string;
      menu_description?: string;
      menus?: Array<{
        name: string;
        items: Array<{ title: string; description: string }>;
      }>;
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
    rooms?: AIRoomDrinks[];
  };
  stepEight: {
    /** Legacy brochure/location shape retained for older AI responses. */
    event_address?: string;
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
    const aiConfig = await resolveAiRuntimeConfig();
    if (!aiConfig.isConfigured) {
      return NextResponse.json(aiUnconfiguredPayload(), { status: 500 });
    }

    const input: AIOnboardingInput = await req.json();
    input.description = sanitizeVendorDescription(input.description);
    const vendorHints = parseVendorDescriptionHints(
      input.description,
      input.room_names,
    );

    if (!input.venueName || !input.venueType) {
      return NextResponse.json(
        { error: "Venue name and type are required" },
        { status: 400 }
      );
    }

    const systemPrompt = buildAiOnboardingSystemPrompt(STEP_NINE_MAX_FAQS);
    const jsonSchemaBlock = buildAiOnboardingJsonSchemaBlock(STEP_NINE_MAX_FAQS);

    const userPrompt = buildAiOnboardingUserPrompt(
      input,
      vendorHints,
      jsonSchemaBlock,
      STEP_NINE_MAX_FAQS,
    );

    const result: FallbackResult = await tryModelsWithFallback(aiConfig, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: AI_JSON_MAX_TOKENS,
      ...AI_JSON_COMPLETION,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          error: "Failed to generate onboarding content",
          details: result.error,
          modelsTried: result.modelsTried,
          retryAfter: result.retryAfterHuman,
          retryAfterMs: result.retryAfterMs,
          lastError: result.lastError,
          ...aiRuntimeFailureMeta(aiConfig),
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
      const content = extractJsonObject<AIGeneratedContent>(rawContent, [
        "stepTwo",
      ]);

      const truncate = (str: string, max: number) =>
        str && str.length > max ? str.substring(0, max) : str || "";

      // Enforce character limits
      if (content.stepTwo) {
        content.stepTwo.banner_heading = truncateToMaxWords(
          content.stepTwo.banner_heading,
          BANNER_HEADING_MAX_WORDS,
        );
        content.stepTwo.banner_sub_heading = truncate(content.stepTwo.banner_sub_heading, 80);
        content.stepTwo.about_title = truncate(content.stepTwo.about_title, 40);
        content.stepTwo.about_description = truncate(content.stepTwo.about_description, 340);
        content.stepTwo.footer_brand_description = clipFooterBrandDescription(
          content.stepTwo.footer_brand_description ?? "",
        );
      }

      if (content.stepThree) {
        content.stepThree.event_name = truncate(content.stepThree.event_name, 40);
        content.stepThree.event_banner_heading = truncateToMaxWords(
          content.stepThree.event_banner_heading,
          BANNER_HEADING_MAX_WORDS,
        );
        content.stepThree.event_banner_sub_heading = truncate(content.stepThree.event_banner_sub_heading, 80);
        content.stepThree.about_event_heading = truncate(content.stepThree.about_event_heading, 50);
        content.stepThree.about_event_sub_heading = truncate(content.stepThree.about_event_sub_heading, 80);
        content.stepThree.about_event_description = truncate(content.stepThree.about_event_description, 340);
      }

      if (content.stepFour) {
        content.stepFour.event_schedular_title =
          content.stepFour.event_schedular_title || "Event Timeline";
        content.stepFour.package_title = truncate(
          content.stepFour.package_title,
          EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS
        );
        content.stepFour.package_description = truncate(
          content.stepFour.package_description,
          EVENT_PACKAGE_SUB_HEADING_MAX_CHARS
        );
        content.stepFour.package_button_name = truncate(
          content.stepFour.package_button_name,
          PACKAGE_BUTTON_NAME_MAX_CHARS
        );
        if (content.stepFour.package_details) {
          content.stepFour.package_details = content.stepFour.package_details.map(
            (d) => ({
              title: truncate(d.title, PACKAGE_DETAIL_LINE_MAX_CHARS),
            })
          );
        }
        content.stepFour.event_schedular_title = truncate(
          content.stepFour.event_schedular_title,
          40,
        );
        content.stepFour.event_schedule_subtitle = truncate(
          content.stepFour.event_schedule_subtitle ||
            content.stepFour.event_schedular_custom_copy ||
            "",
          160,
        );
        if (Array.isArray(content.stepFour.event_schedular)) {
          content.stepFour.event_schedular = content.stepFour.event_schedular
            .map((s) => ({
              title: truncate(s.title, 40),
              time: /^([01]\d|2[0-3]):([0-5]\d)$/.test(s.time)
                ? s.time
                : "12:00",
            }))
            .sort((a, b) => {
              const [ha, ma] = a.time.split(":").map(Number);
              const [hb, mb] = b.time.split(":").map(Number);
              return ha * 60 + ma - (hb * 60 + mb);
            });
          if (content.stepFour.event_schedular.length === 0) {
            content.stepFour.event_schedular = [
              { title: "Doors Open", time: "19:00" },
            ];
          }
        } else {
          content.stepFour.event_schedular = [
            { title: "Doors Open", time: "19:00" },
          ];
        }
      }

      const sanitizeAIDates = (
        dates: AIDate[] | undefined,
        fallbackMonthOffset = 2,
      ): AIDate[] => {
        const now = new Date();
        const inputDates = Array.isArray(dates) ? dates : [];
        const normalized = inputDates.map((date, idx) => {
          const futureDate = new Date(now);
          futureDate.setMonth(futureDate.getMonth() + fallbackMonthOffset + idx);
          const fallbackDate = futureDate.toISOString().split("T")[0];

          const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date.event_date || "");
          const todayStart = new Date(now.toISOString().split("T")[0] + "T00:00:00").getTime();
          const eventTime = isValidDate
            ? new Date(date.event_date + "T00:00:00").getTime()
            : todayStart;
          const eventDate =
            isValidDate && eventTime >= todayStart ? date.event_date : fallbackDate;

          const validBookingTypes = ["tickets", "tables", "both"];
          let bookingType = validBookingTypes.includes(date.booking_type)
            ? date.booking_type
            : "tickets";
          if (vendorHints.prefersTicketsOnly) {
            bookingType = "tickets";
          } else if (
            vendorHints.prefersTablesBooking &&
            bookingType === "tickets"
          ) {
            bookingType = "tables";
          }
          if (
            vendorHints.prefersDepositPayment &&
            (bookingType === "tables" || bookingType === "both") &&
            date.payment_type !== "full"
          ) {
            date.payment_type = "deposit";
            date.is_deposit_enabled = true;
          }

          const tickets = (date.tickets || []).map((t) => ({
            title: truncate(t.title || "Event ticket", 25),
            description: truncate(t.description || "Standard entry ticket", 160),
            total_capacity: String(
              Math.max(1, Math.min(100000, parseInt(t.total_capacity) || 100)),
            ),
            price: String(Math.max(1, Math.min(9999, parseInt(t.price) || 50))),
          }));

          const tables = (date.tables || []).map((t) => ({
            min_persons: String(Math.max(1, parseInt(t.min_persons) || 2)),
            max_persons: String(Math.max(1, parseInt(t.max_persons) || 6)),
            price: String(Math.max(0, Math.min(9999, parseInt(t.price) || 100))),
            total_tables: String(
              Math.max(1, Math.min(5000, parseInt(t.total_tables) || 10)),
            ),
          }));

          const draft: AIDate = {
            event_date: eventDate,
            booking_type: bookingType as "tickets" | "tables" | "both",
            tickets:
              bookingType !== "tables" && tickets.length > 0
                ? tickets
                : bookingType !== "tables"
                  ? [
                      {
                        title: "Event ticket",
                        description: "Standard entry ticket",
                        total_capacity: "100",
                        price: "50",
                      },
                    ]
                  : [],
            tables:
              bookingType !== "tickets" && tables.length > 0
                ? tables
                : bookingType !== "tickets"
                  ? [
                      {
                        min_persons: "2",
                        max_persons: "6",
                        price: "100",
                        total_tables: "10",
                      },
                    ]
                  : [],
            payment_type: date.payment_type,
            is_deposit_enabled: date.is_deposit_enabled,
            deposit_type: date.deposit_type,
            deposit_value: date.deposit_value
              ? String(date.deposit_value)
              : "",
            deposit_due_date: date.deposit_due_date
              ? String(date.deposit_due_date)
              : "",
          };

          return normalizeAIDatePaymentFields(draft);
        });

        const seen = new Set<string>();
        return normalized
          .sort(
            (a, b) =>
              new Date(a.event_date + "T00:00:00").getTime() -
              new Date(b.event_date + "T00:00:00").getTime(),
          )
          .filter((d) => {
            if (!d.event_date || seen.has(d.event_date)) return false;
            seen.add(d.event_date);
            return true;
          });
      };

      // Enforce stepFive validation
      content.stepFive = {
        ...content.stepFive,
        dates: coerceAiDateList(content.stepFive?.dates),
      };
      if ((content.stepFive?.dates?.length ?? 0) > 0) {
        content.stepFive.dates = sanitizeAIDates(content.stepFive.dates, 2);
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
                { title: "Event ticket", description: "Standard entry with full event access", total_capacity: "100", price: "50" },
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

      if (input.has_room_system === true) {
        const filteredRooms = coerceAiStepFiveRooms(content.stepFive?.rooms)
          .map((room, roomIdx) => ({
            room_name: truncate(String(room.room_name || "").trim(), 80),
            dates: sanitizeAIDates(
              room.dates.length > 0 ? room.dates : content.stepFive?.dates,
              2 + roomIdx,
            ),
          }))
          .filter((room) => room.room_name.length > 0);

        content.stepFive.rooms = ensureStepFiveRooms(
          filteredRooms,
          normalizeAiRoomNames(input.room_names),
          content.stepFive?.dates ?? [],
          vendorHints,
          sanitizeAIDates,
        );
      } else if (Array.isArray(content.stepFive?.rooms)) {
        content.stepFive.rooms = [];
      }

      if (content.stepSeven) {
        const rawPackages = content.stepSeven.packages;
        content.stepSeven.packages = Array.isArray(rawPackages) && rawPackages.length > 0
          ? rawPackages.map((p) => ({
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

        if (input.has_room_system === true) {
          const rawRooms = Array.isArray(content.stepSeven.rooms)
            ? content.stepSeven.rooms
            : [];
          const filteredRooms = rawRooms
            .map((room) => ({
              room_name: truncate(String(room.room_name || "").trim(), 80),
              drink_title: truncate(
                String(room.drink_title || content.stepSeven.drink_title || ""),
                40,
              ),
              drink_description: truncate(
                String(
                  room.drink_description ||
                    content.stepSeven.drink_description ||
                    "",
                ),
                160,
              ),
              packages: Array.isArray(room.packages)
                ? room.packages.map((p) => ({
                    title: truncate(p.title, DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS),
                    description: truncate(p.description, RICH_DESCRIPTION_MAX_CHARS),
                    price: Math.max(
                      1,
                      Math.min(
                        DRINK_PACKAGE_PRICE_MAX,
                        Math.round(Number(p.price) || 50),
                      ),
                    ),
                    available_quantity: Math.max(
                      1,
                      Math.min(
                        DRINK_PACKAGE_QTY_MAX,
                        Math.round(Number(p.available_quantity) || 100),
                      ),
                    ),
                  }))
                : [],
            }))
            .filter((room) => room.room_name.length > 0);

          content.stepSeven.rooms = ensureStepSevenRooms(
            filteredRooms,
            normalizeAiRoomNames(input.room_names),
            {
              drink_title: content.stepSeven.drink_title,
              drink_description: content.stepSeven.drink_description,
              packages: content.stepSeven.packages,
            },
            vendorHints,
          );
        } else if (Array.isArray(content.stepSeven.rooms)) {
          content.stepSeven.rooms = [];
        }
      } else {
        content.stepSeven = {
          drink_title: "",
          drink_description: "",
          packages: [],
        };
      }

      if (content.stepNine?.faqs) {
        content.stepNine.faqs = content.stepNine.faqs
          .slice(0, STEP_NINE_MAX_FAQS)
          .map((f) => ({
            question: truncate(f.question, 160),
            answer: truncate(f.answer, 500),
          }));
      }

      const filled = fillOnboardingContentDefaults(content, {
        ...input,
        bookingFacts: vendorHints.bookingFacts,
      });

      return NextResponse.json({
        content: filled,
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
