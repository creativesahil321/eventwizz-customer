import type {
  Discount,
  DiscountDateEntry,
  DiscountEventDateRoom,
  DiscountEventWithDates,
  DiscountType,
  FlatDiscountMode,
} from "./types";
import {
  isDiscountDateOfferReady,
  type DiscountDateFormEntry,
} from "./schema";

/** Normalize API / legacy flat_mode into store contract values. */
export function normalizeFlatMode(
  mode: string | null | undefined,
): FlatDiscountMode | null {
  if (!mode) return null;
  if (mode === "per_person" || mode === "flat_per_person") return "per_person";
  if (
    mode === "total" ||
    mode === "on_total" ||
    mode === "flat_on_total"
  ) {
    return "total";
  }
  return null;
}

/** Prefer `offers[]`, fall back to legacy `dates[]`. */
export function discountOfferRows(discount: Discount): DiscountDateEntry[] {
  if (Array.isArray(discount.offers) && discount.offers.length > 0) {
    return discount.offers;
  }
  if (Array.isArray(discount.dates) && discount.dates.length > 0) {
    return discount.dates;
  }
  return [];
}

/**
 * Resolve API `show_on_event_page` with legacy `show_on_banner` fallback.
 * Form field remains `show_on_banner` until mapped at the payload boundary.
 */
export function resolveShowOnEventPage(
  source: {
    show_on_event_page?: boolean | null;
    show_on_banner?: boolean | null;
  },
  fallback = true,
): boolean {
  if (typeof source.show_on_event_page === "boolean") {
    return source.show_on_event_page;
  }
  if (typeof source.show_on_banner === "boolean") {
    return source.show_on_banner;
  }
  return fallback;
}

/** Resolve offer live flag from API `status` / legacy `is_live`. */
export function resolveOfferIsLive(
  entry: DiscountDateEntry,
  fallbackLive = true,
): boolean {
  if (entry.is_live != null) return entry.is_live !== false;
  for (const raw of [entry.status, entry.stored_status]) {
    if (raw == null) continue;
    const s = String(raw).toLowerCase();
    if (s === "inactive" || s === "paused" || s === "expired") return false;
    if (s === "active") return true;
  }
  return fallbackLive;
}

export function formatOfferAmountLabel(
  discountType: DiscountType | "percentage" | "flat" | undefined,
  amount: number,
  flatMode?: string | null,
  minPeople?: number | null,
): string {
  if (discountType !== "flat") {
    return `${amount}% off`;
  }
  const mode = normalizeFlatMode(flatMode);
  if (mode === "per_person") {
    return `£${amount} / person${minPeople ? ` (min ${minPeople})` : ""}`;
  }
  // Flat off total removed — fall back to a plain amount label for legacy rows.
  return `£${amount} off`;
}

export function formatFormOfferValueLabel(
  entry: Pick<
    DiscountDateFormEntry,
    "value_type" | "discount_value" | "flat_mode" | "min_people"
  >,
): string {
  return formatOfferAmountLabel(
    entry.value_type,
    Number(entry.discount_value) || 0,
    entry.flat_mode,
    entry.min_people,
  );
}

export type EventCatalogSlot = {
  key: string;
  dateId: number;
  date: string;
  roomId: number;
  roomName: string | null;
};

export function slotKey(dateId: number, roomId: number): string {
  return `${dateId}:${roomId > 0 ? roomId : 0}`;
}

/** Expand event dates into date/room slots for the Dates step + preview. */
export function buildEventCatalogSlots(
  event: DiscountEventWithDates | null | undefined,
): EventCatalogSlot[] {
  const slots: EventCatalogSlot[] = [];
  for (const d of event?.dates ?? []) {
    if (d?.date_id == null || !d?.date) continue;
    const rooms = (d.rooms ?? []).filter((r) => r?.id != null);
    if (rooms.length > 0) {
      for (const room of rooms) {
        slots.push({
          key: slotKey(d.date_id, room.id),
          dateId: d.date_id,
          date: d.date,
          roomId: room.id,
          roomName: room.name ?? null,
        });
      }
    } else {
      slots.push({
        key: slotKey(d.date_id, 0),
        dateId: d.date_id,
        date: d.date,
        roomId: 0,
        roomName: null,
      });
    }
  }
  return slots.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return (a.roomName ?? "").localeCompare(b.roomName ?? "");
  });
}

export type DiscountEventRoomTab = {
  roomId: number;
  label: string;
};

/**
 * Event-level room order for the customer preview tabs.
 *
 * Catalog slots are sorted by date, so first-seen-room would put whichever
 * room has the earliest date on the left. The live event page instead uses
 * `event.rooms` insertion order (typically the venue/event room relation,
 * which follows room id). Match that here.
 */
export function listDiscountEventRooms(
  event: DiscountEventWithDates | null | undefined,
): DiscountEventRoomTab[] {
  const unique = new Map<number, string>();
  let richest: DiscountEventDateRoom[] = [];

  for (const d of event?.dates ?? []) {
    const rooms = (d.rooms ?? []).filter((r) => r?.id != null);
    for (const room of rooms) {
      if (!unique.has(room.id)) {
        unique.set(room.id, room.name ?? `Room ${room.id}`);
      }
    }
    if (rooms.length > richest.length) {
      richest = rooms;
    }
  }

  if (unique.size === 0) return [];

  // A date that lists several rooms is the best proxy for public `event.rooms` order.
  if (richest.length >= 2) {
    const seen = new Set<number>();
    const ordered: DiscountEventRoomTab[] = [];
    for (const room of richest) {
      if (seen.has(room.id)) continue;
      seen.add(room.id);
      ordered.push({
        roomId: room.id,
        label: unique.get(room.id) || room.name || `Room ${room.id}`,
      });
    }
    for (const [roomId, label] of unique) {
      if (seen.has(roomId)) continue;
      ordered.push({ roomId, label });
    }
    return ordered;
  }

  return Array.from(unique.entries())
    .sort(([a], [b]) => a - b)
    .map(([roomId, label]) => ({ roomId, label }));
}

export type CustomerPreviewOffer = {
  show_on_page: boolean;
  value_type: "percentage" | "flat";
  discount_value: number;
  flat_mode?: "total" | "per_person" | null;
};

export type CustomerPreviewItem = {
  key: string;
  formIndex: number;
  eventDate: string;
  roomId: number;
  roomName: string | null;
  badge: string;
  ready: boolean;
  showOnPage: boolean;
  offer: CustomerPreviewOffer | null;
};

/** Build customer date-card preview rows from catalog slots + form offers. */
export function buildCustomerPreviewItems(
  slots: EventCatalogSlot[],
  dates: DiscountDateFormEntry[],
  formatBadge: (entry: CustomerPreviewOffer) => string,
  keyPrefix = "preview",
): CustomerPreviewItem[] {
  return slots.map((slot) => {
    const formIndex = dates.findIndex(
      (d) =>
        Number(d.date_id) === Number(slot.dateId) &&
        (Number(d.room_id) || 0) === Number(slot.roomId),
    );
    const entry = formIndex >= 0 ? dates[formIndex] : null;
    const showOnPage = entry ? entry.show_on_banner !== false : false;
    const ready = Boolean(entry && isDiscountDateOfferReady(entry));
    const offer: CustomerPreviewOffer | null =
      ready && entry
        ? {
            show_on_page: showOnPage,
            value_type: entry.value_type,
            discount_value: Number(entry.discount_value) || 0,
            flat_mode: entry.flat_mode,
          }
        : null;
    const badge =
      ready && showOnPage && offer ? formatBadge(offer) : "";

    return {
      key: `${keyPrefix}-${slot.key}`,
      formIndex,
      eventDate: slot.date,
      roomId: slot.roomId,
      roomName: slot.roomName,
      badge,
      ready,
      showOnPage,
      offer,
    };
  });
}
