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
  EventsQueryParams,
  EventItem,
  EventsResponse,
  EventCategory,
  EventCategoryPayload,
  EventMenuCategoryPayload,
  EventMenuCategory,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EventOverviewResponse,
} from "./type";

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
  getEvent: async (id: number): Promise<ApiResponse<EventItem>> => {
    return api.get<ApiResponse<EventItem>>(
      API_ENDPOINTS.VENDOR.EVENT.GET_EVENT.replace("{eventId}", id.toString()),
      {
        returnFullResponse: true,
      }
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
      date_filter?: string; // Date filter in YYYY-MM-DD format
    }
  ) => {
    let endpoint = API_ENDPOINTS.VENDOR.EVENT.GET_EVENT_OVERVIEW.replace(
      "{eventId}",
      eventId
    ).replace("{date_status}", params.date_status || "all");

    // Replace date_filter - use empty string if not provided (backend will ignore it)
    endpoint = endpoint.replace("{date_filter}", params.date_filter || "");

    return api.get(endpoint, {
      params: {
        date_per_page: params.date_per_page || 10,
        date_page: params.date_page || 1,
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
      API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        id.toString()
      ),
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
   * Get all event menu categories
   */
  getEventMenuCategories: async (): Promise<
    ApiResponse<EventMenuCategory[]> | EventMenuCategory[]
  > => {
    return api.get<ApiResponse<EventMenuCategory[]>>(
      API_ENDPOINTS.VENDOR.EVENT.GET_MENU_CATEGORIES,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Create a new event menu category
   */
  createEventMenuCategory: async (
    data: EventMenuCategoryPayload
  ): Promise<ApiResponse<EventMenuCategory>> => {
    return api.post<ApiResponse<EventMenuCategory>>(
      API_ENDPOINTS.VENDOR.EVENT.CREATE_MENU_CATEGORY,
      data,
      {
        returnFullResponse: true,
      }
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
    formData.append("event_schedular_title", data.event_schedular_title);

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

    if (data.event_schedular_background_image) {
      if (
        data.event_schedular_background_image instanceof File ||
        data.event_schedular_background_image instanceof Blob
      ) {
        formData.append(
          "event_schedular_background_image",
          data.event_schedular_background_image
        );
      } else {
        // If no file is provided, we need to inform the API that we're not updating this field
        formData.append("event_schedular_background_image_unchanged", "1");
      }
    } else {
      formData.append("event_schedular_background_image_unchanged", "1");
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

    // Add event scheduler data
    if (data.event_schedular && data.event_schedular.length > 0) {
      // The API expects event_schedular[time] and event_schedular[title] format
      data.event_schedular.forEach((schedule, index) => {
        formData.append(`event_schedular[${index}][time]`, schedule.time);
        formData.append(`event_schedular[${index}][title]`, schedule.title);
      });
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
    formData.append("event_schedular_title", data.event_schedular_title);

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

    if (data.event_schedular_background_image) {
      if (
        data.event_schedular_background_image instanceof File ||
        data.event_schedular_background_image instanceof Blob
      ) {
        formData.append(
          "event_schedular_background_image",
          data.event_schedular_background_image
        );
      } else {
        // If no file is provided, we need to inform the API that we're not updating this field
        formData.append("event_schedular_background_image_unchanged", "1");
      }
    } else {
      formData.append("event_schedular_background_image_unchanged", "1");
    }
    // Add event scheduler data
    if (data.event_schedular && data.event_schedular.length > 0) {
      // The API expects event_schedular[time] and event_schedular[title] format
      data.event_schedular.forEach((schedule, index) => {
        formData.append(`event_schedular[${index}][time]`, schedule.time);
        formData.append(`event_schedular[${index}][title]`, schedule.title);
      });
    }

    // Use the UPDATE endpoint instead of CREATE
    const response = await request<ApiResponse<EventItem>>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        eventId
      ),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged();
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
    formData.append("package_title", data.package_title);
    formData.append("package_description", data.package_description);
    formData.append("package_button_name", data.package_button_name);

    // Add package image if it exists - handle both File and Blob (cropped images)
    if (data.package_image) {
      if (
        data.package_image instanceof File ||
        data.package_image instanceof Blob
      ) {
        formData.append("package_image", data.package_image);
      }
    }

    // Add package details in the format package_details[0][title], package_details[1][title], etc.
    data.package_details.forEach((detail, index) => {
      formData.append(`package_details[${index}][title]`, detail.title);
    });

    // Handle gallery images - both new files and existing backend images (see docs/backend-api/GALLERY_API_FRONTEND_GUIDE.md)
    if (data.gallery && data.gallery.length > 0) {
      let fileIndex = 0;
      let existingImageIndex = 0;
      const galleryOrder: Array<{ type: "existing"; id: number } | { type: "new"; index: number }> = [];

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
          formData.append(`existing_gallery_images[${existingImageIndex}][id]`, existing.id.toString());
          formData.append(`existing_gallery_images[${existingImageIndex}][url]`, existing.url);
          galleryOrder.push({ type: "existing", id: existing.id });
          existingImageIndex++;
        }
      });

      if (galleryOrder.length > 0) {
        formData.append("gallery_order", JSON.stringify(galleryOrder));
      }
    }

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        data.event_id.toString()
      ),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 5 onboarding data (booking type and dates/pricing)
   * @param data Step 5 data to be stored
   * @returns API response with status and message
   */

  storeStepThreeData: async (data: StepThreeType): Promise<ApiResponse> => {
    // Format dates to match API expectations
    const formattedDates = data.dates?.map(
      (date: StepThreeType["dates"][number]) => {
        // Format deposit_due_date if present
        let formattedDepositDueDate = "";
        if (date.payment_type === "deposit" && date.deposit_due_date) {
          try {
            if (typeof date.deposit_due_date === "string") {
              formattedDepositDueDate = date.deposit_due_date;
            } else {
              // Handle date objects if they come from a date picker
              formattedDepositDueDate = new Date(date.deposit_due_date)
                .toISOString()
                .split("T")[0];
            }
          } catch (error) {
            console.error("Error formatting deposit due date:", error);
            formattedDepositDueDate = "";
          }
        }

        // Return formatted date object for API
        // Now using date.booking_type instead of data.booking_type
        const baseDate = {
          event_date: date.event_date,
          booking_type: date.booking_type,
          ...(date.cancelled === true && { cancelled: true }),
          total_table_types:
            date.booking_type !== "tickets" ? date.total_table_types : 0,
          tables: date.booking_type !== "tickets" ? date.tables : [],
          total_ticket_types:
            date.booking_type !== "tables" ? date.total_ticket_types : 0,
          tickets: date.booking_type !== "tables" ? date.tickets : [],
        };

        // Only include payment fields for tables/both booking types
        if (date.booking_type === "tables" || date.booking_type === "both") {
          return {
            ...baseDate,
            payment_type: date.payment_type,
            is_deposit_enabled: date.is_deposit_enabled ?? true,
            deposit_type: date.deposit_type || "amount",
            deposit_value: date.deposit_value || 0,
            deposit_due_date: formattedDepositDueDate,
          };
        }

        return baseDate;
      }
    );

    // Create payload with all required data
    const payload = {
      step: data.step, // We're sending as step
      event_id: data.event_id,
      // Remove global booking_type as it's now part of each date
      dates: formattedDates || [],
    };

    const response = await api.post<ApiResponse<EventItem>>(
      API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        data.event_id.toString()
      ),
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

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 6 onboarding data
   * @param data Step 6 data to be stored
   * @returns API response with status and message
   */
  storeStepFourData: async (data: StepFourType): Promise<ApiResponse> => {
    // Create FormData for file uploads
    const formData = new FormData(); // Add basic fields
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());
    formData.append("catering_option", data.catering_option.toString());

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

    if (data.menu_background_image instanceof File) {
      formData.append("menu_background_image", data.menu_background_image);
    } else {
      formData.append("menu_background_image_unchanged", "1");
    }

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        data.event_id.toString()
      ),
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
      await eventsService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 7 onboarding data
   * @param data Step 7 data to be stored
   * @returns API response with status and message
   */
  storeStepFiveData: async (data: StepFiveType): Promise<ApiResponse> => {
    const payload = {
      step: data.step || 7,
      event_id: data.event_id,
      drink_title: data.drink_title,
      drink_description: data.drink_description,
      packages: data.packages,
    };

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        data.event_id.toString()
      ),
      payload,
      {
        returnFullResponse: true,
      }
    );

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 8 onboarding data
   * @param data Step 8 data to be stored or FormData instance
   * @returns API response with status and message
   */
  storeStepSixData: async (
    data: StepSixType | FormData
  ): Promise<ApiResponse> => {
    let formData: FormData;

    if (!(data instanceof FormData)) {
      // Convert StepEightType to FormData
      formData = new FormData();

      // Add required fields
      formData.append("step", data.step.toString());
      formData.append("event_id", data.event_id.toString());

      // Add files if available - only if they're actually File objects
      // If they're URLs, don't send them - backend will keep existing files
      if (data.brochure_pdf instanceof File) {
        formData.append("brochure_pdf", data.brochure_pdf);
      }

      if (data.brochure_pdf_2 instanceof File) {
        formData.append("brochure_pdf_2", data.brochure_pdf_2);
      }

      if (data.faq_pdf instanceof File) {
        formData.append("faq_pdf", data.faq_pdf);
      }

      // Add removal flags for PDFs
      if (data.remove_brochure_pdf) {
        formData.append("remove_brochure_pdf", "true");
      }
      if (data.remove_brochure_pdf_2) {
        formData.append("remove_brochure_pdf_2", "true");
      }
      if (data.remove_faq_pdf) {
        formData.append("remove_faq_pdf", "true");
      }

      // Add text fields
      if (data.event_address) {
        formData.append("event_address", data.event_address);
      }

      // Add latitude and longitude coordinates
      if (data.latitude !== undefined && data.latitude !== null) {
        formData.append("lat", data.latitude.toString());
      }

      if (data.longitude !== undefined && data.longitude !== null) {
        formData.append("long", data.longitude.toString());
      }

      if (data.price_start_from) {
        formData.append("price_start_from", data.price_start_from);
      }

      if (data.price_start_from_button_text) {
        formData.append(
          "price_start_from_button_text",
          data.price_start_from_button_text
        );
      }
    } else {
      formData = data;
    }

    const eventIdStr =
      data instanceof FormData
        ? (data.get("event_id") as string) || ""
        : data.event_id.toString();

    const response = await api.post<ApiResponse<EventItem>>(
      API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace("{eventId}", eventIdStr),
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
      await eventsService.notifyDataChanged();
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
      url: API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        data.event_id.toString()
      ),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Notify that data has changed if successful
    if (response.status) {
      await eventsService.notifyDataChanged();
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

    if (data.reminder_email_before_days) {
      formData.append(
        "reminder_email_before_days",
        data.reminder_email_before_days.toString()
      );
    }

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.EVENT.UPDATE_EVENT.replace(
        "{eventId}",
        data.event_id.toString()
      ),
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    if (response.status) {
      await eventsService.notifyDataChanged();
    }

    return response;
  },

  notifyDataChanged: async (): Promise<void> => {
    console.log("Notifying event data changed");

    if (typeof window !== "undefined") {
      const event = new CustomEvent("event-data-changed");
      window.dispatchEvent(event);
    }
  },
};
