import { API_ENDPOINTS } from "@/services/core/endpoints";

/** Build vendor event persistence GET URL — mirrors onboarding `/steps/{id}/{true|false}`. */
export function buildVendorEventGetUrl(
  eventId: string | number,
  isRooms: boolean,
): string {
  return API_ENDPOINTS.VENDOR.EVENT.GET_EVENT.replace(
    "{eventId}",
    String(eventId),
  ).replace("{is_rooms}", isRooms ? "true" : "false");
}
