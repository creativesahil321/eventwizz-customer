import { API_ENDPOINTS } from "@/services/core/endpoints";

/**
 * Persistence GET for onboarding steps.
 * Omit `previewIsRooms` for saved event mode. `/true` and `/false` are preview only.
 */
export function buildOnboardingStepsUrl(
  locationId: string | number,
  previewIsRooms?: boolean,
): string {
  const id = String(locationId);
  if (typeof previewIsRooms === "boolean") {
    return API_ENDPOINTS.VENDOR.ONBOARDING.GET_ALL_STEPS.replace(
      "{location_id}",
      id,
    ).replace("{is_rooms}", previewIsRooms ? "true" : "false");
  }
  return API_ENDPOINTS.VENDOR.ONBOARDING.GET_SAVED_STEPS.replace(
    "{location_id}",
    id,
  );
}
