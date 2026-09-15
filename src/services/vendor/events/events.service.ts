import {
  EventSchemaType,
  StepOneType,
  StepThreeType,
  StepTwoType,
  StepFourType,
  StepFiveType,
  StepSixType,
  StepSevenType,
  StepEightType,
} from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import { ApiResponse, api, request } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import {
  parseCheckEventNameResponse,
  type CheckEventNameAvailability,
} from "@/lib/parse-check-event-name";
import { isRoomsToFormDataValue } from "@/lib/event-form-limits";
import { toPositiveVendorEventPathId } from "@/app/(protected)/vendor/events/_lib/vendor-event-wizard-step";
import { serializeMenuChoicesReminderDays } from "@/app/(protected)/vendor/events/_lib/menu-choices-reminder-days";
import { buildVendorEventGetUrl } from "./build-vendor-event-get-url";
import { filterSchedulerRowsForApi } from "@/app/(protected)/vendor/events/_lib/normalize-step-two-fields";
import {
  cleanVendorStepThreeDatesForForm,
  formatVendorStepThreeDateForApi,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-three-rooms";
import {
  appendVendorStepFourRoomToFormData,
  appendVendorStepFourSingleRoomToFormData,
  normalizeCateringOptionFlag,
  type VendorStepFourRoomEntry,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-four-rooms";
import {
  appendVendorStepFiveRoomToFormData,
  type VendorStepFiveRoomEntry,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-five-rooms";
import {
  mapVendorDrinksFieldsForApi,
  type VendorStepSixRoomEntry,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-six-rooms";
import { toLocationCoordsPayload } from "@/lib/to-location-coords-payload";
import { clearVendorEventPreviewDraft } from "@/app/(protected)/vendor/events/_lib/vendor-event-preview-live-data";
import {
  EventsQueryParams,
  EventItem,
  EventsResponse,
  EventCategory,
  EventCategoryPayload,
  EventMenuCategoryPayload,
  EventMenuCategoryQueryParams,
  EventMenuCategory,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EventOverviewResponse,
} from "./type";

/** Step 3 API body requires a resolved venue id */
export type StepThreeSavePayload = StepThreeType & {
  vendor_location_id: number;
  is_rooms?: 0 | 1;
  rooms?: Array<{
    room_id: number;
    dates: Array<Record<string, unknown>>;
  }>;
};

export type StepFourSavePayload = StepFourType & {
  is_rooms?: 0 | 1;
  room_id?: number;
  rooms?: VendorStepFourRoomEntry[];
};

export type StepFiveSavePayload = StepFiveType & {
  is_rooms?: 0 | 1;
  rooms?: VendorStepFiveRoomEntry[];
};

export type StepSixSavePayload = StepSixType & {
  is_rooms?: 0 | 1;
  rooms?: VendorStepSixRoomEntry[];
};

const isFileOrBlob = (value: unknown): value is File | Blob => {
  if (typeof value !== "object" || value === null) return false;
  return value instanceof File || value instanceof Blob;
};

/** New uploads as multipart files; persisted URLs as strings (onboarding parity). */
function appendPackageImageField(
  formData: FormData,
  fieldName: string,
  image: unknown,
): void {
  if (image && isFileOrBlob(image)) {
    formData.append(fieldName, image);
    return;
  }
  if (typeof image === "string" && image.trim().length > 0) {
    formData.append(fieldName, image.trim());
  }
}

function vendorEventUpdateUrl(eventId: unknown): string {
  const id = toPositiveVendorEventPathId(eventId);
  if (!id) {
    throw new Error("A valid event id is required to update an event.");
  }
  return API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace("{eventId}", id);
}

export const eventsService = {
  // Get current onboarding step from session

  /**
   * Get a list of events for the vendor
   */
  getEvents: async (params: EventsQueryParams): Promise<EventsResponse> => {
    return api.get<EventsResponse>(API_ENDPOINTS.VENDOR.EVENT.GET_EVENTS, {
      params,
      returnFullResponse: true,
    });
  },

  /**
   * Get a single event by ID
   */
  getEvent: async (
    id: number,
    options?: { isRooms?: boolean },
  ): Promise<ApiResponse<EventItem>> => {
    return api.get<ApiResponse<EventItem>>(
      buildVendorEventGetUrl(id, options?.isRooms === true),
      {
        returnFullResponse: true,
      },
    );
  },

  /**
   * Get event overview with booking details
   */
  getEventOverview: async (
    eventId: string,
    params: {
      date_status?: "all" | "available" | "sold_out";
      date_per_page?: number;
      date_page?: number;
      date_filter?: string;
      room_id?: string;
    },
  ) => {
    let endpoint = API_ENDPOINTS.VENDOR.EVENT.GET_EVENT_OVERVIEW.replace(
      "{eventId}",
      eventId,
    ).replace("{date_status}", params.date_status || "all");

    endpoint = endpoint.replace("{date_filter}", params.date_filter || "");

    return api.get(endpoint, {
      params: {
        date_per_page: params.date_per_page || 10,
        date_page: params.date_page || 1,
        room_id: params.room_id || undefined,
      },
      returnFullResponse: true,
    });
  },

  /**
   * Create a new event
   */
  createEvent: async (
    data: EventSchemaType
  ): Promise<ApiResponse<EventItem>> => {
    return api.post<ApiResponse<EventItem>>(
      API_ENDPOINTS.VENDOR.EVENT.CREATE_EVENT,
      data,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Update an existing event
   */
  updateEvent: async (
    id: number,
    data: EventSchemaType
  ): Promise<ApiResponse<EventItem>> => {
    return api.put<ApiResponse<EventItem>>(
      vendorEventUpdateUrl(id),
      data,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Delete an event
   */
  deleteEvent: async (id: number): Promise<ApiResponse<null>> => {
    return api.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.VENDOR.EVENT.DELETE_EVENT}/${id}`,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Check whether an event name is available for the current vendor location.
   */
  checkEventName: async (
    eventName: string,
  ): Promise<CheckEventNameAvailability> => {
    const trimmed = eventName.trim();
    const response = await api.get<ApiResponse<Record<string, unknown>>>(
      API_ENDPOINTS.VENDOR.EVENT.CHECK_EVENT_NAME,
      {
        params: { event_name: trimmed },
        returnFullResponse: true,
        suppressErrorToast: true,
      },
    );
    return parseCheckEventNameResponse(response);
  },

  /**
   * Get all event categories
   */
  getEventCategories: async (): Promise<
    ApiResponse<EventCategory[]> | EventCategory[]
  > => {
    try {
      const response = await api.get<
        ApiResponse<EventCategory[]> | EventCategory[]
      >(API_ENDPOINTS.VENDOR.EVENT.GET_CATEGORIES, {
        returnFullResponse: true,
      });

      // Handle the case when API returns direct array instead of ApiResponse format
      if (Array.isArray(response)) {
        return response;
      }

      // Handle standard ApiResponse format
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new event category
   */
  createEventCategory: async (
    data: EventCategoryPayload
  ): Promise<ApiResponse<EventCategory>> => {
    return api.post<ApiResponse<EventCategory>>(
      API_ENDPOINTS.VENDOR.EVENT.CREATE_CATEGORY,
      data,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Get all event menu categories (pass room_id when multi-room is enabled)
   */
  getEventMenuCategories: async (
    params: EventMenuCategoryQueryParams,
  ): Promise<ApiResponse<EventMenuCategory[]> | EventMenuCategory[]> => {
    const queryParams: Record<string, number> = {
      event_id: params.event_id,
    };
    if (params.room_id != null && params.room_id > 0) {
      queryParams.room_id = params.room_id;
    }
    return api.get<ApiResponse<EventMenuCategory[]>>(
      API_ENDPOINTS.VENDOR.EVENT.GET_MENU_CATEGORIES,
      {
        returnFullResponse: true,
        params: queryParams,
      },
    );
  },

  /**
   * Create a new event menu category (include room_id when multi-room is enabled)
   */
  createEventMenuCategory: async (
    data: EventMenuCategoryPayload,
  ): Promise<ApiResponse<EventMenuCategory>> => {
    return api.post<ApiResponse<EventMenuCategory>>(
      API_ENDPOINTS.VENDOR.EVENT.CREATE_MENU_CATEGORY,
      data,
      {
        returnFullResponse: true,
      },
    );
  },
  /**
   * Bulk update event statuses
   */
  bulkUpdateStatus: async (data: {
    event_ids: number[];
    action: "active" | "draft" | "cancelled";
  }): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>(
      API_ENDPOINTS.VENDOR.EVENT.BULK_UPDATE_STATUS,
      data,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Permanently delete multiple draft events (vendor bulk delete)
   */
  bulkDeleteEvents: async (data: {
    event_ids: number[];
  }): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>(
      API_ENDPOINTS.VENDOR.EVENT.BULK_DELETE,
      data,
      {
        returnFullResponse: true,
      }
    );
  },

  // Event Step data

  /**
   * Store step 1 event data
   * @param data Step 1 data to be stored
   * @returns API response with status and message
   */
  storeStepOneData: async (data: StepOneType): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData();

    // No need to get vendor_location_id as it's handled by interceptors
    // This code was removed as vendor_location_id is now sent via headers

    // Add only the necessary fields as specified
    formData.append("step", "1");
    // Not sending vendor_location_id as it's already in the interceptor headers
    formData.append("event_category_id", data.event_category_id.toString());
    formData.append("event_name", data.event_name || "");
    formData.append("event_banner_heading", data.event_banner_heading);
    formData.append("event_banner_sub_heading", data.event_banner_sub_heading);
    formData.append("about_event_heading", data.about_event_heading);
    formData.append("about_event_sub_heading", data.about_event_sub_heading);
    formData.append("about_event_description", data.about_event_description);
    formData.append("event_address", data.event_address || "");
    const locationCoords = toLocationCoordsPayload(
      data.latitude,
      data.longitude,
    );
    if (locationCoords) {
      formData.append("latitude", String(locationCoords.latitude));
      formData.append("longitude", String(locationCoords.longitude));
      formData.append("lat", String(locationCoords.lat));
      formData.append("long", String(locationCoords.long));
    }

    // Add header banner if it exists - handle both File and Blob (cropped images)
    if (data.event_banner_image) {
      if (
        data.event_banner_image instanceof File ||
        data.event_banner_image instanceof Blob
      ) {
        formData.append("event_banner_image", data.event_banner_image);
      } else {
        // If no file is provided, we need to inform the API that we're not updating this field
        formData.append("event_banner_image_unchanged", "1");
      }
    } else {
      formData.append("event_banner_image_unchanged", "1");
    }

    if (data.event_banner_video instanceof File) {
      formData.append("event_banner_video", data.event_banner_video);
    } else {
      // If no file is provided, we need to inform the API that we're not updating this field
      formData.append("event_banner_video_unchanged", "1");
    }

    // Add removal flags for banner image and video
    if (data.remove_event_banner_image) {
      formData.append("remove_event_banner_image", "true");
    }
    if (data.remove_event_banner_video) {
      formData.append("remove_event_banner_video", "true");
    }

    if (data.about_event_image) {
      if (
        data.about_event_image instanceof File ||
        data.about_event_image instanceof Blob
      ) {
        formData.append("about_event_image", data.about_event_image);
      } else {
        formData.append("about_event_image_unchanged", "1");
      }
    } else {
      formData.append("about_event_image_unchanged", "1");
    }
    if (data.remove_about_event_image) {
      formData.append("remove_about_event_image", "true");
    }

    if (data.is_rooms === 0 || data.is_rooms === 1) {
      formData.append("is_rooms", isRoomsToFormDataValue(data.is_rooms));
    }

    const response = await request<ApiResponse<EventItem>>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.EVENT.CREATE_EVENT,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // No need to save event_id to localStorage as we'll get it from URL

    return response;
  },

  /**
   * Update step 1 event data for an existing event
   * @param data Step 1 data to be updated
   * @param eventId The ID of the event to update
   * @returns API response with status and message
   */
  updateStepOneData: async (
    data: StepOneType,
    eventId: string
  ): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData();

    // Add only the necessary fields as specified
    formData.append("step", "1");
    formData.append("event_id", eventId);
    // Not sending vendor_location_id as it's already in the interceptor headers
    formData.append("event_category_id", data.event_category_id.toString());
    formData.append("event_name", data.event_name || "");
    formData.append("event_banner_heading", data.event_banner_heading);
    formData.append("event_banner_sub_heading", data.event_banner_sub_heading);
    formData.append("about_event_heading", data.about_event_heading);
    formData.append("about_event_sub_heading", data.about_event_sub_heading);
    formData.append("about_event_description", data.about_event_description);
    formData.append("event_address", data.event_address || "");
    const locationCoords = toLocationCoordsPayload(
      data.latitude,
      data.longitude,
    );
    if (locationCoords) {
      formData.append("latitude", String(locationCoords.latitude));
      formData.append("longitude", String(locationCoords.longitude));
      formData.append("lat", String(locationCoords.lat));
      formData.append("long", String(locationCoords.long));
    }

    // Add header banner if it exists - handle both File and Blob (cropped images)
    if (data.event_banner_image) {
      if (
        data.event_banner_image instanceof File ||
        data.event_banner_image instanceof Blob
      ) {
        formData.append("event_banner_image", data.event_banner_image);
      } else {
        // If no file is provided, we need to inform the API that we're not updating this field
        formData.append("event_banner_image_unchanged", "1");
      }
    } else {
      formData.append("event_banner_image_unchanged", "1");
    }
    if (data.event_banner_video instanceof File) {
      formData.append("event_banner_video", data.event_banner_video);
    } else {
      // If no file is provided, we need to inform the API that we're not updating this field
      formData.append("event_banner_video_unchanged", "1");
    }

    // Add removal flags for banner image and video
    if (data.remove_event_banner_image) {
      formData.append("remove_event_banner_image", "true");
    }
    if (data.remove_event_banner_video) {
      formData.append("remove_event_banner_video", "true");
    }

    if (data.about_event_image) {
      if (
        data.about_event_image instanceof File ||
        data.about_event_image instanceof Blob
      ) {
        formData.append("about_event_image", data.about_event_image);
      } else {
        formData.append("about_event_image_unchanged", "1");
      }
    } else {
      formData.append("about_event_image_unchanged", "1");
    }
    if (data.remove_about_event_image) {
      formData.append("remove_about_event_image", "true");
    }

    if (data.is_rooms === 0 || data.is_rooms === 1) {
      formData.append("is_rooms", isRoomsToFormDataValue(data.is_rooms));
    }

    // Use the UPDATE endpoint instead of CREATE
    const response = await request<ApiResponse<EventItem>>({
      method: "POST",
      url: vendorEventUpdateUrl(eventId),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged(eventId);
    }

    return response;
  },

  /**
   * Store step 4 onboarding data (package)
   * @param data Step 4 data to be stored
   * @returns API response with status and message
   */
  storeStepTwoData: async (data: StepTwoType): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData();
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());
    formData.append("is_rooms", String(data.is_rooms === 1 ? 1 : 0));
    if (data.is_rooms === 1 && Array.isArray(data.removed_room_ids)) {
      data.removed_room_ids.forEach((roomId, index) => {
        if (Number.isFinite(roomId) && roomId > 0) {
          formData.append(`removed_room_ids[${index}]`, String(roomId));
        }
      });
    }
    if (data.is_rooms === 1 && Array.isArray(data.rooms) && data.rooms.length > 0) {
      data.rooms.forEach((room, roomIndex) => {
        if (room.room_id) {
          formData.append(`rooms[${roomIndex}][room_id]`, String(room.room_id));
        }
        formData.append(
          `rooms[${roomIndex}][package_title]`,
          room.package_title || "",
        );
        formData.append(
          `rooms[${roomIndex}][package_description]`,
          room.package_description || "",
        );
        formData.append(
          `rooms[${roomIndex}][package_button_link]`,
          room.package_button_link || "",
        );
        appendPackageImageField(
          formData,
          `rooms[${roomIndex}][package_image]`,
          room.package_image,
        );

        (room.package_details || []).forEach((detail, detailIndex) => {
          formData.append(
            `rooms[${roomIndex}][package_details][${detailIndex}][title]`,
            detail.title || "",
          );
        });

        formData.append(
          `rooms[${roomIndex}][event_schedular_title]`,
          room.event_schedular_title || "",
        );
        formData.append(
          `rooms[${roomIndex}][event_schedule_subtitle]`,
          room.event_schedule_subtitle || "",
        );
        filterSchedulerRowsForApi(room.event_schedular).forEach(
          (schedule, scheduleIndex) => {
            formData.append(
              `rooms[${roomIndex}][event_schedular][${scheduleIndex}][time]`,
              schedule.time,
            );
            formData.append(
              `rooms[${roomIndex}][event_schedular][${scheduleIndex}][title]`,
              schedule.title,
            );
          },
        );

        if (room.event_schedular_background_image) {
          if (isFileOrBlob(room.event_schedular_background_image)) {
            formData.append(
              `rooms[${roomIndex}][event_schedular_background_image]`,
              room.event_schedular_background_image,
            );
          } else {
            formData.append(
              `rooms[${roomIndex}][event_schedular_background_image_unchanged]`,
              "1",
            );
          }
        } else {
          formData.append(
            `rooms[${roomIndex}][event_schedular_background_image_unchanged]`,
            "1",
          );
        }

        const roomGallery = Array.isArray(room.gallery) ? room.gallery : [];
        let roomFileIndex = 0;
        let roomExistingIndex = 0;
        const roomGalleryOrder: Array<
          | { type: "existing"; id: number }
          | { type: "new"; index: number }
        > = [];

        roomGallery.forEach((item) => {
          if (item instanceof File || item instanceof Blob) {
            formData.append(
              `rooms[${roomIndex}][event_gallery_images][${roomFileIndex}]`,
              item,
            );
            roomGalleryOrder.push({ type: "new", index: roomFileIndex });
            roomFileIndex++;
          } else if (
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "url" in item
          ) {
            const existing = item as { id: number; url: string };
            formData.append(
              `rooms[${roomIndex}][existing_gallery_images][${roomExistingIndex}][id]`,
              existing.id.toString(),
            );
            formData.append(
              `rooms[${roomIndex}][existing_gallery_images][${roomExistingIndex}][url]`,
              existing.url,
            );
            roomGalleryOrder.push({ type: "existing", id: existing.id });
            roomExistingIndex++;
          }
        });

        roomGalleryOrder.forEach((entry, orderIndex) => {
          formData.append(
            `rooms[${roomIndex}][gallery_order][${orderIndex}][type]`,
            entry.type,
          );
          if (entry.type === "new") {
            formData.append(
              `rooms[${roomIndex}][gallery_order][${orderIndex}][index]`,
              entry.index.toString(),
            );
          } else {
            formData.append(
              `rooms[${roomIndex}][gallery_order][${orderIndex}][id]`,
              entry.id.toString(),
            );
          }
        });
      });
    } else {
      formData.append("package_title", data.package_title);
      formData.append("package_description", data.package_description);
      if (data.package_button_link) {
        formData.append("package_button_link", data.package_button_link);
      }
    }

    if (data.is_rooms !== 1) {
      appendPackageImageField(formData, "package_image", data.package_image);

      // Add package details in the format package_details[0][title], package_details[1][title], etc.
      data.package_details.forEach((detail, index) => {
        formData.append(`package_details[${index}][title]`, detail.title);
      });
    }

    if (data.is_rooms !== 1) {
      // Timeline/scheduler now belongs to Step 2 (Package tab)
      formData.append("event_schedular_title", data.event_schedular_title);
      formData.append(
        "event_schedule_subtitle",
        data.event_schedule_subtitle || "",
      );
      filterSchedulerRowsForApi(data.event_schedular).forEach((schedule, index) => {
        formData.append(`event_schedular[${index}][time]`, schedule.time);
        formData.append(`event_schedular[${index}][title]`, schedule.title);
      });
      if (data.event_schedular_background_image) {
        if (isFileOrBlob(data.event_schedular_background_image)) {
          formData.append(
            "event_schedular_background_image",
            data.event_schedular_background_image
          );
        } else {
          formData.append("event_schedular_background_image_unchanged", "1");
        }
      } else {
        formData.append("event_schedular_background_image_unchanged", "1");
      }

      // Handle gallery images - both new files and existing backend images (see docs/backend-api/GALLERY_API_FRONTEND_GUIDE.md)
      if (data.gallery && data.gallery.length > 0) {
        let fileIndex = 0;
        let existingImageIndex = 0;
        const galleryOrder: Array<
          { type: "existing"; id: number } | { type: "new"; index: number }
        > = [];

        data.gallery.forEach((item) => {
          if (item instanceof File || item instanceof Blob) {
            formData.append(`event_gallery_images[${fileIndex}]`, item);
            galleryOrder.push({ type: "new", index: fileIndex });
            fileIndex++;
          } else if (
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "url" in item
          ) {
            const existing = item as { id: number; url: string };
            formData.append(
              `existing_gallery_images[${existingImageIndex}][id]`,
              existing.id.toString(),
            );
            formData.append(
              `existing_gallery_images[${existingImageIndex}][url]`,
              existing.url,
            );
            galleryOrder.push({ type: "existing", id: existing.id });
            existingImageIndex++;
          }
        });

        if (galleryOrder.length > 0) {
          formData.append("gallery_order", JSON.stringify(galleryOrder));
        }
      }
    }

    const response = await request<ApiResponse>({
      method: "POST",
      url: vendorEventUpdateUrl(data.event_id),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged(data.event_id);
    }

    return response;
  },

  /**
   * Store step 3 data (event dates, tickets/tables, payment per date).
   * @param data Must include resolved `vendor_location_id` for the API contract.
   */

  storeStepThreeData: async (
    data: StepThreeSavePayload
  ): Promise<ApiResponse> => {
    const formatDates = (dates: StepThreeType["dates"] | undefined) =>
      cleanVendorStepThreeDatesForForm(dates).map((date) =>
        formatVendorStepThreeDateForApi(date),
      );

    const payload =
      data.is_rooms === 1 && Array.isArray(data.rooms) && data.rooms.length > 0
        ? {
          step: data.step,
          vendor_location_id: data.vendor_location_id,
          event_id: data.event_id,
          is_rooms: 1 as const,
          rooms: data.rooms
            .filter((room) => Number(room.room_id) > 0)
            .map((room) => ({
              room_id: Number(room.room_id),
              dates: formatDates(room.dates as StepThreeType["dates"]),
            })),
        }
        : {
          step: data.step,
          vendor_location_id: data.vendor_location_id,
          event_id: data.event_id,
          is_rooms: 0 as const,
          dates: formatDates(data.dates),
        };

    const response = await api.post<ApiResponse<EventItem>>(
      vendorEventUpdateUrl(data.event_id),
      payload,
      {
        returnFullResponse: true,
      }
    );

    // If successful and contains event_id, save it to localStorage
    if (
      response.status &&
      response.data &&
      response.data.event_id &&
      response.data.event_id !== 0
    ) {
      try {
        // Save event_id to localStorage
        localStorage.setItem("event_id", String(response.data.event_id));

        // The session update will be handled by the component
      } catch (error) {
        console.error("Error saving event_id to localStorage:", error);
      }
    }

    // Do not broadcast refresh when the event was removed — listeners would refetch a deleted id (404 × N).
    const eventDeleted =
      response.status &&
      response.data &&
      typeof response.data === "object" &&
      "event_deleted" in response.data &&
      (response.data as { event_deleted?: boolean }).event_deleted === true;

    if (response.status && !eventDeleted) {
      await eventsService.notifyDataChanged(data.event_id);
    }

    return response;
  },

  /**
   * Store step 6 onboarding data
   * @param data Step 6 data to be stored
   * @returns API response with status and message
   */
  storeStepFourData: async (data: StepFourSavePayload): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());

    if (data.is_rooms === 1) {
      formData.append("is_rooms", "1");
      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        data.rooms.forEach((room, roomIndex) => {
          appendVendorStepFourRoomToFormData(
            formData,
            roomIndex,
            room as VendorStepFourRoomEntry,
          );
        });
      } else if (Number(data.room_id) > 0) {
        appendVendorStepFourSingleRoomToFormData(formData, {
          room_id: Number(data.room_id),
          catering_option: normalizeCateringOptionFlag(data.catering_option),
          menu_title: data.menu_title,
          menu_description: data.menu_description,
          menus: data.menus,
          menu_background_image: data.menu_background_image,
        });
      } else {
        throw new Error("A room_id is required for a room catering update.");
      }
    } else {
      formData.append("is_rooms", "0");
      formData.append("catering_option", data.catering_option.toString());

      if (data.menu_title) {
        formData.append("menu_title", data.menu_title);
      }
      if (data.menu_description) {
        formData.append("menu_description", data.menu_description);
      }
      if (data.menus) {
        data.menus.forEach((menu, menuIndex) => {
          formData.append(`menus[${menuIndex}][name]`, menu.name ?? "");
          (menu.items ?? []).forEach((item, itemIndex) => {
            formData.append(
              `menus[${menuIndex}][items][${itemIndex}][title]`,
              item.title ?? "",
            );
            formData.append(
              `menus[${menuIndex}][items][${itemIndex}][description]`,
              item.description || "",
            );
          });
        });
      }

      if (data.menu_background_image instanceof File) {
        formData.append("menu_background_image", data.menu_background_image);
      } else {
        formData.append("menu_background_image_unchanged", "1");
      }
    }

    const response = await api.post<ApiResponse>(
      vendorEventUpdateUrl(data.event_id),
      formData,
      {
        returnFullResponse: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged(data.event_id);
    }

    return response;
  },

  /**
   * Store step 5 brochure data
   * @param data Step 5 data to be stored or FormData instance
   * @returns API response with status and message
   */
  storeStepFiveData: async (
    data: StepFiveSavePayload | FormData
  ): Promise<ApiResponse> => {
    let formData: FormData;

    if (!(data instanceof FormData)) {
      formData = new FormData();

      formData.append("step", String(data.step || 5));
      formData.append("event_id", data.event_id.toString());

      const roomPayload =
        data.is_rooms === 1 &&
        Array.isArray(data.rooms) &&
        data.rooms.length > 0;

      if (roomPayload) {
        formData.append("is_rooms", "1");
        data.rooms!.forEach((room, roomIndex) => {
          appendVendorStepFiveRoomToFormData(formData, roomIndex, room);
        });
      } else {
        formData.append("is_rooms", "0");

        if (data.brochure_pdf instanceof File) {
          formData.append("brochure_pdf", data.brochure_pdf);
        }
        if (data.brochure_pdf_2 instanceof File) {
          formData.append("brochure_pdf_2", data.brochure_pdf_2);
        }
        if (data.remove_brochure_pdf) {
          formData.append("remove_brochure_pdf", "true");
        }
        if (data.remove_brochure_pdf_2) {
          formData.append("remove_brochure_pdf_2", "true");
        }
      }
    } else {
      formData = data;
    }

    const eventIdStr =
      data instanceof FormData
        ? (data.get("event_id") as string) || ""
        : data.event_id.toString();

    const response = await api.post<ApiResponse<EventItem>>(
      vendorEventUpdateUrl(eventIdStr),
      formData,
      {
        returnFullResponse: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged(eventIdStr);
    }

    return response;
  },

  /**
   * Store step 6 data (Other Packages / drinks)
   * @param data Step 6 data to be stored
   * @returns API response with status and message
   */
  storeStepSixData: async (data: StepSixSavePayload): Promise<ApiResponse> => {
    const payload =
      data.is_rooms === 1 && Array.isArray(data.rooms) && data.rooms.length > 0
        ? {
          step: data.step || 6,
          event_id: data.event_id,
          is_rooms: 1 as const,
          rooms: data.rooms
            .filter((room) => Number(room.room_id) > 0)
            .map((room) => ({
              room_id: Number(room.room_id),
              ...mapVendorDrinksFieldsForApi(room),
            })),
        }
        : {
          step: data.step || 6,
          event_id: data.event_id,
          is_rooms: 0 as const,
          ...mapVendorDrinksFieldsForApi(data),
        };

    const response = await api.post<ApiResponse>(
      vendorEventUpdateUrl(data.event_id),
      payload,
      {
        returnFullResponse: true,
      },
    );

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged(data.event_id);
    }

    return response;
  },



  /**
   * Store step 9 onboarding data (FAQs)
   * @param data Step 9 data to be stored
   * @returns API response with status and message
   */
  storeStepSevenData: async (data: StepSevenType): Promise<ApiResponse> => {
    // Create FormData for consistent handling
    const formData = new FormData();

    // Add basic fields
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());

    // Add FAQs with the required array-like notation
    if (data.faqs && data.faqs.length > 0) {
      data.faqs.forEach((faq, index) => {
        formData.append(`faqs[${index}][question]`, faq.question);
        formData.append(`faqs[${index}][answer]`, faq.answer);

        // If this FAQ has an ID (from backend), include it
        if (faq.id) {
          formData.append(`faqs[${index}][id]`, faq.id.toString());
        }
      });
    }

    // Add deleted FAQs IDs if provided
    if (data.deleted_faq_ids && data.deleted_faq_ids.length > 0) {
      data.deleted_faq_ids.forEach((id, index) => {
        formData.append(`deleted_faq_ids[${index}]`, id.toString());
      });
    }

    // Use the same endpoint as other steps
    const response = await request<ApiResponse>({
      method: "POST",
      url: vendorEventUpdateUrl(data.event_id),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged(data.event_id);
    }

    return response;
  },

  /**
   * Store step 11 onboarding data (Reminder Emails & Submit Type)
   * @param data Step 11 data to be stored
   * @returns API response with status and message
   */
  storeStepEightData: async (data: StepEightType): Promise<ApiResponse> => {
    // Create FormData for consistent handling
    const formData = new FormData();

    // Add fields
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());
    formData.append("submit_type", data.submit_type);
    formData.append("is_duplicate", data.is_duplicate.toString());

    const city = data.city || "";
    const address = data.address || "";

    let event_location = "";
    if (address && city) {
      event_location = `${address}, ${city}`;
    } else if (address) {
      event_location = address;
    } else if (city) {
      event_location = city;
    }

    if (event_location) {
      formData.append("event_location", event_location);
    }

    if (city) {
      formData.append("city", city);
    }
    if (address) {
      formData.append("address", address);
    }
    if (data.contact_number) {
      formData.append("contact_number", data.contact_number);
    }

    const coords = toLocationCoordsPayload(
      (data as { latitude?: number }).latitude,
      (data as { longitude?: number }).longitude,
    );
    if (coords) {
      formData.append("latitude", String(coords.latitude));
      formData.append("longitude", String(coords.longitude));
      formData.append("lat", String(coords.lat));
      formData.append("long", String(coords.long));
    }

    if (
      data.is_duplicate &&
      data.vendor_location_id != null &&
      data.vendor_location_id > 0
    ) {
      formData.append("vendor_location_id", data.vendor_location_id.toString());
    }

    if (data.reminder_email_before_days) {
      formData.append(
        "reminder_email_before_days",
        data.reminder_email_before_days.toString()
      );
    }

    const menuChoicesReminderDays = serializeMenuChoicesReminderDays(
      data.reminder_menu_choices_before_days
    );
    if (menuChoicesReminderDays != null) {
      formData.append(
        "reminder_menu_choices_before_days",
        menuChoicesReminderDays.toString()
      );
    }

    formData.append(
      "generate_qr_code",
      data.generate_qr_code === true ? "true" : "false",
    );

    const response = await request<ApiResponse>({
      method: "POST",
      url: vendorEventUpdateUrl(data.event_id),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    if (response.status) {
      await eventsService.notifyDataChanged(data.event_id);
    }

    return response;
  },

  /**
   * Broadcast that persisted event data changed.
   * Pass `eventId` so listeners invalidate only that event — not every open/cached event
   * (needed so editing the original after a location-duplicate does not wipe the copy).
   */
  notifyDataChanged: async (eventId?: string | number): Promise<void> => {
    if (typeof window === "undefined") return;

    const normalizedId =
      eventId != null && String(eventId).trim().length > 0
        ? String(eventId).trim()
        : undefined;

    if (normalizedId) {
      void clearVendorEventPreviewDraft(normalizedId);
    }

    window.dispatchEvent(
      new CustomEvent("event-data-changed", {
        detail: normalizedId ? { eventId: normalizedId } : undefined,
      }),
    );
  },
};
