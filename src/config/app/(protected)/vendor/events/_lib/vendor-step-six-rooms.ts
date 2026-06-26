import type { StepSixType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";

export type VendorStepSixDrinkPackage = {
  id?: number;
  title: string;
  description: string;
  price: number | string;
  available_quantity: number;
  sold_quantity?: number;
};

export type VendorStepSixRoomEntry = {
  room_id: number;
  drink_title?: string;
  drink_description?: string;
  packages?: VendorStepSixDrinkPackage[];
};

const hasNonEmpty = (value: unknown): boolean =>
  String(value ?? "").trim().length > 0;

export function normalizeVendorDrinkPackages(
  raw: unknown,
): VendorStepSixDrinkPackage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const pkg = (item || {}) as Record<string, unknown>;
      const title = String(pkg.title ?? "").trim();
      const description = String(pkg.description ?? "").trim();
      if (!title && !description) return null;

      const priceRaw = pkg.price;
      const price =
        typeof priceRaw === "string"
          ? Number.parseFloat(priceRaw)
          : typeof priceRaw === "number"
            ? priceRaw
            : 0;

      const qtyRaw = pkg.available_quantity;
      const available_quantity =
        typeof qtyRaw === "string"
          ? Number.parseInt(qtyRaw, 10)
          : typeof qtyRaw === "number"
            ? qtyRaw
            : 100;

      return {
        ...(typeof pkg.id === "number" ? { id: pkg.id } : {}),
        title,
        description,
        price: Number.isFinite(price) ? price : 0,
        available_quantity: Number.isFinite(available_quantity)
          ? available_quantity
          : 100,
        ...(typeof pkg.sold_quantity === "number"
          ? { sold_quantity: pkg.sold_quantity }
          : {}),
      };
    })
    .filter((item): item is VendorStepSixDrinkPackage => item !== null);
}

export function mapVendorDrinkPackagesForApi(
  packages: VendorStepSixDrinkPackage[] | undefined,
): Array<{
  id?: number;
  title: string;
  description: string;
  price: number;
  available_quantity: number;
}> {
  return (packages ?? []).map((pkg) => {
    const price =
      typeof pkg.price === "string"
        ? Number.parseFloat(pkg.price)
        : Number(pkg.price);
    const available_quantity =
      typeof pkg.available_quantity === "string"
        ? Number.parseInt(pkg.available_quantity, 10)
        : Number(pkg.available_quantity);

    return {
      ...(typeof pkg.id === "number" ? { id: pkg.id } : {}),
      title: String(pkg.title ?? "").trim(),
      description: String(pkg.description ?? "").trim(),
      price: Number.isFinite(price) ? price : 0,
      available_quantity: Number.isFinite(available_quantity)
        ? available_quantity
        : 0,
    };
  });
}

function mapPayloadToRoomEntry(
  payload: Record<string, unknown>,
): VendorStepSixRoomEntry | null {
  const roomId = Number(payload.room_id);
  if (!Number.isFinite(roomId) || roomId <= 0) return null;

  return {
    room_id: roomId,
    drink_title: String(payload.drink_title ?? "").trim(),
    drink_description: String(payload.drink_description ?? "").trim(),
    packages: normalizeVendorDrinkPackages(payload.packages),
  };
}

/** API may return `stepSix.rooms` as a name-keyed object or an array. */
export function normalizeVendorStepSixRooms(
  raw: unknown,
): VendorStepSixRoomEntry[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        mapPayloadToRoomEntry((item || {}) as Record<string, unknown>),
      )
      .filter((item): item is VendorStepSixRoomEntry => item !== null);
  }

  if (typeof raw === "object") {
    return Object.values(raw as Record<string, Record<string, unknown>>)
      .map((payload) => mapPayloadToRoomEntry(payload || {}))
      .filter((item): item is VendorStepSixRoomEntry => item !== null);
  }

  return [];
}

export function defaultVendorStepSixRoomDrinks(): Omit<
  VendorStepSixRoomEntry,
  "room_id"
> {
  return {
    drink_title: "",
    drink_description: "",
    packages: [
      {
        title: "Premium Package",
        description: "This is a premium service package",
        price: 20,
        available_quantity: 100,
      },
    ],
  };
}

export function syncStepSixRoomsFromStepTwo(
  stepTwoRooms: Array<{ room_id?: number; name?: string }>,
  existing: VendorStepSixRoomEntry[],
): VendorStepSixRoomEntry[] {
  return stepTwoRooms
    .filter((room) => Number(room.room_id) > 0)
    .map((room) => {
      const roomId = Number(room.room_id);
      const found = existing.find((entry) => entry.room_id === roomId);
      if (found) return found;
      return { room_id: roomId, ...defaultVendorStepSixRoomDrinks() };
    });
}

export function findStepSixDrinksForRoom(
  rooms: VendorStepSixRoomEntry[],
  roomId: number,
): VendorStepSixRoomEntry {
  const found = rooms.find((room) => room.room_id === roomId);
  return found ?? { room_id: roomId, ...defaultVendorStepSixRoomDrinks() };
}

export function roomEntryToStepSixFields(
  entry: VendorStepSixRoomEntry,
): Pick<StepSixType, "drink_title" | "drink_description" | "packages"> {
  const packages = normalizeVendorDrinkPackages(entry.packages);
  return {
    drink_title: entry.drink_title ?? "",
    drink_description: entry.drink_description ?? "",
    packages:
      packages.length > 0
        ? packages
        : defaultVendorStepSixRoomDrinks().packages ?? [],
  };
}

export function stepSixFieldsToRoomEntry(
  roomId: number,
  data: Pick<StepSixType, "drink_title" | "drink_description" | "packages">,
): VendorStepSixRoomEntry {
  return {
    room_id: roomId,
    drink_title: String(data.drink_title ?? "").trim(),
    drink_description: String(data.drink_description ?? "").trim(),
    packages: normalizeVendorDrinkPackages(data.packages),
  };
}

export function cloneVendorStepSixRoomDrinks(
  source: VendorStepSixRoomEntry,
): Omit<VendorStepSixRoomEntry, "room_id"> {
  return {
    drink_title: source.drink_title ?? "",
    drink_description: source.drink_description ?? "",
    packages: normalizeVendorDrinkPackages(source.packages).map((pkg) => ({
      ...pkg,
    })),
  };
}

export function isVendorRoomDrinksStepComplete(
  entry: VendorStepSixRoomEntry | undefined,
): boolean {
  if (!entry) return false;
  if (!hasNonEmpty(entry.drink_title)) return false;
  if (!hasNonEmpty(entry.drink_description)) return false;

  const packages = normalizeVendorDrinkPackages(entry.packages);
  return packages.some((pkg) => {
    const price =
      typeof pkg.price === "string"
        ? Number.parseFloat(pkg.price)
        : Number(pkg.price);
    const quantity =
      typeof pkg.available_quantity === "string"
        ? Number.parseInt(pkg.available_quantity, 10)
        : Number(pkg.available_quantity);

    return (
      hasNonEmpty(pkg.title) &&
      hasNonEmpty(pkg.description) &&
      Number.isFinite(price) &&
      price > 0 &&
      Number.isFinite(quantity) &&
      quantity > 0
    );
  });
}
