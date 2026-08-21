import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import type {
  AIEventGeneratedContent,
  AIEventInput,
} from "@/app/api/ai/generate-event/route";
import {
  applyTicketsOnlyToDates,
  coerceAiStepFiveRooms,
  ensureOnboardingDates,
  hasUsableOnboardingDates,
} from "@/app/(on-boarding)/on-boarding/_lib/ai-onboarding-sanitize";
import {
  AI_EVENT_MIN_ROOMS,
  parseAiEventVendorIntent,
} from "./ai-event-vendor-intent";

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

/**
 * Models often omit brochure, FAQ, or date steps. Fill them so review + apply
 * never read event_address / faqs on undefined, and rooms always get dates
 * (same fallback as AI onboarding).
 */
export function fillAiEventGeneratedDefaults(
  content: Partial<AIEventGeneratedContent> | null | undefined,
  input: AIEventInput,
): AIEventGeneratedContent {
  const src = content ?? {};
  const address =
    str(src.stepSix?.event_address) ||
    str(input.venueAddress) ||
    str(input.venueCity) ||
    "United Kingdom";
  const roomNames = (input.room_names ?? [])
    .map((name) => String(name || "").trim())
    .filter((name) => name.length > 0);
  const vendorHints = parseAiEventVendorIntent(
    input.eventDescription,
    roomNames,
  );
  const useRooms =
    input.has_room_system === true && roomNames.length >= AI_EVENT_MIN_ROOMS;

  const stepOne = src.stepOne ?? {
    event_name: str(input.eventName, "Event"),
    event_banner_heading: str(input.eventName, "Event"),
    event_banner_sub_heading: "",
    about_event_heading: "About this event",
    about_event_sub_heading: "",
    about_event_description: str(input.eventDescription).slice(0, 340),
  };

  const stepTwo = {
    package_title: str(src.stepTwo?.package_title) || "Package",
    package_description:
      str(src.stepTwo?.package_description) || "Package details",
    package_details:
      Array.isArray(src.stepTwo?.package_details) &&
      src.stepTwo.package_details.length > 0
        ? src.stepTwo.package_details
        : [{ title: "Event access" }],
    event_schedular_title:
      str(src.stepTwo?.event_schedular_title) || "Event Schedule",
    event_schedule_subtitle: str(src.stepTwo?.event_schedule_subtitle),
    event_schedular:
      Array.isArray(src.stepTwo?.event_schedular) &&
      src.stepTwo.event_schedular.length > 0
        ? src.stepTwo.event_schedular
        : [{ title: "Main Event", time: "19:00" }],
    rooms: src.stepTwo?.rooms,
  };

  const dates = vendorHints.prefersTicketsOnly
    ? applyTicketsOnlyToDates(
        ensureOnboardingDates(src.stepThree?.dates, vendorHints.bookingFacts),
      )
    : ensureOnboardingDates(src.stepThree?.dates, vendorHints.bookingFacts);
  const existingRooms = coerceAiStepFiveRooms(src.stepThree?.rooms);
  const stepThree = {
    dates,
    rooms: useRooms
      ? roomNames.map((name) => {
          const existing = existingRooms.find(
            (room) => room.room_name.toLowerCase() === name.toLowerCase(),
          );
          const roomDates = ensureOnboardingDates(
            hasUsableOnboardingDates(existing?.dates)
              ? existing!.dates
              : dates,
            vendorHints.bookingFacts,
          );
          return {
            room_name: name,
            dates: vendorHints.prefersTicketsOnly
              ? applyTicketsOnlyToDates(roomDates)
              : roomDates,
          };
        })
      : [],
  };

  const stepFour = vendorHints.omitCatering
    ? {
        catering_option: 0,
        menu_title: "",
        menu_description: "",
        menus: [],
        rooms: src.stepFour?.rooms?.map((room) => ({
          ...room,
          catering_option: 0,
          menu_title: "",
          menu_description: "",
          menus: [],
        })),
      }
    : (src.stepFour ?? {
        catering_option: 0,
        menu_title: "",
        menu_description: "",
        menus: [],
      });
  const hasDrinkPackages =
    (src.stepFive?.packages ?? []).some((p) => str(p.title)) ||
    (src.stepFive?.rooms ?? []).some((room) =>
      (room.packages ?? []).some((p) => str(p.title)),
    );
  const stepFive =
    vendorHints.omitDrinks || !hasDrinkPackages
      ? {
          drink_title: "",
          drink_description: "",
          packages: [],
          rooms: (src.stepFive?.rooms ?? []).map((room) => ({
            ...room,
            drink_title: "",
            drink_description: "",
            packages: [],
          })),
        }
      : {
          drink_title: str(src.stepFive?.drink_title) || "Drinks & Packages",
          drink_description:
            str(src.stepFive?.drink_description) ||
            "Drink packages available with this event.",
          packages: src.stepFive?.packages ?? [],
          rooms: src.stepFive?.rooms?.map((room) => ({
            ...room,
            drink_title: str(room.drink_title) || "Drinks & Packages",
            drink_description:
              str(room.drink_description) ||
              "Drink packages available with this event.",
          })),
        };

  const stepSix = {
    event_address: address,
    price_start_from: str(src.stepSix?.price_start_from),
    price_start_from_button_text:
      str(src.stepSix?.price_start_from_button_text) || "Book Now",
    rooms: src.stepSix?.rooms,
  };

  const faqs = vendorHints.omitFaqs
    ? []
    : (src.stepSeven?.faqs ?? [])
        .filter((f) => str(f?.question) || str(f?.answer))
        .slice(0, STEP_NINE_MAX_FAQS);
  const stepSeven = {
    faqs:
      faqs.length > 0
        ? faqs
        : vendorHints.omitFaqs
          ? []
          : [
              {
                question: `Where is ${str(input.eventName, "the event")} held?`,
                answer: address,
              },
            ],
  };

  return {
    stepOne: {
      ...stepOne,
      event_name: str(stepOne.event_name, str(input.eventName, "Event")),
    },
    stepTwo,
    stepThree,
    stepFour,
    stepFive,
    stepSix,
    stepSeven,
  };
}
