import type {
  EventDetailData,
  EventDetailStepThree,
} from "@/services/vendor/events/type";
import type { OnboardingPreviewEventData } from "./use-onboarding-preview-queries";

/** Shared slice shape — either a room entry or flat single-event fields on `event`. */
type EventContentSlice = {
  room_id?: number;
  event_schedular_title?: string;
  event_schedular_background_image?: string | null;
  event_schedular?: Array<{ time: string; title: string }>;
  package_title?: string;
  package_description?: string;
  package_image?: string | null;
  package_details?: Array<{ title: string }>;
  dates?: Array<{
    event_date: string;
    price: number;
    sold_out: boolean;
  }>;
  event_galley?: Array<{ url: string }>;
  menu_title?: string;
  menu_background_image?: string | null;
  menu_description?: string;
  menus?: Array<{
    name: string;
    items: Array<{ title: string; description: string }>;
  }>;
  drink_title?: string;
  drink_description?: string;
  packages?: Array<{
    id: number;
    title: string;
    description: string;
    price: string;
    available_quantity: number;
  }>;
  event_address?: string;
  lat?: string;
  long?: string;
  brochure_pdf?: string | null;
  brochure_pdf_2?: string | null;
};

function mapDatesToStepThree(
  dates: EventContentSlice["dates"],
): EventDetailStepThree["dates"] {
  if (!dates?.length) return undefined;
  return dates.map((d) => ({
    event_date: d.event_date,
    booking_type: "tickets" as const,
    total_ticket_types: 1,
    tickets: [
      {
        id: 0,
        event_date_id: 0,
        title: "General Admission",
        description: "Standard entry",
        price: d.price,
        total_capacity: 100,
        sold_tickets: 0,
      },
    ],
  }));
}

/**
 * Multi-room events nest content under `event.rooms`.
 * Single-room / `is_rooms: false` payloads put the same fields on `event` itself.
 */
function resolvePrimaryEventContent(
  event: NonNullable<OnboardingPreviewEventData["event"]>,
): { slice: EventContentSlice | null; hasRoomSystem: boolean } {
  const roomEntries = event.rooms ? Object.entries(event.rooms) : [];
  const hasRoomSystem = Boolean(event.is_rooms) && roomEntries.length > 0;

  if (hasRoomSystem) {
    return { slice: roomEntries[0]?.[1] ?? null, hasRoomSystem: true };
  }

  const flat = event as EventContentSlice;
  const hasFlatContent =
    Boolean(flat.package_title?.trim()) ||
    Boolean(flat.event_schedular?.length) ||
    Boolean(flat.dates?.length) ||
    Boolean(flat.menus?.length) ||
    Boolean(flat.packages?.length) ||
    Boolean(flat.event_galley?.length);

  return { slice: hasFlatContent ? flat : null, hasRoomSystem: false };
}

/**
 * Maps the onboarding site-essentials `event` payload into `EventDetailData`
 * for `EventPreview` (room selector + per-room slices).
 */
export function mapOnboardingEventToDetailData(
  apiData: OnboardingPreviewEventData,
): EventDetailData | null {
  const event = apiData.event;
  if (!event) return null;

  const eventId =
    typeof event.event_id === "number" &&
    Number.isFinite(event.event_id) &&
    event.event_id > 0
      ? event.event_id
      : 0;

  const { slice: primary, hasRoomSystem } = resolvePrimaryEventContent(event);
  const roomEntries = event.rooms ? Object.entries(event.rooms) : [];

  const stepTwoRooms: Record<string, Record<string, unknown>> = {};
  const stepThreeRooms: Record<string, Record<string, unknown>> = {};
  const stepFourRooms: Record<string, Record<string, unknown>> = {};
  const stepFiveBrochureRooms: Record<string, Record<string, unknown>> = {};
  const stepSixDrinksRooms: Record<string, Record<string, unknown>> = {};

  for (const [roomName, roomData] of roomEntries) {
    stepTwoRooms[roomName] = {
      room_id: roomData.room_id,
      name: roomName,
      package_title: roomData.package_title,
      package_description: roomData.package_description,
      package_image: roomData.package_image,
      package_details: roomData.package_details,
      gallery: roomData.event_galley?.map((g) => ({ id: 0, url: g.url })),
      event_schedular_title: roomData.event_schedular_title,
      event_schedular: roomData.event_schedular,
      event_schedular_background_image:
        roomData.event_schedular_background_image,
    };

    stepThreeRooms[roomName] = {
      room_id: roomData.room_id,
      dates: mapDatesToStepThree(roomData.dates),
    };

    if (roomData.menus?.length) {
      stepFourRooms[roomName] = {
        room_id: roomData.room_id,
        catering_option: 1,
        menu_title: roomData.menu_title,
        menu_description: roomData.menu_description,
        menu_background_image: roomData.menu_background_image,
        menus: roomData.menus,
      };
    }

    stepFiveBrochureRooms[roomName] = {
      room_id: roomData.room_id,
      brochure_pdf: roomData.brochure_pdf,
      brochure_pdf_2: roomData.brochure_pdf_2,
      event_address: roomData.event_address,
    };

    if (roomData.packages?.length) {
      stepSixDrinksRooms[roomName] = {
        room_id: roomData.room_id,
        drink_title: roomData.drink_title,
        drink_description: roomData.drink_description,
        packages: roomData.packages,
      };
    }
  }

  const stepOne = {
    event_id: eventId,
    step: 1,
    event_name: event.event_name,
    event_banner_image: event.event_banner_image,
    event_banner_video: event.event_banner_video,
    event_banner_heading: event.event_banner_heading,
    event_banner_sub_heading: event.event_banner_sub_heading,
    about_event_heading: event.about_event_heading,
    about_event_sub_heading: event.about_event_sub_heading,
    about_event_description: event.about_event_description,
    event_schedular_title: primary?.event_schedular_title,
    event_schedular: primary?.event_schedular,
    event_schedular_background_image:
      primary?.event_schedular_background_image,
  };

  const stepTwo = {
    event_id: eventId,
    step: 2,
    is_rooms: hasRoomSystem,
    package_title: primary?.package_title,
    package_description: primary?.package_description,
    package_image: primary?.package_image,
    package_details: primary?.package_details,
    gallery: primary?.event_galley?.map((g) => ({ id: 0, url: g.url })),
    event_schedular_title: primary?.event_schedular_title,
    event_schedular: primary?.event_schedular,
    event_schedular_background_image:
      primary?.event_schedular_background_image,
    ...(hasRoomSystem ? { rooms: stepTwoRooms } : {}),
  };

  const stepThreeDates = mapDatesToStepThree(primary?.dates);
  const stepThree = stepThreeDates?.length
    ? {
        event_id: eventId,
        step: 3,
        dates: stepThreeDates,
        ...(hasRoomSystem ? { rooms: stepThreeRooms } : {}),
      }
    : hasRoomSystem
      ? { event_id: eventId, step: 3, rooms: stepThreeRooms }
      : undefined;

  const stepFour =
    primary?.menus?.length || Object.keys(stepFourRooms).length > 0
      ? {
          event_id: eventId,
          step: 4,
          catering_option: primary?.menus?.length ? 1 : 0,
          menu_title: primary?.menu_title,
          menu_description: primary?.menu_description,
          menu_background_image: primary?.menu_background_image,
          menus: primary?.menus,
          ...(hasRoomSystem ? { rooms: stepFourRooms } : {}),
        }
      : undefined;

  const stepFive =
    primary?.packages?.length || Object.keys(stepSixDrinksRooms).length > 0
      ? {
          event_id: eventId,
          step: 5,
          drink_title: primary?.drink_title,
          drink_description: primary?.drink_description,
          packages:
            primary?.packages?.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              price: p.price,
              available_quantity: p.available_quantity,
            })) ?? [],
          ...(hasRoomSystem ? { rooms: stepSixDrinksRooms } : {}),
        }
      : undefined;

  const stepSix = {
    event_id: eventId,
    step: 6,
    brochure_pdf: primary?.brochure_pdf,
    brochure_pdf_2: primary?.brochure_pdf_2,
    event_address: primary?.event_address ?? event.event_address,
    ...(hasRoomSystem ? { rooms: stepFiveBrochureRooms } : {}),
  };

  const stepSeven = event.faqs?.length
    ? { event_id: eventId, step: 7, faqs: event.faqs }
    : undefined;

  const stepEight = {
    event_id: eventId,
    step: 8,
    address: event.address ?? event.event_address,
    contact_number: event.phone,
    latitude: primary?.lat ?? event.lat,
    longitude: primary?.long ?? event.long,
  };

  return {
    slug: event.slug,
    is_rooms: event.is_rooms,
    logo: event.logo,
    email: event.email ?? undefined,
    contact_number: event.phone,
    lat: primary?.lat ?? event.lat,
    long: primary?.long ?? event.long,
    stepOne,
    stepTwo,
    stepThree,
    stepFour,
    stepFive,
    stepSix,
    stepSeven,
    stepEight,
  };
}
