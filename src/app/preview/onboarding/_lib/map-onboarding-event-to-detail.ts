import type { EventDetailRoom } from "@/services/common/events/type";
import type {
  EventDetailData,
  EventDetailStepThree,
} from "@/services/vendor/events/type";
import { resolvePublicEventMapLocation } from "@/lib/event-location";
import type { OnboardingPreviewEventData } from "./onboarding-preview-types";

/** Room entry or flat `is_rooms: false` fields — matches EventPayload rooms. */
type EventContentSlice = Partial<EventDetailRoom>;

function mappedEventPin(
  event: NonNullable<OnboardingPreviewEventData["event"]>,
) {
  const pin = resolvePublicEventMapLocation(event);
  return {
    event_address: pin.address || undefined,
    lat: pin.latitude,
    long: pin.longitude,
  };

}

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
        price: d.price ?? 0,
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
      event_schedule_subtitle: roomData.event_schedule_subtitle,
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

  const eventPin = mappedEventPin(event);

  const stepOne = {
    event_id: eventId,
    step: 1,
    event_name: event.event_name,
    event_banner_image: event.event_banner_image,
    event_banner_video: event.event_banner_video,
    about_event_image: event.about_event_image,
    event_banner_heading: event.event_banner_heading,
    event_banner_sub_heading: event.event_banner_sub_heading,
    about_event_heading: event.about_event_heading,
    about_event_sub_heading: event.about_event_sub_heading,
    about_event_description: event.about_event_description,
    event_address: eventPin.event_address,
    lat: eventPin.lat,
    long: eventPin.long,
    event_schedular_title: primary?.event_schedular_title,
    event_schedule_subtitle: primary?.event_schedule_subtitle,
    event_schedular: primary?.event_schedular,
    event_schedular_background_image:
      primary?.event_schedular_background_image,
  };

  const stepTwo = {
    event_id: eventId,
    step: 2,
    is_rooms: hasRoomSystem,
    package_title: primary?.package_title,
    package_description: primary?.package_description ?? undefined,
    package_image: primary?.package_image,
    package_details: primary?.package_details,
    gallery: primary?.event_galley?.map((g) => ({ id: 0, url: g.url })),
    event_schedular_title: primary?.event_schedular_title,
    event_schedule_subtitle: primary?.event_schedule_subtitle,
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

  const stepFive = {
    event_id: eventId,
    step: 5,
    brochure_pdf: primary?.brochure_pdf,
    brochure_pdf_2: primary?.brochure_pdf_2,
    event_address: eventPin.event_address,
    lat: eventPin.lat,
    long: eventPin.long,
    ...(hasRoomSystem ? { rooms: stepFiveBrochureRooms } : {}),
  };

  const stepSix =
    primary?.packages?.length || Object.keys(stepSixDrinksRooms).length > 0
      ? {
        event_id: eventId,
        step: 6,
        drinks_option: 1,
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

  const stepSeven = event.faqs?.length
    ? { event_id: eventId, step: 7, faqs: event.faqs }
    : undefined;

  const stepEight = {
    event_id: eventId,
    step: 8,
    address: eventPin.event_address,
    contact_number: event.phone,
    latitude: eventPin.lat,
    longitude: eventPin.long,
  };

  return {
    slug: event.slug,
    is_rooms: event.is_rooms,
    banner_heading_align:
      event.banner_heading_align ?? apiData.banner_heading_align ?? null,
    banner_heading_valign:
      event.banner_heading_valign ?? apiData.banner_heading_valign ?? null,
    logo: typeof event.logo === "string" ? event.logo : null,
    email: event.email ?? undefined,
    contact_number: event.phone,
    lat: eventPin.lat,
    long: eventPin.long,
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
