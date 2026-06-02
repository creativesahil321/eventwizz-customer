import type { StepFiveType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";

export type VendorStepFiveRoomEntry = {
  room_id: number;
  brochure_pdf?: string | File | null;
  brochure_pdf_2?: string | File | null;
  remove_brochure_pdf?: boolean;
  remove_brochure_pdf_2?: boolean;
};

const hasBrochurePdf = (value: unknown): boolean => {
  if (value instanceof File) return true;
  if (typeof value === "string" && value.trim().length > 0) return true;
  return false;
};

function mapPayloadToRoomEntry(
  payload: Record<string, unknown>,
): VendorStepFiveRoomEntry | null {
  const roomId = Number(payload.room_id);
  if (!Number.isFinite(roomId) || roomId <= 0) return null;

  const bp = payload.brochure_pdf;
  const bp2 = payload.brochure_pdf_2;

  return {
    room_id: roomId,
    brochure_pdf:
      typeof bp === "string"
        ? bp.trim() || null
        : bp instanceof File
          ? bp
          : null,
    brochure_pdf_2:
      typeof bp2 === "string"
        ? bp2.trim() || null
        : bp2 instanceof File
          ? bp2
          : null,
    remove_brochure_pdf: payload.remove_brochure_pdf === true,
    remove_brochure_pdf_2: payload.remove_brochure_pdf_2 === true,
  };
}

/** API may return `stepFive.rooms` as a name-keyed object or an array. */
export function normalizeVendorStepFiveRooms(
  raw: unknown,
): VendorStepFiveRoomEntry[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        mapPayloadToRoomEntry((item || {}) as Record<string, unknown>),
      )
      .filter((item): item is VendorStepFiveRoomEntry => item !== null);
  }

  if (typeof raw === "object") {
    return Object.values(raw as Record<string, Record<string, unknown>>)
      .map((payload) => mapPayloadToRoomEntry(payload || {}))
      .filter((item): item is VendorStepFiveRoomEntry => item !== null);
  }

  return [];
}

export function defaultVendorStepFiveRoomBrochure(): Omit<
  VendorStepFiveRoomEntry,
  "room_id"
> {
  return {
    brochure_pdf: null,
    brochure_pdf_2: null,
    remove_brochure_pdf: false,
    remove_brochure_pdf_2: false,
  };
}

export function syncStepFiveRoomsFromStepTwo(
  stepTwoRooms: Array<{ room_id?: number; name?: string }>,
  existing: VendorStepFiveRoomEntry[],
): VendorStepFiveRoomEntry[] {
  return stepTwoRooms
    .filter((room) => Number(room.room_id) > 0)
    .map((room) => {
      const roomId = Number(room.room_id);
      const found = existing.find((entry) => entry.room_id === roomId);
      if (found) return found;
      return { room_id: roomId, ...defaultVendorStepFiveRoomBrochure() };
    });
}

export function findStepFiveBrochureForRoom(
  rooms: VendorStepFiveRoomEntry[],
  roomId: number,
): VendorStepFiveRoomEntry {
  const found = rooms.find((room) => room.room_id === roomId);
  return found ?? { room_id: roomId, ...defaultVendorStepFiveRoomBrochure() };
}

export function roomEntryToStepFiveBrochureFields(
  entry: VendorStepFiveRoomEntry,
): Pick<
  StepFiveType,
  "brochure_pdf" | "brochure_pdf_2" | "remove_brochure_pdf" | "remove_brochure_pdf_2"
> {
  return {
    brochure_pdf: entry.brochure_pdf ?? null,
    brochure_pdf_2: entry.brochure_pdf_2 ?? null,
    remove_brochure_pdf: entry.remove_brochure_pdf ?? false,
    remove_brochure_pdf_2: entry.remove_brochure_pdf_2 ?? false,
  };
}

export function stepFiveBrochureFieldsToRoomEntry(
  roomId: number,
  data: Pick<
    StepFiveType,
    "brochure_pdf" | "brochure_pdf_2" | "remove_brochure_pdf" | "remove_brochure_pdf_2"
  >,
): VendorStepFiveRoomEntry {
  return {
    room_id: roomId,
    brochure_pdf: data.brochure_pdf ?? null,
    brochure_pdf_2: data.brochure_pdf_2 ?? null,
    remove_brochure_pdf: data.remove_brochure_pdf === true,
    remove_brochure_pdf_2: data.remove_brochure_pdf_2 === true,
  };
}

export function cloneVendorStepFiveRoomBrochure(
  source: VendorStepFiveRoomEntry,
): Omit<VendorStepFiveRoomEntry, "room_id"> {
  return {
    brochure_pdf: source.brochure_pdf ?? null,
    brochure_pdf_2: source.brochure_pdf_2 ?? null,
    remove_brochure_pdf: source.remove_brochure_pdf ?? false,
    remove_brochure_pdf_2: source.remove_brochure_pdf_2 ?? false,
  };
}

/** Per-room brochure PDF required; address is validated at step level. */
export function isVendorRoomBrochureStepComplete(
  entry: VendorStepFiveRoomEntry | undefined,
): boolean {
  if (!entry) return false;
  return hasBrochurePdf(entry.brochure_pdf);
}

export function appendVendorStepFiveRoomToFormData(
  formData: FormData,
  roomIndex: number,
  room: VendorStepFiveRoomEntry,
): void {
  formData.append(`rooms[${roomIndex}][room_id]`, String(room.room_id));

  if (room.brochure_pdf instanceof File) {
    formData.append(`rooms[${roomIndex}][brochure_pdf]`, room.brochure_pdf);
  } else if (
    typeof room.brochure_pdf === "string" &&
    room.brochure_pdf.trim().length > 0
  ) {
    formData.append(
      `rooms[${roomIndex}][brochure_pdf]`,
      room.brochure_pdf.trim(),
    );
  }

  if (room.brochure_pdf_2 instanceof File) {
    formData.append(`rooms[${roomIndex}][brochure_pdf_2]`, room.brochure_pdf_2);
  } else if (
    typeof room.brochure_pdf_2 === "string" &&
    room.brochure_pdf_2.trim().length > 0
  ) {
    formData.append(
      `rooms[${roomIndex}][brochure_pdf_2]`,
      room.brochure_pdf_2.trim(),
    );
  }

  if (room.remove_brochure_pdf) {
    formData.append(`rooms[${roomIndex}][remove_brochure_pdf]`, "true");
  }
  if (room.remove_brochure_pdf_2) {
    formData.append(`rooms[${roomIndex}][remove_brochure_pdf_2]`, "true");
  }
}

export function parseStepFiveCoordinates(raw: {
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  long?: unknown;
}): { latitude?: number; longitude?: number } {
  const latitude =
    typeof raw.latitude === "number"
      ? raw.latitude
      : typeof raw.lat === "number"
        ? raw.lat
        : typeof raw.lat === "string"
          ? parseFloat(raw.lat)
          : undefined;
  const longitude =
    typeof raw.longitude === "number"
      ? raw.longitude
      : typeof raw.long === "number"
        ? raw.long
        : typeof raw.long === "string"
          ? parseFloat(raw.long)
          : undefined;

  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}
