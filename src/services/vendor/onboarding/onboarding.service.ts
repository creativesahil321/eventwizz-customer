import { api } from "@/services/core/api-client";
import type { ApiResponse as CoreApiResponse } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { authService } from "@/services/common/auth/auth.service";
import { request } from "@/services/core/api-client";
import {
  ApiResponse,
  StepOneType,
  StepTwoType,
  StepThreeType,
  StepFourType,
  StepFiveType,
  StepSixType,
  StepSevenType,
  StepEightType,
  StepNineType,
  StepTenType,
  StepElevenType,
} from "./type";
import type { RoomType } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import { EVENT_GALLERY_MAX_IMAGES } from "@/lib/event-form-limits";
import {
  parseCheckEventNameResponse,
  type CheckEventNameAvailability,
} from "@/lib/parse-check-event-name";
// import { OnBoardingPreviewType } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";

/** Reads the persisted onboarding mode from sessionStorage (client-only, safe). */
function getOnboardingMode(): "ai" | "manual" | null {
  try {
    if (typeof window === "undefined") return null;
    const m = sessionStorage.getItem("onboarding_mode");
    if (m === "ai" || m === "manual") return m;
  } catch {
    // sessionStorage may not be available in some environments
  }
  return null;
}

/**
 * Manual onboarding: backend expects `isApproved` on step saves.
 * Omit during AI bulk-apply (`onboarding_mode === "ai"`) so steps are not all marked approved.
 */
function appendManualIsApprovedToFormData(
  formData: FormData,
  isApproved: boolean | undefined,
): void {
  if (getOnboardingMode() !== "manual") return;
  if (typeof isApproved !== "boolean") return;
  formData.append("isApproved", isApproved ? "1" : "0");
}

function mergeManualIsApproved<T extends Record<string, unknown>>(
  payload: T,
  isApproved: boolean | undefined,
): T & { isApproved?: boolean } {
  if (getOnboardingMode() !== "manual") return payload;
  if (typeof isApproved !== "boolean") return payload;
  return { ...payload, isApproved };
}

type StepFourExistingGalleryItem = { id: number; url: string };
type StepFourGalleryItem = File | Blob | StepFourExistingGalleryItem;

function appendStepFourGalleryPayload(
  formData: FormData,
  gallery: StepFourGalleryItem[],
  options?: {
    deleteGallery?: Array<number | string>;
    replaceGallery?: Array<number | string>;
    roomKey?: string;
  },
): void {
  const roomPrefix = options?.roomKey
    ? `rooms[${options.roomKey}]`
    : "";
  const key = (base: string) => {
    if (!roomPrefix) return base;
    const match = /^([^\[]+)(.*)$/.exec(base);
    if (!match) return `${roomPrefix}[${base}]`;
    const [, root, suffix] = match;
    return `${roomPrefix}[${root}]${suffix}`;
  };

  let fileIndex = 0;
  let existingImageIndex = 0;
  const galleryOrder: Array<
    { type: "existing"; id: number } | { type: "new"; index: number }
  > = [];

  gallery.forEach((item) => {
    if (item instanceof File || item instanceof Blob) {
      formData.append(key(`event_gallery_images[${fileIndex}]`), item);
      galleryOrder.push({ type: "new", index: fileIndex });
      fileIndex++;
      return;
    }

    if (
      item &&
      typeof item === "object" &&
      typeof (item as StepFourExistingGalleryItem).id === "number" &&
      typeof (item as StepFourExistingGalleryItem).url === "string"
    ) {
      const existing = item as StepFourExistingGalleryItem;
      formData.append(
        key(`existing_gallery_images[${existingImageIndex}][id]`),
        String(existing.id),
      );
      formData.append(
        key(`existing_gallery_images[${existingImageIndex}][url]`),
        existing.url,
      );
      galleryOrder.push({ type: "existing", id: existing.id });
      existingImageIndex++;
    }
  });

  galleryOrder.forEach((item, index) => {
    formData.append(key(`gallery_order[${index}][type]`), item.type);
    if (item.type === "existing") {
      formData.append(key(`gallery_order[${index}][id]`), String(item.id));
    } else {
      formData.append(key(`gallery_order[${index}][index]`), String(item.index));
    }
  });

  if (Array.isArray(options?.deleteGallery)) {
    options.deleteGallery.forEach((id, index) => {
      formData.append(key(`delete_gallery[${index}]`), String(id));
    });
  }
  if (Array.isArray(options?.replaceGallery)) {
    options.replaceGallery.forEach((id, index) => {
      formData.append(key(`replace_gallery[${index}]`), String(id));
    });
  }
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function resolveStepFiveEventDate(
  date: StepFiveType["dates"][number],
): string {
  const raw =
    date.event_date ??
    (date as StepFiveType["dates"][number] & { date?: unknown }).date;
  return String(raw ?? "").trim();
}

function normalizeStepFiveDatePayload(
  date: StepFiveType["dates"][number],
): Record<string, unknown> {
  const anyDate = date as unknown as {
    generate_qr_code?: boolean;
    show_on_frontend?: boolean;
  };
  const eventDate = resolveStepFiveEventDate(date);
  const bookingType = date.booking_type ?? "tickets";
  const tickets =
    bookingType !== "tables"
      ? (date.tickets ?? []).map((ticket) => ({
        title: ticket.title ?? "",
        description: ticket.description ?? "",
        total_capacity: toSafeNumber(ticket.total_capacity),
        price: toSafeNumber(ticket.price),
      }))
      : [];
  const tables =
    bookingType !== "tickets"
      ? (date.tables ?? []).map((table) => ({
        min_persons: toSafeNumber(table.min_persons),
        max_persons: toSafeNumber(table.max_persons),
        price: toSafeNumber(table.price),
        total_tables: toSafeNumber(table.total_tables),
      }))
      : [];

  const payload: Record<string, unknown> = {
    event_date: eventDate,
    date: eventDate,
    booking_type: bookingType,
    total_table_types: tables.length,
    tables,
    total_ticket_types: tickets.length,
    generate_qr_code: anyDate.generate_qr_code ?? true,
    tickets,
    show_on_frontend: anyDate.show_on_frontend ?? true,
  };

  if (bookingType !== "tickets") {
    const paymentType = date.payment_type ?? "full";
    payload.payment_type = paymentType;

    if (paymentType === "deposit") {
      payload.is_deposit_enabled = true;
      const depositValue = toSafeNumber(date.deposit_value);
      payload.deposit_type =
        date.deposit_type === "percentage" ? "percentage" : "amount";
      payload.deposit_value = depositValue;
      // Keep legacy key for backward compatibility with any backend variants.
      payload.deposit_amount = depositValue;
      payload.deposit_due_date = date.deposit_due_date ?? "";
    } else {
      payload.is_deposit_enabled = false;
    }
  }

  return payload;
}

export type CheckBrandNameAvailability = CheckEventNameAvailability;

export const onboardingService = {
  /**
   * Check whether a brand or venue name is available during onboarding.
   */
  checkBrandName: async (
    name: string,
  ): Promise<CheckBrandNameAvailability> => {
    const trimmed = name.trim();
    const response = await api.get<CoreApiResponse<Record<string, unknown>>>(
      API_ENDPOINTS.VENDOR.ONBOARDING.CHECK_BRAND_NAME,
      {
        params: { name: trimmed },
        returnFullResponse: true,
        suppressErrorToast: true,
      },
    );
    return parseCheckEventNameResponse(response);
  },

  getCurrentStep: async (): Promise<number> => {
    try {
      const stepFromSession = await authService.getCurrentOnboardingStep();
      if (stepFromSession && stepFromSession > 0) {
        return stepFromSession;
      }
    } catch (error) {
      console.warn("Error getting step from session:", error);
    }

    return 1;
  },

  saveStep: async (
    step: number
  ): Promise<Record<string, string | boolean | number>> => {
    try {
      const updateData = await authService.updateSession({
        on_boarding_step: step,
      });

      return updateData as Record<string, string | number | boolean>;
    } catch (error) {
      console.error("Error saving step:", error);
      return {};
    }
  },

  /**
   * Store onboarding data for a specific step
   * @param data Step data to be stored
   * @returns API response with status and message
   */
  storeStepData: async (data: StepOneType): Promise<ApiResponse> => {
    const nameTrimmed = (data.name ?? "").trim();
    const addressTrimmed = (data.address ?? "").trim();
    const emailTrimmed = (data.email ?? "").trim();
    const contactTrimmed = (data.contact_number ?? "").trim();

    // Use city from form data if available, otherwise extract from address
    let city = (data.city ?? "").trim();

    // If city is still empty, try to extract it from address
    if (!city && addressTrimmed) {
      const addressParts = addressTrimmed.split(",").map((part) => part.trim());
      // Usually the city is the second-to-last or last part, depending on format
      if (addressParts.length >= 2) {
        city = addressParts[addressParts.length - 2];
      }
    }

    const mode = getOnboardingMode();
    const hasMultipleFlag =
      data.has_multiple_locations === true ||
      data.has_multiple_locations === false;

    const payload: Record<string, unknown> = {
      step: data.step,
      name: nameTrimmed,
      contact_number: contactTrimmed,
      email: emailTrimmed,
      address: addressTrimmed,
      city: city,
      ...(mode && { mode }),
      ...(hasMultipleFlag && {
        has_multiple_locations: data.has_multiple_locations,
      }),
    };

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      mergeManualIsApproved(payload, data.isApproved),
      {
        returnFullResponse: true,
      }
    );

    // If successful, get vendor_location_id from response and save it
    if (response.status && response.data) {
      try {
        // Get relevant data from the response
        const vendorLocationId = response.data.vendor_location_id;
        const onBoardingStep = response.data.on_boarding_step || 1;

        // Session update will handle the data persistence

        // Prepare session update data for component use
        // but don't attach it to the response as it would break the type
        await authService.updateSession({
          vendor_location_id: vendorLocationId,
          on_boarding_step: onBoardingStep,
        });

        // Notify that data has changed
        await onboardingService.notifyDataChanged();
      } catch (error) {
        console.error("Error saving response data:", error);
      }
    }

    return response;
  },

  /**
   * Store step 2 onboarding data
   * @param data Step 2 data to be stored
   * @returns API response with status and message
   */
  storeStepTwoData: async (data: StepTwoType): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData();
    formData.append("step", data.step.toString());

    // Try to get vendor_location_id from session
    let vendorLocationId = "0"; // Default fallback
    try {
      const session = await import("next-auth/react").then((mod) =>
        mod.getSession()
      );
      if (session?.user?.vendor_location_id) {
        vendorLocationId = String(session.user.vendor_location_id);
      }
    } catch (error) {
      console.error("Error getting vendor_location_id from session:", error);
      // Continue with default or localStorage value
    }

    formData.append("vendor_location_id", vendorLocationId);
    formData.append("banner_heading", data.banner_heading);
    formData.append("banner_sub_heading", data.banner_sub_heading);
    formData.append("about_title", data.about_title);
    formData.append("about_description", data.about_description);

    // Add logo and cover_image if they exist
    // Check for both File and Blob (cropped images might be Blob)
    if (data.logo) {
      if (data.logo instanceof File || data.logo instanceof Blob) {
        formData.append("logo", data.logo);
      }
    }

    if (data.cover_image) {
      if (
        data.cover_image instanceof File ||
        data.cover_image instanceof Blob
      ) {
        formData.append("cover_image", data.cover_image);
      }
    }

    appendManualIsApprovedToFormData(formData, data.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 3 onboarding data
   * @param data Step 3 data to be stored
   * @returns API response with status and message
   */
  storeStepThreeData: async (data: StepThreeType): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData();

    // Try to get vendor_location_id from session
    let vendorLocationId = "0"; // Default fallback
    try {
      const session = await import("next-auth/react").then((mod) =>
        mod.getSession()
      );
      if (session?.user?.vendor_location_id) {
        vendorLocationId = String(session.user.vendor_location_id);
      } else if (data.vendor_location_id) {
        // Use from data if available
        vendorLocationId = String(data.vendor_location_id);
      }
    } catch (error) {
      console.error("Error getting vendor_location_id from session:", error);
      // Continue with data value if available
      if (data.vendor_location_id) {
        vendorLocationId = String(data.vendor_location_id);
      }
    }

    // Add only the necessary fields as specified
    formData.append("step", "3");
    formData.append("vendor_location_id", vendorLocationId);
    formData.append("event_category_id", data.event_category_id.toString());
    formData.append("event_name", data.event_name || "");

    // Add video if it exists - handle both File and Blob
    if (data.event_banner_video) {
      if (
        data.event_banner_video instanceof File ||
        data.event_banner_video instanceof Blob
      ) {
        formData.append("event_banner_video", data.event_banner_video);
      }
    }

    formData.append("event_banner_heading", data.event_banner_heading);
    formData.append("event_banner_sub_heading", data.event_banner_sub_heading);
    formData.append("about_event_heading", data.about_event_heading);
    formData.append("about_event_sub_heading", data.about_event_sub_heading);
    formData.append("about_event_description", data.about_event_description);

    // Add header banner if it exists - handle both File and Blob (cropped images)
    if (data.event_banner_image) {
      if (
        data.event_banner_image instanceof File ||
        data.event_banner_image instanceof Blob
      ) {
        formData.append("event_banner_image", data.event_banner_image);
      } else if (typeof data.event_banner_image === "string") {
        // If no file is provided, we need to inform the API that we're not updating this field
        formData.append("event_banner_image_unchanged", "1");
      }
    } else {
      // If no file is provided, we need to inform the API that we're not updating this field
      formData.append("event_banner_image_unchanged", "1");
    }

    // Add removal flags for banner image and video
    if (data.remove_event_banner_image) {
      formData.append("remove_event_banner_image", "true");
    }
    if (data.remove_event_banner_video) {
      formData.append("remove_event_banner_video", "true");
    }

    appendManualIsApprovedToFormData(formData, data.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Session update will be handled by the component

    return response;
  },

  /**
   * Store step 4 onboarding data (package)
   * @param data Step 4 data to be stored
   * @returns API response with status and message
   */
  storeStepFourData: async (data: StepFourType): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData();
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());
    formData.append("is_rooms", "0");
    formData.append("package_title", data.package_title);
    formData.append("package_description", data.package_description);
    formData.append("event_schedular_title", data.event_schedular_title ?? "");
    formData.append("event_schedule_subtitle", data.event_schedule_subtitle ?? "");
    const anyStepFour = data as unknown as {
      delete_gallery?: Array<number | string>;
      replace_gallery?: Array<number | string>;
    };

    // Add package image if it exists - handle both File and Blob
    // (Data may be a URL string as well, so guard `instanceof` checks.)
    const stepFourImg: any = data.package_image as any;
    if (
      stepFourImg &&
      typeof stepFourImg === "object" &&
      (stepFourImg instanceof File || stepFourImg instanceof Blob)
    ) {
      formData.append("package_image", stepFourImg);
    } else if (typeof stepFourImg === "string") {
      formData.append("package_image", stepFourImg);
    } else {
      formData.append("package_image", "");
    }

    // Add package details in the format package_details[0][title], package_details[1][title], etc.
    data.package_details.forEach((detail, index) => {
      formData.append(`package_details[${index}][title]`, detail.title);
    });
    (data.event_schedular ?? []).forEach((schedule, index) => {
      formData.append(`event_schedular[${index}][time]`, schedule.time ?? "");
      formData.append(`event_schedular[${index}][title]`, schedule.title ?? "");
    });

    // Handle gallery images - both new files and existing backend images (see docs/backend-api/GALLERY_API_FRONTEND_GUIDE.md)
    appendStepFourGalleryPayload(
      formData,
      ((data.gallery ?? []) as unknown as StepFourGalleryItem[]).slice(
        0,
        EVENT_GALLERY_MAX_IMAGES,
      ),
      {
        deleteGallery: anyStepFour.delete_gallery,
        replaceGallery: anyStepFour.replace_gallery,
      },
    );

    appendManualIsApprovedToFormData(formData, data.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 4 onboarding data in multi-room mode (packages per room).
   * Backend expects `is_rooms: true` and a `rooms` array-like object keyed by index.
   */
  storeStepFourRoomsData: async (payload: {
    event_id: number;
    isApproved?: boolean;
    currentRoomIndex?: number;
    rooms: RoomType[];
    delete_gallery?: Array<number | string>;
    replace_gallery?: Array<number | string>;
  }): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("step", "4");
    formData.append("event_id", payload.event_id.toString());
    formData.append("is_rooms", "1");

    const activeIndex = Math.min(
      payload.currentRoomIndex ?? 0,
      Math.max(payload.rooms.length - 1, 0),
    );
    payload.rooms.forEach((room, roomIndex) => {
      const roomId = Number(room.id);
      if (!Number.isFinite(roomId) || roomId <= 0) return;

      const key = String(roomIndex);
      formData.append(`rooms[${key}][room_id]`, roomId.toString());

      const p = room.package ?? ({} as RoomType["package"]);

      if (p.package_title) {
        formData.append(`rooms[${key}][package_title]`, p.package_title);
      } else {
        formData.append(`rooms[${key}][package_title]`, "");
      }
      if (p.package_description) {
        formData.append(
          `rooms[${key}][package_description]`,
          p.package_description,
        );
      } else {
        formData.append(`rooms[${key}][package_description]`, "");
      }
      formData.append(
        `rooms[${key}][event_schedular_title]`,
        p.event_schedular_title ?? "",
      );
      formData.append(
        `rooms[${key}][event_schedule_subtitle]`,
        p.event_schedule_subtitle ?? "",
      );

      const img: any = p.package_image as any;
      if (
        img &&
        typeof img === "object" &&
        (img instanceof File || img instanceof Blob)
      ) {
        formData.append(`rooms[${key}][package_image]`, img);
      } else if (typeof img === "string") {
        formData.append(`rooms[${key}][package_image]`, img);
      } else {
        formData.append(`rooms[${key}][package_image]`, "");
      }

      const details = p.package_details ?? [];
      details.forEach((detail, detailIndex) => {
        formData.append(
          `rooms[${key}][package_details][${detailIndex}][title]`,
          detail?.title ?? "",
        );
      });
      const schedulerTitle = String(p.event_schedular_title ?? "").trim();
      if (schedulerTitle.length > 0) {
        // Optional timeline: drop untouched placeholder rows so backend date_format
        // rules don't run against empty `{ title: "", time: "" }`.
        const normalizedSchedules = (p.event_schedular ?? [])
          .map((schedule) => ({
            title: String(schedule?.title ?? "").trim(),
            time: String(schedule?.time ?? "").trim(),
          }))
          .filter(
            (schedule) =>
              schedule.title.length > 0 || schedule.time.length > 0,
          );

        normalizedSchedules.forEach((schedule, scheduleIndex) => {
          formData.append(
            `rooms[${key}][event_schedular][${scheduleIndex}][title]`,
            schedule.title,
          );
          formData.append(
            `rooms[${key}][event_schedular][${scheduleIndex}][time]`,
            schedule.time,
          );
        });
      }

      appendStepFourGalleryPayload(
        formData,
        ((p.gallery ?? []) as unknown as StepFourGalleryItem[]).slice(
          0,
          EVENT_GALLERY_MAX_IMAGES,
        ),
        {
          roomKey: key,
          deleteGallery:
            roomIndex === activeIndex ? payload.delete_gallery : undefined,
          replaceGallery:
            roomIndex === activeIndex ? payload.replace_gallery : undefined,
        },
      );
    });

    appendManualIsApprovedToFormData(formData, payload.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 5 onboarding data (booking type and dates/pricing)
   * @param data Step 5 data to be stored
   * @returns API response with status and message
   */

  storeStepFiveData: async (data: StepFiveType): Promise<ApiResponse> => {
    // Keep single-room payload backward-compatible with the previous contract.
    const formattedDates = (data.dates ?? []).map((date) => {
      const bookingType = date.booking_type ?? "tickets";
      const base = {
        event_date: date.event_date,
        booking_type: bookingType,
        total_table_types:
          bookingType !== "tickets" ? (date.tables ?? []).length : 0,
        tables: bookingType !== "tickets" ? (date.tables ?? []) : [],
        total_ticket_types:
          bookingType !== "tables" ? (date.tickets ?? []).length : 0,
        tickets: bookingType !== "tables" ? (date.tickets ?? []) : [],
      };

      if (bookingType !== "tickets") {
        const paymentType = date.payment_type ?? "full";
        if (paymentType === "deposit") {
          return {
            ...base,
            payment_type: paymentType,
            is_deposit_enabled: true,
            deposit_type: date.deposit_type || "amount",
            deposit_value: date.deposit_value || 0,
            deposit_due_date: date.deposit_due_date || "",
          };
        }

        return {
          ...base,
          payment_type: paymentType,
          is_deposit_enabled: false,
        };
      }

      return base;
    });

    const payload = mergeManualIsApproved(
      {
        step: data.step,
        event_id: data.event_id,
        dates: formattedDates,
      },
      data.isApproved,
    );

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      payload,
      {
        returnFullResponse: true,
      }
    );

    // Session update will be handled by the component

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 5 data in multi-room mode.
   * Backend expects `is_rooms: 1` and an aggregate `rooms[]` payload.
   */
  storeStepFiveRoomsData: async (payload: {
    event_id: number;
    rooms: RoomType[];
    isApproved?: boolean;
  }): Promise<ApiResponse> => {
    const roomBlocks = payload.rooms
      .filter((room) => Number.isFinite(Number(room.id)) && Number(room.id) > 0)
      .map((room) => ({
        room_id: Number(room.id),
        dates: ((room.dates?.dates ?? []) as StepFiveType["dates"])
          .filter((date) => resolveStepFiveEventDate(date).length > 0)
          .map(normalizeStepFiveDatePayload),
      }));

    const firstDate = roomBlocks[0]?.dates?.[0] as
      | { booking_type?: "tickets" | "tables" | "both" }
      | undefined;

    const body = mergeManualIsApproved(
      {
        step: 5,
        event_id: payload.event_id,
        booking_type: firstDate?.booking_type ?? "tickets",
        is_rooms: 1,
        rooms: roomBlocks,
      },
      payload.isApproved,
    );

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      body,
      {
        returnFullResponse: true,
      },
    );

    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 6 onboarding data
   * @param data Step 6 data to be stored
   * @returns API response with status and message
   */
  storeStepSixData: async (data: StepSixType): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData(); // Add basic fields
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());
    formData.append("catering_option", data.catering_option.toString());
    formData.append("is_rooms", "0");

    if (data.menu_title) {
      formData.append("menu_title", data.menu_title);
    }
    if (data.menu_description) {
      formData.append("menu_description", data.menu_description);
    }

    if (data.menus) {
      // Add menus with the required array-like notation
      data.menus?.forEach((menu, menuIndex) => {
        formData.append(`menus[${menuIndex}][name]`, menu.name);

        menu.items.forEach((item, itemIndex) => {
          formData.append(
            `menus[${menuIndex}][items][${itemIndex}][title]`,
            item.title
          );
          formData.append(
            `menus[${menuIndex}][items][${itemIndex}][description]`,
            item.description || ""
          );
        });
      });
    }

    appendManualIsApprovedToFormData(formData, data.isApproved);

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
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
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 6 data in multi-room mode.
   * Backend expects multipart payload with `rooms[index][...]`.
   */
  storeStepSixRoomsData: async (payload: {
    event_id: number;
    rooms: RoomType[];
    isApproved?: boolean;
  }): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("step", "6");
    formData.append("event_id", payload.event_id.toString());
    formData.append("is_rooms", "1");

    payload.rooms.forEach((room, roomIndex) => {
      const roomId = Number(room.id);
      if (!Number.isFinite(roomId) || roomId <= 0) return;

      const catering = room.catering ?? {};
      formData.append(`rooms[${roomIndex}][room_id]`, roomId.toString());
      formData.append(
        `rooms[${roomIndex}][catering_option]`,
        String(catering.catering_option ?? 0),
      );

      if ((catering.catering_option ?? 0) === 1) {
        formData.append(
          `rooms[${roomIndex}][menu_title]`,
          catering.menu_title ?? "",
        );
        formData.append(
          `rooms[${roomIndex}][menu_description]`,
          catering.menu_description ?? "",
        );
        const categoryId = Number(catering.event_menu_category_id);
        if (Number.isFinite(categoryId) && categoryId > 0) {
          formData.append(
            `rooms[${roomIndex}][event_menu_category_id]`,
            String(categoryId),
          );
        }

        (catering.menus ?? []).forEach((menu, menuIndex) => {
          const m = menu as {
            name?: string;
            items?: Array<{ title?: string; description?: string }>;
          };
          formData.append(
            `rooms[${roomIndex}][menus][${menuIndex}][name]`,
            m.name ?? "",
          );
          (m.items ?? []).forEach((item, itemIndex) => {
            formData.append(
              `rooms[${roomIndex}][menus][${menuIndex}][items][${itemIndex}][title]`,
              item.title ?? "",
            );
            formData.append(
              `rooms[${roomIndex}][menus][${menuIndex}][items][${itemIndex}][description]`,
              item.description ?? "",
            );
          });
        });
      }
    });

    appendManualIsApprovedToFormData(formData, payload.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 7 onboarding data
   * @param data Step 7 data to be stored
   * @returns API response with status and message
   */
  storeStepSevenData: async (data: StepSevenType): Promise<ApiResponse> => {
    let formData: FormData;

    if (!(data instanceof FormData)) {
      // Convert StepEightType to FormData
      formData = new FormData();

      // Add required fields
      formData.append("step", data.step.toString());
      formData.append("event_id", data.event_id.toString());
      formData.append("is_rooms", "0");

      // Add files if available - only if they're actually File objects
      // If they're URLs, don't send them - backend will keep existing files
      if (data.brochure_pdf instanceof File) {
        formData.append("brochure_pdf", data.brochure_pdf);
      }

      if (data.brochure_pdf_2 instanceof File) {
        formData.append("brochure_pdf_2", data.brochure_pdf_2);
      }

      // Add removal flags for PDFs
      if (data.remove_brochure_pdf) {
        formData.append("remove_brochure_pdf", "true");
      }
      if (data.remove_brochure_pdf_2) {
        formData.append("remove_brochure_pdf_2", "true");
      }

      // Add text fields
      if (data.event_address) {
        formData.append("event_address", data.event_address);
      }

      // Add latitude and longitude coordinates
      if (data.latitude !== undefined) {
        formData.append("lat", data.latitude.toString());
      }

      if (data.longitude !== undefined) {
        formData.append("long", data.longitude.toString());
      }

      if (data.price_start_from) {
        formData.append("price_start_from", data.price_start_from);
      }

      appendManualIsApprovedToFormData(formData, data.isApproved);
    } else {
      formData = data;
    }

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
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
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 7 data in multi-room mode.
   * Backend expects shared `event_address` and per-room brochure files/removal flags.
   */
  storeStepSevenRoomsData: async (payload: {
    event_id: number;
    event_address: string;
    latitude?: number;
    longitude?: number;
    rooms: RoomType[];
    isApproved?: boolean;
  }): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("step", "7");
    formData.append("event_id", payload.event_id.toString());
    formData.append("is_rooms", "1");
    formData.append("event_address", payload.event_address ?? "");
    if (typeof payload.latitude === "number") {
      formData.append("lat", payload.latitude.toString());
    }
    if (typeof payload.longitude === "number") {
      formData.append("long", payload.longitude.toString());
    }

    payload.rooms.forEach((room, roomIndex) => {
      const roomId = Number(room.id);
      if (!Number.isFinite(roomId) || roomId <= 0) return;

      const brochure = room.brochure ?? {};
      formData.append(`rooms[${roomIndex}][room_id]`, roomId.toString());

      if (brochure.brochure_pdf instanceof File) {
        formData.append(`rooms[${roomIndex}][brochure_pdf]`, brochure.brochure_pdf);
      } else if (
        typeof brochure.brochure_pdf === "string" &&
        brochure.brochure_pdf.trim().length > 0
      ) {
        formData.append(
          `rooms[${roomIndex}][brochure_pdf]`,
          brochure.brochure_pdf.trim(),
        );
      }

      if (brochure.brochure_pdf_2 instanceof File) {
        formData.append(
          `rooms[${roomIndex}][brochure_pdf_2]`,
          brochure.brochure_pdf_2,
        );
      } else if (
        typeof brochure.brochure_pdf_2 === "string" &&
        brochure.brochure_pdf_2.trim().length > 0
      ) {
        formData.append(
          `rooms[${roomIndex}][brochure_pdf_2]`,
          brochure.brochure_pdf_2.trim(),
        );
      }

      if (brochure.faq_pdf instanceof File) {
        formData.append(`rooms[${roomIndex}][faq_pdf]`, brochure.faq_pdf);
      } else if (
        typeof brochure.faq_pdf === "string" &&
        brochure.faq_pdf.trim().length > 0
      ) {
        formData.append(
          `rooms[${roomIndex}][faq_pdf]`,
          brochure.faq_pdf.trim(),
        );
      }

      if (brochure.price_start_from) {
        formData.append(
          `rooms[${roomIndex}][price_start_from]`,
          String(brochure.price_start_from),
        );
      }

      if (brochure.remove_brochure_pdf) {
        formData.append(`rooms[${roomIndex}][remove_brochure_pdf]`, "true");
      }
      if (brochure.remove_brochure_pdf_2) {
        formData.append(`rooms[${roomIndex}][remove_brochure_pdf_2]`, "true");
      }
      if (brochure.remove_faq_pdf) {
        formData.append(`rooms[${roomIndex}][remove_faq_pdf]`, "true");
      }
    });

    appendManualIsApprovedToFormData(formData, payload.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 8 onboarding data
   * @param data Step 8 data to be stored or FormData instance
   * @returns API response with status and message
   */
  storeStepEightData: async (
    data: StepEightType | FormData
  ): Promise<ApiResponse> => {
    const payload =
      data instanceof FormData
        ? data
        : mergeManualIsApproved(
          {
            step: data.step,
            event_id: data.event_id,
            is_rooms: 0,
            drink_title: data.drink_title,
            drink_description: data.drink_description,
            packages: data.packages,
          },
          data.isApproved,
        );

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      payload,
      {
        returnFullResponse: true,
      }
    );

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 8 onboarding data in multi-room mode (drinks per room).
   * Backend expects `is_rooms: 1` and a rooms array payload.
   */
  storeStepEightRoomsData: async (payload: {
    event_id: number;
    isApproved?: boolean;
    rooms: RoomType[];
  }): Promise<ApiResponse> => {
    const rooms = payload.rooms
      .map((room) => {
        const roomId = Number(room.id);
        if (!Number.isFinite(roomId) || roomId <= 0) return null;
        const drinks = room.drinks ?? {};
        return {
          room_id: roomId,
          drink_title: String(drinks.drink_title ?? ""),
          drink_description: String(drinks.drink_description ?? ""),
          packages: Array.isArray(drinks.packages) ? drinks.packages : [],
        };
      })
      .filter((room): room is NonNullable<typeof room> => room !== null);

    const body = mergeManualIsApproved(
      {
        step: 8,
        event_id: payload.event_id,
        is_rooms: 1,
        rooms,
      },
      payload.isApproved,
    );

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      body,
      {
        returnFullResponse: true,
      },
    );

    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },



  /**
   * Store step 9 onboarding data (FAQs)
   * @param data Step 9 data to be stored
   * @returns API response with status and message
   */
  storeStepNineData: async (data: StepNineType): Promise<ApiResponse> => {
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

    appendManualIsApprovedToFormData(formData, data.isApproved);

    // Use the same endpoint as other steps
    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 10 onboarding data (Payment Configuration)
   * Payment gateways are handled separately via connectPaymentGateway()
   * This step only stores basic step information and skip status
   * @param data Step 10 data to be stored
   * @returns API response with status and message
   */
  storeStepTenData: async (data: StepTenType): Promise<ApiResponse> => {
    // Create FormData for consistent handling
    const formData = new FormData();

    // Add required fields
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());
    formData.append("accept_payment_method", data.accept_payment_method);
    formData.append("is_skipped", data.is_skipped ? "1" : "0");

    appendManualIsApprovedToFormData(formData, data.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 11 onboarding data (Domain / publish)
   * Domain, confirm domain, reminder emails, and optional duplicate location.
   * @param data Step 11 data to be stored
   * @returns API response with status and message
   */
  storeStepElevenData: async (data: StepElevenType): Promise<ApiResponse> => {
    // Create FormData for consistent handling
    const formData = new FormData();

    // Add fields
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());
    formData.append("submit_type", data.submit_type);
    formData.append("domain", data.domain.trim().toLowerCase());
    formData.append("confirm_domain", data.confirm_domain ? "true" : "false");

    // Handle city and address fields
    const city = data.city || "";
    const address = data.address || "";

    // For backward compatibility, combine address and city into event_location
    // if both are provided, otherwise use whichever one is available
    let event_location = "";
    if (address && city) {
      event_location = `${address}, ${city}`;
    } else if (address) {
      event_location = address;
    } else if (city) {
      event_location = city;
    }

    // Add event_location with combined or individual value
    if (event_location) {
      formData.append("event_location", event_location);
    }

    // Also add individual fields for future API compatibility
    if (city) {
      formData.append("city", city);
    }
    if (address) {
      formData.append("address", address);
    }
    if (data.contact_number) {
      formData.append("contact_number", data.contact_number);
    }

    if (data.reminder_email_before_days) {
      formData.append(
        "reminder_email_before_days",
        data.reminder_email_before_days.toString()
      );
    }

    appendManualIsApprovedToFormData(formData, data.isApproved);

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  connectPaymentGateway: async (
    paymentGateway: "truelayer" | "stripe" | "paypal" | "worldpay" | "klarna",
    credentials: { key: string; secret: string },
  ): Promise<{
    status: boolean;
    message: string;
    data?: {
      gateway: string;
      account?: {
        id: number;
        account_status?: "pending" | "active" | "under_review" | "restricted";
        is_enabled?: boolean;
        key?: string;
        client_secret?: string;
        account_id?: string;
      };
      webhook_url?: string | null;
      manual_webhook?: boolean;
      webhook_setup_hint?: string | null;
      public_key?: string | null;
      verification?: {
        stripe_account_verified_at?: string | null;
        paypal_oauth_verified_at?: string | null;
        truelayer_oauth_verified_at?: string | null;
        truelayer_env?: string | null;
        charges_enabled?: boolean;
        payouts_enabled?: boolean;
        manual_webhook?: boolean;
        signing_key_generated?: boolean;
      };
      account_id?: string;
      connection_status?: string;
    };
    errors: string[] | Record<string, string[]>;
  }> => {
    try {
      const payload = {
        payment_gateway: paymentGateway,
        credentials: {
          key: credentials.key.trim(),
          secret: credentials.secret.trim(),
        },
      };

      const response = await api.post<{
        status: boolean;
        message: string;
        data?: {
          gateway: string;
          account?: {
            id: number;
            account_status?:
              | "pending"
              | "active"
              | "under_review"
              | "restricted";
            is_enabled?: boolean;
            key?: string;
            client_secret?: string;
            account_id?: string;
          };
          webhook_url?: string | null;
          manual_webhook?: boolean;
          webhook_setup_hint?: string | null;
          public_key?: string | null;
          verification?: {
            stripe_account_verified_at?: string | null;
            paypal_oauth_verified_at?: string | null;
            truelayer_oauth_verified_at?: string | null;
            truelayer_env?: string | null;
            charges_enabled?: boolean;
            payouts_enabled?: boolean;
            manual_webhook?: boolean;
            signing_key_generated?: boolean;
          };
          account_id?: string;
          connection_status?: string;
        };
        errors: string[] | Record<string, string[]>;
      }>(API_ENDPOINTS.VENDOR.ONBOARDING.PAYMENT_GATEWAYS, payload, {
        returnFullResponse: true,
      });

      return response;
    } catch (error) {
      console.error("Payment gateway connection error:", error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to connect payment gateway",
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to connect payment gateway",
        ],
      };
    }
  },

  /**
   * Handle payment gateway return after vendor completes onboarding
   * Common function for all payment gateways (Stripe, PayPal, TrueLayer, etc.)
   * @param gateway Payment gateway name: "stripe" | "paypal" | "truelayer" | "worldpay" | "klarna"
   * @param returnParams Additional parameters from the return URL (account_id, merchant_id, etc.)
   * @returns API response with connection status
   */
  handlePaymentGatewayReturn: async (
    gateway: "stripe" | "paypal" | "truelayer" | "worldpay" | "klarna",
    returnParams?: Record<string, string>
  ): Promise<{
    success?: boolean;
    status?: boolean;
    message: string;
    gateway?: string;
    account_status?: string;
    account_data?: {
      account_id?: string;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
    };
    errors?: string[];
  }> => {
    try {
      // Create query parameters
      const queryParams = new URLSearchParams({
        gateway: gateway,
        ...returnParams, // Include any additional parameters from the return URL
      });

      const response = await api.get<{
        status: boolean;
        message: string;
        data?: {
          account_id?: string;
          merchant_id?: string;
          connected: boolean;
          gateway: string;
        };
        errors: string[];
      }>(
        `${API_ENDPOINTS.VENDOR.ONBOARDING.PAYMENT_RETURN
        }?${queryParams.toString()}`,
        {
          returnFullResponse: true,
        }
      );

      return response;
    } catch (error) {
      console.error(`${gateway} return handling error:`, error);
      return {
        status: false,
        message:
          error instanceof Error
            ? error.message
            : `Failed to process ${gateway} return`,
        errors: [
          error instanceof Error
            ? error.message
            : `Failed to process ${gateway} return`,
        ],
      };
    }
  },

  /**
   * Notify listeners that onboarding data changed (React Query refetch via
   * `useOnboardingData` listening for `onboarding-data-changed`).
   */
  notifyDataChanged: async (): Promise<void> => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("onboarding-data-changed"));
    }
  },

  /**
   * Persist the onboarding mode ("ai" | "manual") to the backend.
   * Sends a mode-only POST to /vendor/onboarding/store so the
   * backend can return the saved mode on subsequent GET calls —
   * enabling cross-device persistence without requiring a step payload.
   */
  saveMode: async (mode: "ai" | "manual"): Promise<ApiResponse> => {
    try {
      const response = await api.post<ApiResponse>(
        API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
        { mode },
        { returnFullResponse: true }
      );
      return response as unknown as ApiResponse;
    } catch (error) {
      console.error("Error saving onboarding mode:", error);
      return {
        status: false,
        message:
          error instanceof Error ? error.message : "Failed to save mode",
        data: null as unknown as import("./type").OnboardingApiResponse,
      };
    }
  },
};
