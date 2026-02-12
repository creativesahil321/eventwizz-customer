import { api } from "@/services/core/api-client";
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
// import { OnBoardingPreviewType } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";

export const onboardingService = {
  /**
   * Check if response indicates onboarding is already completed
   * If so, update session and redirect to welcome page
   */
  checkOnboardingCompleted: async (response: ApiResponse): Promise<boolean> => {
    if (
      !response.status &&
      response.message === "OnBoarding is already completed."
    ) {
      // Update session to mark as onboarded
      await authService.updateSession({
        isOnboarded: true,
      });

      // Redirect to welcome page
      if (typeof window !== "undefined") {
        window.location.href = "/welcome/select-location?onboarded=true";
      }

      return true;
    }
    return false;
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
    // Use city from form data if available, otherwise extract from address
    let city = data.city || "";

    // If city is still empty, try to extract it from address
    if (!city && data.address) {
      // Try to extract city from the address
      const addressParts = data.address.split(",").map((part) => part.trim());
      // Usually the city is the second-to-last or last part, depending on format
      // We'll take the second-to-last part if there are at least 2 parts
      if (addressParts.length >= 2) {
        city = addressParts[addressParts.length - 2];
      }
    }

    const payload = {
      step: data.step,
      name: data.name,
      contact_number: data.contact_number,
      email: data.email,
      address: data.address,
      city: city, // Add city to payload
    };

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      payload,
      {
        returnFullResponse: true,
      }
    );

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

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
    formData.append("about_link_title", data.about_link_title);

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

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

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
    formData.append("event_schedular_title", data.event_schedular_title);

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

    // Add banner image - handle both File and Blob
    if (data.event_banner_image) {
      if (
        data.event_banner_image instanceof File ||
        data.event_banner_image instanceof Blob
      ) {
        formData.append("event_banner_image", data.event_banner_image);
      }
    }

    // Add event scheduler data
    if (data.event_schedular && data.event_schedular.length > 0) {
      // The API expects event_schedular[time] and event_schedular[title] format
      data.event_schedular.forEach((schedule, index) => {
        formData.append(`event_schedular[${index}][time]`, schedule.time);
        formData.append(`event_schedular[${index}][title]`, schedule.title);
      });
    }

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
    formData.append("package_title", data.package_title);
    formData.append("package_description", data.package_description);
    formData.append("package_button_name", data.package_button_name);

    // Add package image if it exists - handle both File and Blob
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
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

    // Notify that data has changed if successful
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
    // Format dates to match API expectations
    const formattedDates = data.dates?.map(
      (date: StepFiveType["dates"][number]) => {
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
          booking_type: date.booking_type, // Include booking_type for each date
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

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      payload,
      {
        returnFullResponse: true,
      }
    );

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

    // Session update will be handled by the component

    // Notify that data has changed if successful
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

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

    // Notify that data has changed if successful
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
    const payload = {
      step: data.step || 7,
      event_id: data.event_id,
      drink_title: data.drink_title,
      drink_description: data.drink_description,
      packages: data.packages,
    };

    const response = await api.post<ApiResponse>(
      API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      payload,
      {
        returnFullResponse: true,
      }
    );

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

    // Notify that data has changed if successful
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
      if (data.latitude !== undefined) {
        formData.append("lat", data.latitude.toString());
      }

      if (data.longitude !== undefined) {
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

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

    // Notify that data has changed if successful
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

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

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

    // Add basic fields only
    formData.append("step", data.step.toString());
    formData.append("event_id", data.event_id.toString());

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  /**
   * Store step 11 onboarding data (Reminder Emails & Submit Type)
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
    formData.append("domain", data.domain);
    formData.append("confirm_domain", data.confirm_domain ? "true" : "false");

    // // Add category_id with a default value if not provided
    // formData.append("category_id", (data.category_id || 1).toString());

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

    const response = await request<ApiResponse>({
      method: "POST",
      url: API_ENDPOINTS.VENDOR.ONBOARDING.STEPS,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      returnFullResponse: true,
    });

    // Check if onboarding is already completed
    const isCompleted = await onboardingService.checkOnboardingCompleted(
      response
    );
    if (isCompleted) {
      return response;
    }

    // Notify that data has changed if successful
    if (response.status) {
      await onboardingService.notifyDataChanged();
    }

    return response;
  },

  getAllSteps: async (
    headers: Record<string, string>
  ): Promise<ApiResponse> => {
    const locationId = headers["X-Venue-Location-Id"];
    const endpoint = API_ENDPOINTS.VENDOR.ONBOARDING.GET_ALL_STEPS.replace(
      "{location_id}",
      locationId
    );

    return request<ApiResponse>({
      url: endpoint,
      method: "GET",
      returnFullResponse: true,
      headers,
    });
  },

  // Function to notify subscribers that data has changed
  notifyDataChanged: async (): Promise<void> => {
    // This is a placeholder function that will be used by the React Query integration
    // The actual implementation will be handled by the useOnboardingData hook

    // Dispatch a custom event that can be listened to by components
    if (typeof window !== "undefined") {
      const event = new CustomEvent("onboarding-data-changed");
      window.dispatchEvent(event);
    }
  },

  /**
   * Connect payment gateway (Stripe Connect, PayPal Commerce, TrueLayer, etc.)
   * @param paymentGateway Payment gateway name: "truelayer" | "stripe" | "paypal" | "worldpay" | "klarna"
   * @returns Standardized API response with onboarding_url/auth_url and account_id
   */
  connectPaymentGateway: async (
    paymentGateway: "truelayer" | "stripe" | "paypal" | "worldpay" | "klarna"
  ): Promise<{
    status: boolean;
    message: string;
    data?: {
      onboarding_url?: string; // For Stripe/PayPal
      auth_url?: string; // For TrueLayer
      account_id?: string; // For Stripe/PayPal
      gateway: string;
      connection_status?: string;
      return_url?: string;
      refresh_url?: string;
    };
    errors: string[];
  }> => {
    try {
      const payload = {
        payment_gateway: paymentGateway,
      };

      const response = await api.post<{
        status: boolean;
        message: string;
        data?: {
          onboarding_url?: string;
          auth_url?: string;
          account_id?: string;
          gateway: string;
          connection_status?: string;
          return_url?: string;
          refresh_url?: string;
        };
        errors: string[];
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
        `${
          API_ENDPOINTS.VENDOR.ONBOARDING.PAYMENT_RETURN
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
};
