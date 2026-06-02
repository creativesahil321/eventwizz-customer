import type { UseFormReturn } from "react-hook-form";
import type {
  EventSchemaType,
  StepTwoType,
} from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import { eventsService } from "@/services/vendor/events/events.service";
import { writeVendorEventIsRoomsFlag } from "./vendor-event-is-rooms";

export type RoomSystemFlag = 0 | 1;

/** Mirror onboarding `setEnabled`: form + sessionStorage only — no step save on toggle. */
export function setVendorEventRoomSystemFlags(
  globalForm: UseFormReturn<EventSchemaType>,
  nextValue: RoomSystemFlag,
  options?: {
    eventId?: number;
    localForm?: UseFormReturn<StepTwoType>;
  },
): void {
  options?.localForm?.setValue("is_rooms", nextValue, {
    shouldDirty: true,
    shouldValidate: false,
  });
  globalForm.setValue("stepTwo.is_rooms", nextValue, {
    shouldDirty: true,
    shouldTouch: true,
  });
  globalForm.setValue("stepOne.is_rooms", nextValue, {
    shouldDirty: true,
    shouldTouch: true,
  });

  if (options?.eventId && options.eventId > 0) {
    writeVendorEventIsRoomsFlag(options.eventId, nextValue === 1);
  }
}

/** When leaving room mode, keep flat fields in sync with what the user was editing. */
export function mirrorLocalStepTwoFlatFieldsToGlobal(
  globalForm: UseFormReturn<EventSchemaType>,
  local: StepTwoType,
  isRooms: RoomSystemFlag,
): void {
  const current = globalForm.getValues().stepTwo;
  globalForm.setValue(
    "stepTwo",
    {
      ...current,
      is_rooms: isRooms,
      package_image: local.package_image,
      package_title: local.package_title,
      package_description: local.package_description,
      package_button_link: local.package_button_link,
      package_details: local.package_details,
      event_schedular_title: local.event_schedular_title,
      event_schedule_subtitle: local.event_schedule_subtitle,
      event_schedular_background_image: local.event_schedular_background_image,
      event_schedular: local.event_schedular,
      gallery: local.gallery,
    },
    { shouldDirty: true, shouldTouch: false },
  );
}

/** Mirror onboarding `notifyDataChanged` — refetch only, never POST on toggle. */
export function notifyVendorEventRoomSystemChanged(
  invalidateCache?: () => Promise<unknown>,
): void {
  void eventsService.notifyDataChanged();
  void invalidateCache?.();
}
