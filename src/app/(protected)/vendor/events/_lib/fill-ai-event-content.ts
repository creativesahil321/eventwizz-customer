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
  ensureStepFiveEventDrinkRooms,
  parseAiEventVendorIntent,
  resolveRoomMenuFields,
} from "./ai-event-vendor-intent";
import { normalizeVendorStepFourMenus } from "./vendor-step-four-rooms";
import { resolveAiDrinksEnabled } from "./vendor-step-six-rooms";

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

const FALLBACK_AI_EVENT_MENUS = [
  {
    name: "Starters",
    items: [
      {
        title: "Soup of the day",
        description: "Chef's seasonal soup with artisan bread",
      },
      {
        title: "Garden salad",
        description: "Fresh leaves, house dressing, toasted seeds",
      },
    ],
  },
  {
    name: "Mains",
    items: [
      {
        title: "Roast chicken",
        description: "Herb-roasted chicken with seasonal vegetables",
      },
      {
        title: "Pan-seared salmon",
        description: "With lemon butter and crushed potatoes",
      },
    ],
  },
  {
    name: "Dessert",
    items: [
      {
        title: "Seasonal pudding",
        description: "Chef's dessert of the day",
      },
    ],
  },
];

function menusHaveItems(menus: unknown): boolean {
  return normalizeVendorStepFourMenus(menus).some((menu) =>
    menu.items.some((item) => item.title.length > 0),
  );
}

function firstMenusFromStepFour(stepFour: {
  menus?: unknown;
  rooms?: Array<{ menus?: unknown }>;
} | undefined) {
  const top = normalizeVendorStepFourMenus(stepFour?.menus);
  if (menusHaveItems(top)) return top;
  for (const room of stepFour?.rooms ?? []) {
    const roomMenus = normalizeVendorStepFourMenus(room.menus);
    if (menusHaveItems(roomMenus)) return roomMenus;
  }
  return [];
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
    str(src.stepOne?.event_address) ||
    str(src.stepSix?.event_address) ||
    str(input.venueAddress) ||
    str(input.venueCity) ||
    "";
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

  const catalogMenus = vendorHints.bookingFacts.menuCourses ?? [];
  const sharedMenus = menusHaveItems(src.stepFour?.menus)
    ? normalizeVendorStepFourMenus(src.stepFour?.menus)
    : firstMenusFromStepFour(src.stepFour);
  const resolvedSharedMenus =
    sharedMenus.length > 0
      ? sharedMenus
      : catalogMenus.length > 0
        ? catalogMenus
        : FALLBACK_AI_EVENT_MENUS;
  const sharedMenuTitle =
    str(src.stepFour?.menu_title) || "Dining menu";
  const sharedMenuDescription =
    str(src.stepFour?.menu_description) ||
    `Seasonal dishes prepared for ${str(input.eventName, "this event")}.`;

  const stepFour = vendorHints.omitCatering
    ? {
        catering_option: 0,
        menu_title: "",
        menu_description: "",
        menus: [],
        rooms: useRooms
          ? roomNames.map((room_name) => ({
              room_name,
              catering_option: 0,
              menu_title: "",
              menu_description: "",
              menus: [],
            }))
          : src.stepFour?.rooms?.map((room) => ({
              ...room,
              catering_option: 0,
              menu_title: "",
              menu_description: "",
              menus: [],
            })),
      }
    : {
        catering_option: 1,
        menu_title: sharedMenuTitle,
        menu_description: sharedMenuDescription,
        menus: resolvedSharedMenus,
        rooms: useRooms
          ? roomNames.map((room_name) => {
              const resolved = resolveRoomMenuFields(
                room_name,
                {
                  catering_option: 1,
                  menu_title: sharedMenuTitle,
                  menu_description: sharedMenuDescription,
                  menus: resolvedSharedMenus,
                },
                src.stepFour?.rooms,
              );
              return {
                room_name,
                catering_option: 1,
                menu_title: resolved.menu_title,
                menu_description: resolved.menu_description,
                menus: normalizeVendorStepFourMenus(resolved.menus),
              };
            })
          : src.stepFour?.rooms?.map((room) => ({
              ...room,
              menus: normalizeVendorStepFourMenus(
                menusHaveItems(room.menus) ? room.menus : resolvedSharedMenus,
              ),
            })),
      };
  const catalogDrinkPackages = (vendorHints.bookingFacts.drinkPackages ?? []).map(
    (item) => ({
      title: item.title,
      description: item.title,
      price: item.price,
      available_quantity: 100,
    }),
  );
  const hasDrinkPackages =
    (src.stepFive?.packages ?? []).some((p) => str(p.title)) ||
    (src.stepFive?.rooms ?? []).some((room) =>
      (room.packages ?? []).some((p) => str(p.title)),
    ) ||
    catalogDrinkPackages.length > 0;
  const resolvedDrinkPackages =
    (src.stepFive?.packages ?? []).some((p) => str(p.title))
      ? (src.stepFive?.packages ?? [])
      : catalogDrinkPackages;
  const stepFive =
    vendorHints.omitDrinks || !hasDrinkPackages
      ? {
          drinks_option: 0 as const,
          drink_title: "",
          drink_description: "",
          packages: [],
          rooms: useRooms
            ? roomNames.map((room_name) => ({
                room_name,
                drinks_option: 0 as const,
                drink_title: "",
                drink_description: "",
                packages: [],
              }))
            : (src.stepFive?.rooms ?? []).map((room) => ({
                ...room,
                drinks_option: 0 as const,
                drink_title: "",
                drink_description: "",
                packages: [],
              })),
        }
      : {
          drinks_option: 1 as const,
          drink_title: str(src.stepFive?.drink_title) || "Drinks & Packages",
          drink_description:
            str(src.stepFive?.drink_description) ||
            "Drink packages available with this event.",
          packages: resolvedDrinkPackages,
          rooms: useRooms
            ? ensureStepFiveEventDrinkRooms(
                src.stepFive?.rooms,
                roomNames,
                {
                  drinks_option: 1,
                  drink_title: str(src.stepFive?.drink_title) || "Drinks & Packages",
                  drink_description:
                    str(src.stepFive?.drink_description) ||
                    "Drink packages available with this event.",
                  packages: resolvedDrinkPackages,
                },
                vendorHints,
              )
            : src.stepFive?.rooms?.map((room) => {
                const roomEnabled = resolveAiDrinksEnabled(room) === 1;
                if (!roomEnabled) {
                  return {
                    ...room,
                    drinks_option: 0 as const,
                    drink_title: "",
                    drink_description: "",
                    packages: [],
                  };
                }
                return {
                  ...room,
                  drinks_option: 1 as const,
                  drink_title: str(room.drink_title) || "Drinks & Packages",
                  drink_description:
                    str(room.drink_description) ||
                    "Drink packages available with this event.",
                };
              }),
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
      event_address: address,
      latitude: Number.isFinite(Number(input.venueLatitude))
        ? Number(input.venueLatitude)
        : undefined,
      longitude: Number.isFinite(Number(input.venueLongitude))
        ? Number(input.venueLongitude)
        : undefined,
    },
    stepTwo,
    stepThree,
    stepFour,
    stepFive,
    stepSix,
    stepSeven,
  };
}
