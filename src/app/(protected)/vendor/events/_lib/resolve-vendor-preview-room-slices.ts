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

export type VendorPreviewRoomRef = {
  room_id: number;
  name: string;
  /** True when the room has no bookable dates — shown but not selectable. */
  disabled?: boolean;
};

type RoomKeyedStep = { rooms?: Record<string, unknown> };

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

function roomHasBookableDates(
  stepThree: RoomKeyedStep | undefined,
  room: Pick<VendorPreviewRoomRef, "room_id" | "name">,
): boolean {
  const payload = pickRoomPayload(stepThree, room);
  return Array.isArray(payload?.dates) && payload.dates.length > 0;
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
  "drink_title" | "drink_description" | "packages"
>;

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
  menu: PreviewMenuSlice | null;
  drinks: PreviewDrinksSlice | null;
  brochure: PreviewBrochureSlice | null;
  eventAddress: string;
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
    const s3 = data.stepThree;
    const s4 = data.stepFour;
    // Vendor form + API: step 1 = location, step 5 = brochures, step 6 = drinks.
    const s1 = data.stepOne;
    const s5 = data.stepFive;
    const s6 = data.stepSix;
    return {
      roomMode: false,
      rooms: [],
      activeRoom: null,
      package: null,
      dates: s3?.dates,
      menu: s4
        ? {
            menu_title: s4.menu_title,
            menu_description: s4.menu_description,
            catering_option: s4.catering_option,
            menus: s4.menus,
            menu_background_image: s4.menu_background_image,
          }
        : null,
      drinks: s6
        ? {
            drink_title: s6.drink_title,
            drink_description: s6.drink_description,
            packages: s6.packages,
          }
        : null,
      brochure: s5
        ? {
            brochure_pdf: s5.brochure_pdf,
            brochure_pdf_2: s5.brochure_pdf_2,
            event_address: s1?.event_address || s5.event_address,
          }
        : null,
      eventAddress: String(s1?.event_address || s5?.event_address || "").trim(),
    };
  }

  const datesPayload = pickRoomPayload(
    data.stepThree as RoomKeyedStep,
    activeRoom,
  );
  const menuPayload = pickRoomPayload(data.stepFour as RoomKeyedStep, activeRoom);
  const brochurePayload = pickRoomPayload(
    data.stepFive as RoomKeyedStep,
    activeRoom,
  );
  const drinksPayload = pickRoomPayload(data.stepSix as RoomKeyedStep, activeRoom);

  const stepOneRoot = data.stepOne as
    | { event_address?: string }
    | undefined;
  const stepFiveRoot = data.stepFive as { event_address?: string } | undefined;

  return {
    roomMode: true,
    rooms,
    activeRoom,
    package: activePackage,
    dates: Array.isArray(datesPayload?.dates)
      ? (datesPayload.dates as VendorPreviewActiveSlices["dates"])
      : [],
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
    drinks: drinksPayload
      ? {
          drink_title: String(drinksPayload.drink_title ?? ""),
          drink_description: String(drinksPayload.drink_description ?? ""),
          packages: Array.isArray(drinksPayload.packages)
            ? (drinksPayload.packages as PreviewDrinksSlice["packages"])
            : [],
        }
      : {
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
          event_address: String(
            stepOneRoot?.event_address || stepFiveRoot?.event_address || "",
          ).trim(),
        }
      : null,
    eventAddress: String(
      stepOneRoot?.event_address || stepFiveRoot?.event_address || "",
    ).trim(),
  };
}
