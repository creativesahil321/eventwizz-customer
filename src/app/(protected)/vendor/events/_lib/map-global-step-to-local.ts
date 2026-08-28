import type {
  EventSchemaType,
  StepOneType,
  StepTwoType,
} from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import { normalizeVendorStepTwoRooms } from "@/lib/event-form-limits";
import {
  normalizeGalleryEntries,
  normalizePackageDetails,
  normalizePersistedMediaUrl,
  normalizeSchedulerRows,
} from "./normalize-step-two-fields";

/** Maps hydrated global step 1 → local tab form values. */
export function mapGlobalStepOneToLocal(
  stepOne: EventSchemaType["stepOne"],
  fallbackVendorLocationId = 0,
): StepOneType {
  return {
    step: 1 as const,
    vendor_location_id:
      stepOne.vendor_location_id || fallbackVendorLocationId || 0,
    event_id: stepOne.event_id,
    event_category_id: stepOne.event_category_id,
    is_rooms: stepOne.is_rooms,
    event_name: stepOne.event_name || "",
    event_banner_image: stepOne.event_banner_image,
    event_banner_video: stepOne.event_banner_video,
    event_banner_heading: stepOne.event_banner_heading || "",
    event_banner_sub_heading: stepOne.event_banner_sub_heading || "",
    about_event_heading: stepOne.about_event_heading || "",
    about_event_sub_heading: stepOne.about_event_sub_heading || "",
    about_event_description: stepOne.about_event_description || "",
    event_address: stepOne.event_address || "",
    latitude: stepOne.latitude,
    longitude: stepOne.longitude,
    location: stepOne.location,
    remove_event_banner_image: stepOne.remove_event_banner_image ?? false,
    remove_event_banner_video: stepOne.remove_event_banner_video ?? false,
  };
}

/** Maps hydrated global step 2 → local tab form values. */
export function mapGlobalStepTwoToLocal(
  stepTwo: EventSchemaType["stepTwo"],
  fallbackEventId = 0,
): StepTwoType {
  return {
    step: 2 as const,
    event_id: Number(stepTwo.event_id) || fallbackEventId,
    is_rooms: stepTwo.is_rooms === 1 ? (1 as const) : (0 as const),
    active_room_index: stepTwo.active_room_index ?? 0,
    rooms: normalizeVendorStepTwoRooms(stepTwo.rooms).map((room) => ({
      ...room,
      package_image: normalizePersistedMediaUrl(room.package_image) ?? null,
      event_schedular_background_image:
        normalizePersistedMediaUrl(room.event_schedular_background_image) ??
        null,
      gallery: normalizeGalleryEntries(room.gallery),
    })),
    package_image: normalizePersistedMediaUrl(stepTwo.package_image) ?? null,
    package_title: stepTwo.package_title || "",
    package_description: stepTwo.package_description || "",
    package_details: normalizePackageDetails(stepTwo.package_details),
    event_schedular_title: stepTwo.event_schedular_title || "",
    event_schedule_subtitle: stepTwo.event_schedule_subtitle || "",
    event_schedular_background_image:
      normalizePersistedMediaUrl(stepTwo.event_schedular_background_image) ??
      null,
    event_schedular: normalizeSchedulerRows(stepTwo.event_schedular),
    gallery: normalizeGalleryEntries(stepTwo.gallery),
  };
}
