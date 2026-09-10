import {
  normalizeVendorStepTwoRooms,
  parseEventIsRoomsFlag,
  type VendorStepTwoRoomForm,
} from "@/lib/event-form-limits";
import type {
  EventDetailData,
  EventDetailStepFour,
  EventDetailStepFive,
  EventDetailStepSix,
  EventDetailStepThree,
} from "@/services/vendor/events/type";
import {
  lowestBookableFromPrice,
  pickRoomHighlights,
  resolveRoomThumbnailUrl,
  type EventRoomChooserItem,
} from "@/lib/event-room-chooser-item";
import { resolveEventLocation } from "@/lib/event-location";
import { resolveDrinksOptionFlag } from "@/app/(protected)/vendor/events/_lib/vendor-step-six-rooms";
import {
  findStepThreeDatesForRoom,
  normalizeVendorStepThreeDateRow,
  normalizeVendorStepThreeRooms,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-three-rooms";

export type VendorPreviewRoomRef = {
  room_id: number;
  name: string;
  /** True when the room has no bookable dates — shown but not selectable. */
  disabled?: boolean;
};

type RoomKeyedStep = { rooms?: Record<string, unknown> };

function pickPublicRootRoomPayload(
  data: EventDetailData,
  room: Pick<VendorPreviewRoomRef, "room_id" | "name"> | null,
): Record<string, unknown> | undefined {
  if (!room) return undefined;
  const rooms = (data as { rooms?: unknown }).rooms;
  if (!rooms || typeof rooms !== "object") return undefined;
  return pickRoomPayload({ rooms: rooms as Record<string, unknown> }, room);
}

function pickRoomPayload(
  step: RoomKeyedStep | undefined,
  room: Pick<VendorPreviewRoomRef, "room_id" | "name">,
): Record<string, unknown> | undefined {
  const rooms = step?.rooms;
  if (!rooms || typeof rooms !== "object") return undefined;

  const byName = rooms[room.name];
  if (byName && typeof byName === "object") {
    return byName as Record<string, unknown>;
  }

  for (const payload of Object.values(rooms)) {
    if (!payload || typeof payload !== "object") continue;
    const id = Number((payload as { room_id?: unknown }).room_id);
    if (Number.isFinite(id) && id > 0 && id === room.room_id) {
      return payload as Record<string, unknown>;
    }
  }
  return undefined;
}

function readPreviewEventDate(raw: Record<string, unknown>): string {
  const direct = raw.event_date ?? raw.date;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (Array.isArray(raw.event_dates) && raw.event_dates[0] != null) {
    return String(raw.event_dates[0]).trim();
  }
  return "";
}

function normalizePreviewDates(
  dates: unknown,
): NonNullable<EventDetailStepThree["dates"]> {
  if (!Array.isArray(dates)) return [];
  return dates
    .filter((row): row is Record<string, unknown> =>
      Boolean(row && typeof row === "object"),
    )
    .map((row) => {
      const normalized = normalizeVendorStepThreeDateRow(row);
      const eventDate = normalized.event_date || readPreviewEventDate(row);
      return {
        ...normalized,
        event_date: eventDate,
      };
    })
    .filter((row) => row.event_date.length > 0) as NonNullable<
    EventDetailStepThree["dates"]
  >;
}

function meaningfulScheduleRows(
  rows: unknown,
): Array<{ time: string; title: string }> {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((item) => ({
      title: String(
        (item as { title?: string | null } | null)?.title ?? "",
      ).trim(),
      time: String((item as { time?: string | null } | null)?.time ?? "").trim(),
    }))
    .filter((item) => item.title || item.time);
}

function resolvePreviewSchedule(
  roomPackage: VendorStepTwoRoomForm | null,
  data: EventDetailData,
  activeRoom: VendorPreviewRoomRef | null = null,
): {
  event_schedular: Array<{ time: string; title: string }>;
  event_schedular_title: string;
  event_schedule_subtitle: string;
  event_schedular_background_image: string | null;
} {
  const publicRoom = pickPublicRootRoomPayload(data, activeRoom);
  const roomRows = meaningfulScheduleRows(roomPackage?.event_schedular);
  const publicRoomRows = meaningfulScheduleRows(publicRoom?.event_schedular);
  const stepTwoRows = meaningfulScheduleRows(data.stepTwo?.event_schedular);
  const stepOneRows = meaningfulScheduleRows(data.stepOne?.event_schedular);
  const rows = roomRows.length
    ? roomRows
    : publicRoomRows.length
      ? publicRoomRows
      : stepTwoRows.length
        ? stepTwoRows
        : stepOneRows;

  const background =
    (typeof roomPackage?.event_schedular_background_image === "string"
      ? roomPackage.event_schedular_background_image
      : null) ||
    (typeof publicRoom?.event_schedular_background_image === "string"
      ? publicRoom.event_schedular_background_image
      : null) ||
    (typeof data.stepTwo?.event_schedular_background_image === "string"
      ? data.stepTwo.event_schedular_background_image
      : null) ||
    (typeof data.stepOne?.event_schedular_background_image === "string"
      ? data.stepOne.event_schedular_background_image
      : null);

  return {
    event_schedular: rows,
    event_schedular_title:
      String(roomPackage?.event_schedular_title ?? "").trim() ||
      String(publicRoom?.event_schedular_title ?? "").trim() ||
      String(data.stepTwo?.event_schedular_title ?? "").trim() ||
      String(data.stepOne?.event_schedular_title ?? "").trim(),
    event_schedule_subtitle:
      String(roomPackage?.event_schedule_subtitle ?? "").trim() ||
      String(publicRoom?.event_schedule_subtitle ?? "").trim() ||
      String(data.stepTwo?.event_schedule_subtitle ?? "").trim(),
    event_schedular_background_image: background,
  };
}

/**
 * Room-keyed dates first (live public slices), then the same recoveries the
 * editor hydrate uses: room_id list, then flat `stepThree.dates`.
 */
function resolvePreviewDates(
  data: EventDetailData,
  activeRoom: VendorPreviewRoomRef | null,
  roomMode: boolean,
): EventDetailStepThree["dates"] {
  const stepThree = data.stepThree as
    | (EventDetailStepThree & RoomKeyedStep)
    | undefined;

  const rootDates = normalizePreviewDates(
    (data as { dates?: unknown }).dates,
  );

  if (!roomMode || !activeRoom) {
    const flat = normalizePreviewDates(stepThree?.dates);
    return flat.length > 0 ? flat : rootDates;
  }

  const keyed = pickRoomPayload(stepThree, activeRoom);
  const keyedDates = normalizePreviewDates(keyed?.dates);
  if (keyedDates.length > 0) return keyedDates;

  const normalizedRooms = normalizeVendorStepThreeRooms(stepThree?.rooms);
  const byId = normalizePreviewDates(
    findStepThreeDatesForRoom(normalizedRooms, activeRoom.room_id),
  );
  if (byId.length > 0) return byId;

  const publicRoomDates = normalizePreviewDates(
    pickPublicRootRoomPayload(data, activeRoom)?.dates,
  );
  if (publicRoomDates.length > 0) return publicRoomDates;

  const flat = normalizePreviewDates(stepThree?.dates);
  if (flat.length > 0) return flat;
  if (rootDates.length > 0) return rootDates;

  const firstDated = normalizedRooms.find((room) => room.dates.length > 0);
  return normalizePreviewDates(firstDated?.dates);
}

function roomHasBookableDates(
  stepThree: (RoomKeyedStep & { dates?: unknown }) | undefined,
  room: Pick<VendorPreviewRoomRef, "room_id" | "name">,
): boolean {
  const payload = pickRoomPayload(stepThree, room);
  if (Array.isArray(payload?.dates) && payload.dates.length > 0) return true;
  const byId = findStepThreeDatesForRoom(
    normalizeVendorStepThreeRooms(stepThree?.rooms),
    room.room_id,
  );
  if (byId.length > 0) return true;
  return (
    Array.isArray(stepThree?.dates) &&
    normalizePreviewDates(stepThree.dates).length > 0
  );
}

export function isVendorEventRoomPreviewMode(data: EventDetailData): boolean {
  const rooms = listVendorPreviewRooms(data);
  if (rooms.length >= 2) {
    return true;
  }
  const stepTwo = data.stepTwo as { is_rooms?: boolean | number | string } | undefined;
  return (
    parseEventIsRoomsFlag(data.is_rooms ?? stepTwo?.is_rooms) === 1 &&
    rooms.length > 0
  );
}

/** Active rooms for preview — keyed list from `stepTwo.rooms` only (ignores stale step 3+ keys). */
export function listVendorPreviewRooms(
  data: EventDetailData,
): VendorPreviewRoomRef[] {
  const stepThree = data.stepThree as RoomKeyedStep | undefined;
  return normalizeVendorStepTwoRooms(
    (data.stepTwo as { rooms?: unknown })?.rooms,
  )
    .filter((room) => Number(room.room_id) > 0)
    .map((room, index) => {
      const ref = {
        room_id: Number(room.room_id),
        name: String(room.name || "").trim() || `Room ${index + 1}`,
      };
      return {
        ...ref,
        disabled: !roomHasBookableDates(stepThree, ref),
      };
    });
}

/** First room that still has dates; falls back to 0 when none are bookable. */
export function firstBookableVendorPreviewRoomIndex(
  data: EventDetailData,
): number {
  const rooms = listVendorPreviewRooms(data);
  const idx = rooms.findIndex((room) => !room.disabled);
  return idx >= 0 ? idx : 0;
}

/**
 * Card summaries for the vendor event preview "Choose Your Room" section.
 * Mirrors the public event page model (thumbnail, from-price, highlights).
 */
export function listVendorPreviewRoomSummaries(
  data: EventDetailData,
): EventRoomChooserItem[] {
  const rooms = listVendorPreviewRooms(data);
  const stepTwoRooms = normalizeVendorStepTwoRooms(
    (data.stepTwo as { rooms?: unknown })?.rooms,
  );

  const bannerFallback = resolveRoomThumbnailUrl(
    typeof data.stepOne?.event_banner_image === "string"
      ? data.stepOne.event_banner_image
      : null,
  );

  return rooms.map((room, index) => {
    const pkg =
      stepTwoRooms.find((entry) => Number(entry.room_id) === room.room_id) ??
      stepTwoRooms[index];

    const drinksPayload = pickRoomPayload(
      data.stepSix as RoomKeyedStep,
      room,
    );
    const drinkPackages = Array.isArray(drinksPayload?.packages)
      ? (drinksPayload.packages as Array<{
          title?: string;
          price?: string | number;
        }>)
      : [];

    const galleryUrl = (() => {
      const gallery = pkg?.gallery;
      if (!Array.isArray(gallery)) return null;
      for (const item of gallery) {
        if (typeof item === "object" && item && "url" in item) {
          const url = resolveRoomThumbnailUrl(
            (item as { url?: string }).url,
          );
          if (url) return url;
        }
      }
      return null;
    })();

    const inclusionHighlights = pickRoomHighlights(
      (pkg?.package_details ?? []).map((detail) => detail.title),
      3,
    );
    const highlights =
      inclusionHighlights.length > 0
        ? inclusionHighlights
        : pickRoomHighlights(
            drinkPackages.map((drink) => drink.title),
            3,
          );

    const datesPayload = pickRoomPayload(
      data.stepThree as RoomKeyedStep,
      room,
    );
    const datePrices: Array<string | number | null | undefined> = [];
    if (Array.isArray(datesPayload?.dates)) {
      for (const row of datesPayload.dates) {
        if (!row || typeof row !== "object") continue;
        const date = row as {
          price?: string | number;
          tickets?: Array<{ price?: string | number }>;
          tables?: Array<{ price?: string | number }>;
        };
        if (date.price != null) datePrices.push(date.price);
        for (const ticket of date.tickets ?? []) {
          if (ticket?.price != null) datePrices.push(ticket.price);
        }
        for (const table of date.tables ?? []) {
          if (table?.price != null) datePrices.push(table.price);
        }
      }
    }

    return {
      room_id: room.room_id,
      name: room.name,
      index,
      thumbnail:
        resolveRoomThumbnailUrl(pkg?.package_image) ||
        galleryUrl ||
        bannerFallback,
      fromPrice: lowestBookableFromPrice({
        datePrices,
        packagePrices: drinkPackages.map((drink) => drink.price),
      }),
      packageCount: drinkPackages.length,
      highlights,
      disabled: room.disabled,
    };
  });
}

type PreviewMenuSlice = Pick<
  EventDetailStepFour,
  | "menu_title"
  | "menu_description"
  | "catering_option"
  | "menus"
  | "menu_background_image"
>;

type PreviewDrinksSlice = Pick<
  EventDetailStepSix,
  "drinks_option" | "drink_title" | "drink_description" | "packages"
>;

function toPreviewDrinksSlice(
  payload:
    | {
        drinks_option?: unknown;
        drink_title?: unknown;
        drink_description?: unknown;
        packages?: unknown;
      }
    | null
    | undefined,
): PreviewDrinksSlice | null {
  if (!payload) return null;
  const drinks_option = resolveDrinksOptionFlag(payload);
  if (drinks_option !== 1) {
    return {
      drinks_option: 0,
      drink_title: "",
      drink_description: "",
      packages: [],
    };
  }
  return {
    drinks_option: 1,
    drink_title: String(payload.drink_title ?? ""),
    drink_description: String(payload.drink_description ?? ""),
    packages: Array.isArray(payload.packages)
      ? (payload.packages as PreviewDrinksSlice["packages"])
      : [],
  };
}

type PreviewBrochureSlice = Pick<
  EventDetailStepFive,
  "brochure_pdf" | "brochure_pdf_2" | "event_address"
>;

export type VendorPreviewActiveSlices = {
  roomMode: boolean;
  rooms: VendorPreviewRoomRef[];
  activeRoom: VendorPreviewRoomRef | null;
  package: VendorStepTwoRoomForm | null;
  dates: EventDetailStepThree["dates"];
  event_schedular: Array<{ time: string; title: string }>;
  event_schedular_title: string;
  event_schedule_subtitle: string;
  event_schedular_background_image: string | null;
  menu: PreviewMenuSlice | null;
  drinks: PreviewDrinksSlice | null;
  brochure: PreviewBrochureSlice | null;
  eventAddress: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
};

export function resolveVendorPreviewActiveSlices(
  data: EventDetailData,
  roomIndex: number,
): VendorPreviewActiveSlices {
  const rooms = listVendorPreviewRooms(data);
  const roomMode = isVendorEventRoomPreviewMode(data);
  const requestedIndex = Math.min(
    Math.max(roomIndex, 0),
    Math.max(rooms.length - 1, 0),
  );
  // Never activate a date-less room — snap to the first bookable one.
  const safeIndex =
    rooms[requestedIndex]?.disabled
      ? firstBookableVendorPreviewRoomIndex(data)
      : requestedIndex;
  const activeRoom = roomMode ? (rooms[safeIndex] ?? null) : null;

  const stepTwoRooms = normalizeVendorStepTwoRooms(
    (data.stepTwo as { rooms?: unknown })?.rooms,
  );
  const activePackage =
    roomMode && activeRoom
      ? (stepTwoRooms.find((r) => Number(r.room_id) === activeRoom.room_id) ??
        stepTwoRooms[safeIndex] ??
        null)
      : null;

  if (!roomMode || !activeRoom) {
    const s4 = data.stepFour;
    // Vendor form + API: step 1 = location, step 5 = brochures, step 6 = drinks.
    const s1 = data.stepOne;
    const s5 = data.stepFive;
    const s6 = data.stepSix;
    const eventLocation = resolveEventLocation(s1, s5, data.stepEight);
    const schedule = resolvePreviewSchedule(null, data);
    return {
      roomMode: false,
      rooms: [],
      activeRoom: null,
      package: null,
      dates: resolvePreviewDates(data, null, false),
      ...schedule,
      menu: s4
        ? {
            menu_title: s4.menu_title,
            menu_description: s4.menu_description,
            catering_option: s4.catering_option,
            menus: s4.menus,
            menu_background_image: s4.menu_background_image,
          }
        : null,
      drinks: toPreviewDrinksSlice(s6),
      brochure: s5
        ? {
            brochure_pdf: s5.brochure_pdf,
            brochure_pdf_2: s5.brochure_pdf_2,
            event_address: eventLocation.address,
          }
        : null,
      eventAddress: eventLocation.address,
      eventLatitude: eventLocation.latitude,
      eventLongitude: eventLocation.longitude,
    };
  }

  const menuPayload = pickRoomPayload(data.stepFour as RoomKeyedStep, activeRoom);
  const brochurePayload = pickRoomPayload(
    data.stepFive as RoomKeyedStep,
    activeRoom,
  );
  const drinksPayload = pickRoomPayload(data.stepSix as RoomKeyedStep, activeRoom);

  const stepOneRoot = data.stepOne as
    | {
        event_address?: string;
        latitude?: number | string | null;
        longitude?: number | string | null;
        lat?: number | string | null;
        long?: number | string | null;
      }
    | undefined;
  const stepFiveRoot = data.stepFive as { event_address?: string } | undefined;
  const eventLocation = resolveEventLocation(
    stepOneRoot,
    brochurePayload,
    stepFiveRoot,
    data.stepEight,
  );

  const schedule = resolvePreviewSchedule(activePackage, data, activeRoom);

  return {
    roomMode: true,
    rooms,
    activeRoom,
    package: activePackage,
    dates: resolvePreviewDates(data, activeRoom, true),
    ...schedule,
    menu: menuPayload
      ? {
          menu_title: String(menuPayload.menu_title ?? ""),
          menu_description: String(menuPayload.menu_description ?? ""),
          catering_option:
            menuPayload.catering_option === true ||
            menuPayload.catering_option === 1
              ? 1
              : 0,
          menus: Array.isArray(menuPayload.menus)
            ? (menuPayload.menus as PreviewMenuSlice["menus"])
            : [],
          menu_background_image:
            typeof menuPayload.menu_background_image === "string"
              ? menuPayload.menu_background_image
              : null,
        }
      : {
          menu_title: "",
          menu_description: "",
          catering_option: 0,
          menus: [],
        },
    drinks: toPreviewDrinksSlice(
      drinksPayload as
        | {
            drinks_option?: unknown;
            drink_title?: unknown;
            drink_description?: unknown;
            packages?: unknown;
          }
        | undefined,
    ) ?? {
      drinks_option: 0,
      drink_title: "",
      drink_description: "",
      packages: [],
    },
    brochure: brochurePayload
      ? {
          brochure_pdf:
            typeof brochurePayload.brochure_pdf === "string"
              ? brochurePayload.brochure_pdf
              : null,
          brochure_pdf_2:
            typeof brochurePayload.brochure_pdf_2 === "string"
              ? brochurePayload.brochure_pdf_2
              : null,
          event_address: eventLocation.address,
        }
      : null,
    eventAddress: eventLocation.address,
    eventLatitude: eventLocation.latitude,
    eventLongitude: eventLocation.longitude,
  };
}
