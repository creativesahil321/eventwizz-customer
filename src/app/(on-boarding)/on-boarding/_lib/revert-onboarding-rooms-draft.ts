import type { UseFormReturn } from "react-hook-form";
import { readOnboardingIsRoomsSessionFlag } from "@/app/(protected)/vendor/events/_lib/vendor-event-is-rooms";
import type {
  MultiSpaceType,
  OnboardingFormData,
} from "../_components/form-provider/schema";

export function nextMultiSpaceAfterRoomsDraftRevert(
  current: MultiSpaceType | undefined,
  savedIsRooms: boolean | undefined,
): MultiSpaceType | undefined {
  if (!current || typeof savedIsRooms !== "boolean") return current;
  if (current.enabled === savedIsRooms) return current;
  return { ...current, enabled: savedIsRooms };
}

/** Drop an unsaved Step 4 rooms toggle so later steps follow DB `is_rooms`. */
export function revertOnboardingRoomsDraftToSaved(
  form: UseFormReturn<OnboardingFormData>,
): void {
  const next = nextMultiSpaceAfterRoomsDraftRevert(
    form.getValues("multiSpace") as MultiSpaceType | undefined,
    readOnboardingIsRoomsSessionFlag(),
  );
  const current = form.getValues("multiSpace") as MultiSpaceType | undefined;
  if (!next || next === current) return;
  form.setValue("multiSpace", next, {
    shouldDirty: false,
    shouldTouch: false,
  });
}
