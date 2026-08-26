import { api, request } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { ApiResponse } from "./type";
import type { RoomType } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";

/**
 * Resolves a templated endpoint URL by substituting `{room_id}` with the given id.
 * Kept local so we don't pull a route-template helper just for two URLs.
 */
function fillRoomId(url: string, roomId: number | string): string {
  return url.replace("{room_id}", String(roomId));
}

/**
 * Room ("event space") API surface for the multi-space onboarding flow.
 *
 * The single-room onboarding service in `onboarding.service.ts` is left untouched. When the
 * vendor opts into multiple event spaces on Step 4, the wizard switches to the methods below:
 *
 *  - {@link roomService.create} / {@link roomService.update} / {@link roomService.remove} —
 *    manage the rooms list (max 3 enforced client-side; backend should enforce too).
 *  - `storeRoom*Data` — mirrors `storeStepFour…SevenData` but routes to a room-scoped endpoint
 *    so the same form payload is persisted against `room_id`.
 *
 * Multi-space on/off is not a dedicated route. The backend infers it from room
 * records plus `is_rooms` on GET `/vendor/onboarding/steps/{location_id}/{is_rooms}`
 * and on each step store payload.
 *
 * Backend contract expected (mirrors existing onboarding store):
 *   GET  /vendor/rooms
 *   POST /vendor/rooms/store                      { name }                  -> { id, name }
 *   PUT  /vendor/rooms/{room_id}                  { name }
 *   DELETE /vendor/rooms/{room_id}
 *   POST /vendor/onboarding/rooms/{room_id}/store FormData (step + room data)
 */

export interface RoomCreatePayload {
  name: string;
}

export interface RoomUpdatePayload {
  name: string;
}

/**
 * Shape returned by `POST /vendor/onboarding/rooms`. Diverges from `ApiResponse.data` (which is
 * the full onboarding payload) because room create only returns the new room — so we don't
 * extend `ApiResponse` here, we mirror the meta fields and override `data`.
 */
export interface RoomCreateResponse {
  status?: boolean;
  message?: string;
  errors?: string[];
  data?: {
    id: number;
    name: string;
    [key: string]: unknown;
  };
}

export interface VendorRoomsListResponse {
  status?: boolean;
  message?: string;
  errors?: string[];
  data?: Array<{
    id: number;
    name: string;
    [key: string]: unknown;
  }>;
}

/**
 * Append `room_id` and an optional `isApproved` flag onto an outgoing FormData.
 * Kept here (not inside each store method) so the convention is consistent across rooms.
 */
function appendRoomMeta(
  formData: FormData,
  roomId: number,
  isApproved?: boolean,
): void {
  formData.append("room_id", roomId.toString());
  if (typeof isApproved === "boolean") {
    formData.append("isApproved", isApproved ? "1" : "0");
  }
}

export const roomService = {
  // ─── Room CRUD ──────────────────────────────────────────────────────────────────────

  /** Vendor's existing rooms list (used to hydrate multi-space tabs). */
  listVendorRooms: async (): Promise<VendorRoomsListResponse> => {
    return api.get<VendorRoomsListResponse>(API_ENDPOINTS.VENDOR.ROOMS, {
      returnFullResponse: true,
    });
  },

  create: async (
    payload: RoomCreatePayload,
  ): Promise<RoomCreateResponse> => {
    return api.post<RoomCreateResponse>(
      API_ENDPOINTS.VENDOR.ROOMS_STORE,
      payload,
      { returnFullResponse: true },
    );
  },

  update: async (
    roomId: number,
    payload: RoomUpdatePayload,
  ): Promise<ApiResponse> => {
    return request<ApiResponse>({
      method: "PUT",
      url: fillRoomId(API_ENDPOINTS.VENDOR.ROOM_BY_ID, roomId),
      data: payload,
      returnFullResponse: true,
    });
  },

  remove: async (roomId: number): Promise<ApiResponse> => {
    return request<ApiResponse>({
      method: "DELETE",
      url: fillRoomId(API_ENDPOINTS.VENDOR.ROOM_BY_ID, roomId),
      returnFullResponse: true,
    });
  },

  // ─── Room-scoped step saves ─────────────────────────────────────────────────────────

  /**
   * Persist a room's Package data (mirrors `storeStepFourData` for single-room mode).
   * The caller is responsible for building the FormData with package_image, package_title,
   * package_description, package_button_name, package_details[], gallery, etc.
   */
  storeRoomPackageData: async (
    roomId: number,
    eventId: number,
    payload: RoomType["package"] & {
      isApproved?: boolean;
    },
  ): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("step", "4");
    formData.append("event_id", eventId.toString());

    if (payload.package_title) {
      formData.append("package_title", payload.package_title);
    }
    if (payload.package_description) {
      formData.append("package_description", payload.package_description);
    }

    // The package image can be a File / Blob (new upload) or a URL string (already on the
    // server) or null. Only forward File / Blob to the FormData; URLs/null mean the backend
    // should preserve the existing image.
    const img = payload.package_image as unknown;
    if (img && typeof img === "object" && (img instanceof File || img instanceof Blob)) {
      formData.append("package_image", img);
    }

    (payload.package_details ?? []).forEach((detail, index) => {
      formData.append(
        `package_details[${index}][title]`,
        detail.title ?? "",
      );
    });

    if (payload.gallery && payload.gallery.length > 0) {
      let fileIndex = 0;
      let existingIndex = 0;
      const galleryOrder: Array<
        { type: "existing"; id: number } | { type: "new"; index: number }
      > = [];
      payload.gallery.forEach((item) => {
        if (item instanceof File || item instanceof Blob) {
          formData.append(`event_gallery_images[${fileIndex}]`, item);
          galleryOrder.push({ type: "new", index: fileIndex });
          fileIndex++;
        } else if (item && typeof item === "object" && "id" in item && "url" in item) {
          formData.append(
            `existing_gallery_images[${existingIndex}][id]`,
            item.id.toString(),
          );
          formData.append(
            `existing_gallery_images[${existingIndex}][url]`,
            item.url,
          );
          galleryOrder.push({ type: "existing", id: item.id });
          existingIndex++;
        }
      });
      if (galleryOrder.length > 0) {
        formData.append("gallery_order", JSON.stringify(galleryOrder));
      }
    }

    appendRoomMeta(formData, roomId, payload.isApproved);

    return request<ApiResponse>({
      method: "POST",
      url: fillRoomId(
        API_ENDPOINTS.VENDOR.ONBOARDING.ROOM_STEP_STORE,
        roomId,
      ),
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      returnFullResponse: true,
    });
  },

  /**
   * Persist a room's Dates data (mirrors `storeStepFiveData`).
   * The shape of `dates` is the same as the existing single-room schema.
   */
  storeRoomDatesData: async (
    roomId: number,
    eventId: number,
    payload: { dates: unknown[]; isApproved?: boolean },
  ): Promise<ApiResponse> => {
    const body: Record<string, unknown> = {
      step: 5,
      event_id: eventId,
      room_id: roomId,
      dates: payload.dates,
    };
    if (typeof payload.isApproved === "boolean") {
      body.isApproved = payload.isApproved;
    }

    return api.post<ApiResponse>(
      fillRoomId(API_ENDPOINTS.VENDOR.ONBOARDING.ROOM_STEP_STORE, roomId),
      body,
      { returnFullResponse: true },
    );
  },

  /**
   * Persist a room's Catering data (mirrors `storeStepSixData`).
   */
  storeRoomCateringData: async (
    roomId: number,
    eventId: number,
    payload: RoomType["catering"] & { isApproved?: boolean },
  ): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("step", "6");
    formData.append("event_id", eventId.toString());
    formData.append(
      "catering_option",
      String(payload.catering_option ?? 0),
    );

    if (payload.menu_title) {
      formData.append("menu_title", payload.menu_title);
    }
    if (payload.menu_description) {
      formData.append("menu_description", payload.menu_description);
    }

    (payload.menus ?? []).forEach((menu, menuIndex) => {
      const m = menu as { name?: string; items?: Array<{ title?: string; description?: string }> };
      if (m.name) {
        formData.append(`menus[${menuIndex}][name]`, m.name);
      }
      (m.items ?? []).forEach((item, itemIndex) => {
        formData.append(
          `menus[${menuIndex}][items][${itemIndex}][title]`,
          item.title ?? "",
        );
        formData.append(
          `menus[${menuIndex}][items][${itemIndex}][description]`,
          item.description ?? "",
        );
      });
    });

    appendRoomMeta(formData, roomId, payload.isApproved);

    return request<ApiResponse>({
      method: "POST",
      url: fillRoomId(
        API_ENDPOINTS.VENDOR.ONBOARDING.ROOM_STEP_STORE,
        roomId,
      ),
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      returnFullResponse: true,
    });
  },

  /**
   * Persist a room's Brochure / Location / Price data (mirrors `storeStepSevenData`).
   */
  storeRoomBrochureData: async (
    roomId: number,
    eventId: number,
    payload: RoomType["brochure"] & { isApproved?: boolean },
  ): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("step", "7");
    formData.append("event_id", eventId.toString());

    if (payload.brochure_pdf instanceof File) {
      formData.append("brochure_pdf", payload.brochure_pdf);
    }
    if (payload.brochure_pdf_2 instanceof File) {
      formData.append("brochure_pdf_2", payload.brochure_pdf_2);
    }
    if (payload.faq_pdf instanceof File) {
      formData.append("faq_pdf", payload.faq_pdf);
    }
    if (payload.remove_brochure_pdf) {
      formData.append("remove_brochure_pdf", "true");
    }
    if (payload.remove_brochure_pdf_2) {
      formData.append("remove_brochure_pdf_2", "true");
    }
    if (payload.remove_faq_pdf) {
      formData.append("remove_faq_pdf", "true");
    }

    if (payload.event_address) {
      formData.append("event_address", payload.event_address);
    }
    if (typeof payload.latitude === "number") {
      formData.append("lat", payload.latitude.toString());
    }
    if (typeof payload.longitude === "number") {
      formData.append("long", payload.longitude.toString());
    }
    if (payload.price_start_from) {
      formData.append("price_start_from", payload.price_start_from);
    }

    appendRoomMeta(formData, roomId, payload.isApproved);

    return request<ApiResponse>({
      method: "POST",
      url: fillRoomId(
        API_ENDPOINTS.VENDOR.ONBOARDING.ROOM_STEP_STORE,
        roomId,
      ),
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      returnFullResponse: true,
    });
  },
};
