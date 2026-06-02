import type { StepFourType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";

export type VendorStepFourMenuItem = {
  title: string;
  description: string;
};

export type VendorStepFourMenuCategory = {
  name: string;
  items: VendorStepFourMenuItem[];
};

export type VendorStepFourRoomEntry = {
  room_id: number;
  catering_option: 0 | 1;
  menu_title?: string;
  menu_description?: string;
  event_menu_category_id?: number;
  menus?: VendorStepFourMenuCategory[];
  menu_background_image?: string | File | null;
};

const hasNonEmpty = (value: unknown): boolean =>
  String(value ?? "").trim().length > 0;

export function normalizeCateringOptionFlag(value: unknown): 0 | 1 {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return 1;
  }
  return 0;
}

function normalizeMenus(raw: unknown): VendorStepFourMenuCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((menu) => {
      const source = (menu || {}) as Record<string, unknown>;
      const name = String(source.name ?? "").trim();
      const items = Array.isArray(source.items)
        ? source.items.map((item) => {
            const row = (item || {}) as Record<string, unknown>;
            return {
              title: String(row.title ?? "").trim(),
              description: String(row.description ?? "").trim(),
            };
          })
        : [];
      return { name, items };
    })
    .filter((menu) => menu.name.length > 0 || menu.items.length > 0);
}

function mapPayloadToRoomEntry(
  payload: Record<string, unknown>,
): VendorStepFourRoomEntry | null {
  const roomId = Number(payload.room_id);
  if (!Number.isFinite(roomId) || roomId <= 0) return null;

  const bg = payload.menu_background_image;
  return {
    room_id: roomId,
    catering_option: normalizeCateringOptionFlag(payload.catering_option),
    menu_title: String(payload.menu_title ?? "").trim(),
    menu_description: String(payload.menu_description ?? "").trim(),
    event_menu_category_id: Number(payload.event_menu_category_id) || 0,
    menus: normalizeMenus(payload.menus),
    menu_background_image:
      typeof bg === "string"
        ? bg.trim() || null
        : bg instanceof File
          ? bg
          : null,
  };
}

/** API may return `stepFour.rooms` as a name-keyed object or an array. */
export function normalizeVendorStepFourRooms(
  raw: unknown,
): VendorStepFourRoomEntry[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        mapPayloadToRoomEntry((item || {}) as Record<string, unknown>),
      )
      .filter((item): item is VendorStepFourRoomEntry => item !== null);
  }

  if (typeof raw === "object") {
    return Object.values(raw as Record<string, Record<string, unknown>>)
      .map((payload) => mapPayloadToRoomEntry(payload || {}))
      .filter((item): item is VendorStepFourRoomEntry => item !== null);
  }

  return [];
}

export function defaultVendorStepFourRoomMenu(): Omit<
  VendorStepFourRoomEntry,
  "room_id"
> {
  return {
    catering_option: 0,
    menu_title: "",
    menu_description: "",
    event_menu_category_id: 0,
    menus: [],
    menu_background_image: null,
  };
}

/** Align persisted step-four rooms with the active step-two room list. */
export function syncStepFourRoomsFromStepTwo(
  stepTwoRooms: Array<{ room_id?: number; name?: string }>,
  existing: VendorStepFourRoomEntry[],
): VendorStepFourRoomEntry[] {
  return stepTwoRooms
    .filter((room) => Number(room.room_id) > 0)
    .map((room) => {
      const roomId = Number(room.room_id);
      const found = existing.find((entry) => entry.room_id === roomId);
      if (found) return found;
      return { room_id: roomId, ...defaultVendorStepFourRoomMenu() };
    });
}

export function findStepFourMenuForRoom(
  rooms: VendorStepFourRoomEntry[],
  roomId: number,
): VendorStepFourRoomEntry {
  const found = rooms.find((room) => room.room_id === roomId);
  return found ?? { room_id: roomId, ...defaultVendorStepFourRoomMenu() };
}

export function roomEntryToStepFourFields(
  entry: VendorStepFourRoomEntry,
): Pick<
  StepFourType,
  | "catering_option"
  | "menu_title"
  | "menu_description"
  | "event_menu_category_id"
  | "menus"
  | "menu_background_image"
> {
  return {
    catering_option: entry.catering_option,
    menu_title: entry.menu_title ?? "",
    menu_description: entry.menu_description ?? "",
    event_menu_category_id: entry.event_menu_category_id ?? 0,
    menus: entry.menus ?? [],
    menu_background_image: entry.menu_background_image ?? null,
  };
}

export function stepFourFieldsToRoomEntry(
  roomId: number,
  data: Pick<
    StepFourType,
    | "catering_option"
    | "menu_title"
    | "menu_description"
    | "event_menu_category_id"
    | "menus"
    | "menu_background_image"
  >,
): VendorStepFourRoomEntry {
  return {
    room_id: roomId,
    catering_option: (data.catering_option === 1 ? 1 : 0) as 0 | 1,
    menu_title: String(data.menu_title ?? "").trim(),
    menu_description: String(data.menu_description ?? "").trim(),
    event_menu_category_id: Number(data.event_menu_category_id) || 0,
    menus: Array.isArray(data.menus) ? data.menus : [],
    menu_background_image: data.menu_background_image ?? null,
  };
}

export function cloneVendorStepFourRoomMenu(
  source: VendorStepFourRoomEntry,
): Omit<VendorStepFourRoomEntry, "room_id"> {
  return {
    catering_option: source.catering_option,
    menu_title: source.menu_title ?? "",
    menu_description: source.menu_description ?? "",
    event_menu_category_id: source.event_menu_category_id ?? 0,
    menus: (source.menus ?? []).map((menu) => ({
      name: menu.name,
      items: menu.items.map((item) => ({
        title: item.title,
        description: item.description,
      })),
    })),
    menu_background_image: source.menu_background_image ?? null,
  };
}

/** True when catering is enabled and menu fields are filled for the active room. */
export function isVendorRoomMenuStepComplete(
  entry: VendorStepFourRoomEntry | undefined,
): boolean {
  if (!entry) return false;
  if (entry.catering_option !== 1) return true;
  if (!hasNonEmpty(entry.menu_title)) return false;
  if (!hasNonEmpty(entry.menu_description)) return false;
  if (!Number(entry.event_menu_category_id) || entry.event_menu_category_id < 1) {
    return false;
  }
  const menus = entry.menus ?? [];
  if (menus.length === 0) return false;
  return menus.some(
    (menu) =>
      hasNonEmpty(menu.name) &&
      menu.items.some(
        (item) => hasNonEmpty(item.title) && hasNonEmpty(item.description),
      ),
  );
}

export function appendVendorStepFourRoomToFormData(
  formData: FormData,
  roomIndex: number,
  room: VendorStepFourRoomEntry,
): void {
  formData.append(`rooms[${roomIndex}][room_id]`, String(room.room_id));
  formData.append(
    `rooms[${roomIndex}][catering_option]`,
    String(room.catering_option),
  );

  if (room.catering_option !== 1) return;

  if (room.menu_title) {
    formData.append(`rooms[${roomIndex}][menu_title]`, room.menu_title);
  }
  if (room.menu_description) {
    formData.append(
      `rooms[${roomIndex}][menu_description]`,
      room.menu_description,
    );
  }
  if (Number(room.event_menu_category_id) > 0) {
    formData.append(
      `rooms[${roomIndex}][event_menu_category_id]`,
      String(room.event_menu_category_id),
    );
  }

  (room.menus ?? []).forEach((menu, menuIndex) => {
    formData.append(`rooms[${roomIndex}][menus][${menuIndex}][name]`, menu.name);
    menu.items.forEach((item, itemIndex) => {
      formData.append(
        `rooms[${roomIndex}][menus][${menuIndex}][items][${itemIndex}][title]`,
        item.title,
      );
      formData.append(
        `rooms[${roomIndex}][menus][${menuIndex}][items][${itemIndex}][description]`,
        item.description || "",
      );
    });
  });

  if (room.menu_background_image instanceof File) {
    formData.append(
      `rooms[${roomIndex}][menu_background_image]`,
      room.menu_background_image,
    );
  }
}
