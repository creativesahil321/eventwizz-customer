import {
  normalizeVendorStepTwoRooms,
  parseEventIsRoomsFlag,
} from "@/lib/event-form-limits";
import { unnamedRoomLabel } from "@/lib/room-name-examples";
import type { StepThreeType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import {
  findStepThreeDatesForRoom,
  normalizeVendorStepThreeRooms,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-three-rooms";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type VendorDatesPublishIssue = {
  message: string;
  roomIndex?: number;
};

export type VendorDatesPublishSource = {
  stepOne?: { is_rooms?: unknown };
  stepTwo?: {
    is_rooms?: unknown;
    rooms?: unknown;
  };
  stepThree?: {
    dates?: StepThreeType["dates"];
    rooms?: unknown;
  };
};

export function dateRowHasScheduledEventDate(
  date: { event_date?: string | null } | undefined,
): boolean {
  return ISO_DATE_RE.test(String(date?.event_date ?? "").trim());
}

/** True when at least one row has a real calendar date — not an empty “New Date”. */
export function hasSchedulableVendorDates(
  dates: StepThreeType["dates"] | undefined,
): boolean {
  return Boolean(dates?.some(dateRowHasScheduledEventDate));
}

export function getVendorDatesPublishIssue(
  formValues: VendorDatesPublishSource,
): VendorDatesPublishIssue | null {
  const isRooms =
    parseEventIsRoomsFlag(
      formValues.stepTwo?.is_rooms ?? formValues.stepOne?.is_rooms,
    ) === 1;

  if (isRooms) {
    const rooms = normalizeVendorStepTwoRooms(formValues.stepTwo?.rooms);
    const stepThreeRooms = normalizeVendorStepThreeRooms(
      formValues.stepThree?.rooms,
    );

    if (rooms.length === 0) {
      return {
        message:
          "Add at least one room with a valid event date before saving this event.",
      };
    }

    for (let index = 0; index < rooms.length; index++) {
      const room = rooms[index];
      const roomDates = findStepThreeDatesForRoom(
        stepThreeRooms,
        Number(room.room_id),
      );
      if (hasSchedulableVendorDates(roomDates)) continue;

      const name = String(room.name ?? "").trim() || unnamedRoomLabel();
      return {
        message: `Set a valid event date for ${name} before saving. Empty "New Date" rows cannot be published.`,
        roomIndex: index,
      };
    }

    return null;
  }

  if (!hasSchedulableVendorDates(formValues.stepThree?.dates)) {
    return {
      message:
        "Set at least one event date before saving. Empty \"New Date\" rows cannot be published.",
    };
  }

  return null;
}
