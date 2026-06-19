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

export type VendorPreviewRoomRef = {
  room_id: number;
  name: string;
};

type RoomKeyedStep = { rooms?: Record<string, unknown> };

function pickRoomPayload(
  step: RoomKeyedStep | undefined,
  room: VendorPreviewRoomRef,
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
  return normalizeVendorStepTwoRooms(
    (data.stepTwo as { rooms?: unknown })?.rooms,
  )
    .filter((room) => Number(room.room_id) > 0)
    .map((room, index) => ({
      room_id: Number(room.room_id),
      name: String(room.name || "").trim() || `Room ${index + 1}`,
    }));
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
  EventDetailStepFive,
  "drink_title" | "drink_description" | "packages"
>;

type PreviewBrochureSlice = Pick<
  EventDetailStepSix,
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
  const safeIndex = Math.min(
    Math.max(roomIndex, 0),
    Math.max(rooms.length - 1, 0),
  );
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
      drinks: s5
        ? {
            drink_title: s5.drink_title,
            drink_description: s5.drink_description,
            packages: s5.packages,
          }
        : null,
      brochure: s6
        ? {
            brochure_pdf: s6.brochure_pdf,
            brochure_pdf_2: s6.brochure_pdf_2,
            event_address: s6.event_address,
          }
        : null,
      eventAddress:
        String(s6?.event_address ?? "").trim() ||
        String((data.stepFive as { event_address?: string })?.event_address ?? "")
          .trim(),
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
          event_address: String(stepFiveRoot?.event_address ?? "").trim(),
        }
      : null,
    eventAddress: String(stepFiveRoot?.event_address ?? "").trim(),
  };
}
