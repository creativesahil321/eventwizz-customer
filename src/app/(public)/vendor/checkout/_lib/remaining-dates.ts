import type { ApiEventCartData } from "@/lib/types/cart.types";
import type { EventDetail } from "@/services/common/events/type";
import {
  isPublicEventRoomMode,
  listPublicEventRooms,
  resolvePublicEventActiveSlices,
} from "@/lib/resolve-public-event-room-slices";
import type { EditableDateData } from "@/store/cart-edit.store";
import {
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
export function hasRemainingDatesToAdd(params: {
  eventDetail: EventDetail | null | undefined;
  cartEventData: ApiEventCartData | null | undefined;
  roomId?: number | null;
  getLocalDateData?: (date: string) => EditableDateData | null;
}): boolean {
  const { eventDetail, cartEventData, roomId, getLocalDateData } = params;
  if (!eventDetail) return true;

  const dates = listBookableEventDates(eventDetail, roomId);
  if (dates.length === 0) return false;

  return dates.some((date) => {
    const status = resolveDateCartStatus({
      date,
      roomId,
      cartEventData,
      localData: getLocalDateData?.(date) ?? null,
    });
    return !shouldShowViewCartOnDateCard(status);
  });
}
