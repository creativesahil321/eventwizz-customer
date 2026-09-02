import type { ApiEventCartData } from "@/lib/types/cart.types";
import type { EventDetail } from "@/services/common/events/type";
import {
  isPublicEventRoomMode,
  listPublicEventRooms,
  resolvePublicEventActiveSlices,
} from "@/lib/resolve-public-event-room-slices";
import type { EditableDateData } from "@/store/cart-edit.store";
import {
  buildRoomDateKey,
  resolveDateCartStatus,
  shouldShowViewCartOnDateCard,
} from "./cart-calculations";

/** Bookable (non-sold-out) event dates for a room, or flat event dates. */
export function listBookableEventDates(
  eventDetail: EventDetail,
  roomId?: number | null,
): string[] {
  if (isPublicEventRoomMode(eventDetail) && roomId != null && roomId > 0) {
    const rooms = listPublicEventRooms(eventDetail);
    const index = rooms.findIndex(
      (room) => room.room_id === roomId && !room.disabled,
    );
    if (index < 0) return [];
    const dates = resolvePublicEventActiveSlices(eventDetail, index).dates ?? [];
    return dates
      .filter((date) => !date.sold_out && Boolean(date.event_date?.trim()))
      .map((date) => date.event_date);
  }

  return (eventDetail.dates ?? [])
    .filter((date) => !date.sold_out && Boolean(date.event_date?.trim()))
    .map((date) => date.event_date);
}

/**
 * True when at least one bookable event date is not already in cart
 * (same rule as the event-page VIEW CART label).
 *
 * When `eventDetail` is missing (still loading), returns `true` so Add Dates
 * stays visible until we can prove there is nothing left to add.
 */
type RemainingDatesParams = {
  eventDetail: EventDetail | null | undefined;
  cartEventData: ApiEventCartData | null | undefined;
  roomId?: number | null;
  /** Lookup by cart store key (`roomId:date` in room mode). */
  getLocalDateData?: (storeKey: string) => EditableDateData | null;
};

export function hasRemainingDatesToAdd(
  params: RemainingDatesParams,
): boolean {
  const { eventDetail, cartEventData, roomId, getLocalDateData } = params;
  if (!eventDetail) return true;

  const dates = listBookableEventDates(eventDetail, roomId);
  if (dates.length === 0) return false;

  return dates.some((date) => {
    const storeKey =
      roomId != null && roomId > 0 ? buildRoomDateKey(roomId, date) : date;
    const status = resolveDateCartStatus({
      date,
      roomId,
      cartEventData,
      localData: getLocalDateData?.(storeKey) ?? null,
    });
    return !shouldShowViewCartOnDateCard(status);
  });
}

/** First room that still has a date the customer can add. */
export function firstRoomIdWithRemainingDates(
  params: Omit<RemainingDatesParams, "roomId">,
): number | null {
  const { eventDetail } = params;
  if (!eventDetail || !isPublicEventRoomMode(eventDetail)) return null;

  for (const room of listPublicEventRooms(eventDetail)) {
    if (room.disabled) continue;
    if (hasRemainingDatesToAdd({ ...params, roomId: room.room_id })) {
      return room.room_id;
    }
  }
  return null;
}

/** True when any room (or the flat event) still has a date to add. */
export function hasRemainingDatesToAddAnywhere(
  params: Omit<RemainingDatesParams, "roomId">,
): boolean {
  const { eventDetail } = params;
  if (!eventDetail) return true;
  if (!isPublicEventRoomMode(eventDetail)) {
    return hasRemainingDatesToAdd({ ...params, roomId: null });
  }
  return firstRoomIdWithRemainingDates(params) != null;
}
