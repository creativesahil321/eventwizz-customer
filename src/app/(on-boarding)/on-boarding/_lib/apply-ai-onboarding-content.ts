import type { UseFormReturn } from "react-hook-form";
import type {
  AIGeneratedContent,
  AIOnboardingInput,
} from "@/app/api/ai/generate-onboarding/route";
import type { OnboardingFormData, StepSixType } from "../_components/form-provider/schema";
import type { StepFiveType } from "../_components/form-provider/schema";
import { STEP_NINE_MAX_FAQS } from "../_components/form-provider/schema";
import {
  getDummyImages,
  getImagesByCategoryId,
  urlToImageFile,
  createPlaceholderLogo,
  createPlaceholderEventBanner,
  createPlaceholderPackageImage,
  fetchGalleryFiles,
} from "./constants/dummy-images";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { roomService } from "@/services/vendor/onboarding/room.service";
import { eventsService } from "@/services/vendor/events/events.service";
import type { EventMenuCategory } from "@/services/vendor/events/type";

function extractMenuCategoriesList(response: unknown): EventMenuCategory[] {
  if (!response || typeof response !== "object") return [];
  if ("data" in response && Array.isArray((response as { data: unknown }).data)) {
    return (response as { data: EventMenuCategory[] }).data;
  }
  if (Array.isArray(response)) return response as EventMenuCategory[];
  return [];
}

function extractCreatedMenuCategory(response: unknown): EventMenuCategory | null {
  if (!response || typeof response !== "object") return null;
  if (
    "status" in response &&
    (response as { status?: boolean }).status &&
    "data" in response
  ) {
    const data = (response as { data: EventMenuCategory }).data;
    if (data?.id && data?.name) return data;
  }
  if ("id" in response && "name" in response) {
    return {
      id: (response as { id: number }).id,
      name: (response as { name: string }).name,
    };
  }
  return null;
}

/**
 * Manual step 6 creates categories first via POST /vendor/event-menus/store, then saves menus.
 * With multi-room, pass room_id so categories are scoped per room (not duplicated per step 6 save).
 */
async function ensureEventMenuCategoriesForRoom(
  eventId: number,
  roomId: number | undefined,
  menus: StepSixType["menus"] | undefined,
): Promise<number | undefined> {
  const uniqueNames = [
    ...new Set(
      (menus ?? [])
        .map((menu) => String(menu?.name ?? "").trim())
        .filter((name) => name.length > 0),
    ),
  ];
  if (uniqueNames.length === 0) return undefined;

  const scopedRoomId =
    roomId != null && roomId > 0 ? roomId : undefined;

  let existing: EventMenuCategory[] = [];
  try {
    const response = await eventsService.getEventMenuCategories(
      scopedRoomId != null ? { room_id: scopedRoomId } : undefined,
    );
    existing = extractMenuCategoriesList(response);
  } catch (error) {
    console.warn("Failed to load menu categories before AI step 6:", error);
  }

  const byNameLower = new Map(
    existing.map((category) => [
      category.name.trim().toLowerCase(),
      category,
    ]),
  );

  for (const name of uniqueNames) {
    const key = name.toLowerCase();
    if (byNameLower.has(key)) continue;
    try {
      const response = await eventsService.createEventMenuCategory({
        vendor_event_id: eventId,
        name,
        ...(scopedRoomId != null ? { room_id: scopedRoomId } : {}),
      });
      const created = extractCreatedMenuCategory(response);
      if (created) byNameLower.set(key, created);
    } catch (error) {
      console.warn(`Failed to create menu category "${name}":`, error);
    }
  }

  const firstMenuKey = uniqueNames[0]?.toLowerCase();
  return firstMenuKey ? byNameLower.get(firstMenuKey)?.id : undefined;
}

export const AI_ONBOARDING_APPLY_STEPS = [
  { label: "Venue info", icon: "🏛️" },
  { label: "Landing page", icon: "🎨" },
  { label: "Event details", icon: "📅" },
  { label: "Packages, timeline & gallery", icon: "📦" },
  { label: "Dates, tickets & tables", icon: "🎟️" },
  { label: "Catering & menu", icon: "🍽️" },
  { label: "Brochure, location & pricing", icon: "📍" },
  { label: "Drink packages", icon: "🥂" },
  { label: "FAQs", icon: "❓" },
] as const;

function clampAiStepNineFaqs(c: AIGeneratedContent): AIGeneratedContent {
  const faqs = (c.stepNine?.faqs ?? []).slice(0, STEP_NINE_MAX_FAQS);
  return {
    ...c,
    stepNine: {
      ...c.stepNine,
      faqs,
    },
  };
}

export interface ApplyAIOnboardingParams {
  content: AIGeneratedContent;
  venueInput: AIOnboardingInput;
  /** Sections user removed in review UI; omit or empty = apply all */
  removedSections?: Set<string>;
  globalForm: UseFormReturn<OnboardingFormData>;
  setActiveStep: (
    step: number,
    options?: { skipSessionSync?: boolean },
  ) => Promise<void>;
  updateSession: (data: Record<string, unknown>) => Promise<unknown>;
  onApplyStepChange?: (stepIndex: number) => void;
}

/**
 * Persists AI-generated onboarding content through the same step APIs as manual flow.
 * Used after generation (auto-apply) or from review if reintroduced.
 */
export async function applyAIGeneratedOnboardingContent({
  content,
  venueInput,
  removedSections = new Set<string>(),
  globalForm,
  setActiveStep,
  updateSession,
  onApplyStepChange,
}: ApplyAIOnboardingParams): Promise<void> {
  const editedContent = clampAiStepNineFaqs(content);

  /**
   * Backward compatibility:
   * AI responses may still arrive in the legacy shape where:
   * - stepSeven = drinks
   * - stepEight = brochure/location/pricing
   * New onboarding expects the opposite.
   */
  type BrochureStepLike = {
    event_address?: string;
    price_start_from?: string;
    location?: { title?: string; description?: string };
    latitude?: number;
    longitude?: number;
    lat?: number;
    long?: number;
  };
  type DrinkStepLike = {
    drink_title?: string;
    drink_description?: string;
    packages?: Array<{
      title: string;
      description: string;
      price: number;
      available_quantity: number;
    }>;
  };
  const stepSevenRaw = editedContent.stepSeven as unknown as Record<
    string,
    unknown
  >;
  const stepSevenLooksLikeBrochure =
    typeof stepSevenRaw.event_address === "string" ||
    typeof stepSevenRaw.price_start_from === "string";

  const brochureSource: BrochureStepLike = stepSevenLooksLikeBrochure
    ? (editedContent.stepSeven as unknown as BrochureStepLike)
    : (editedContent.stepEight as unknown as BrochureStepLike);

  const drinksSource: DrinkStepLike = stepSevenLooksLikeBrochure
    ? (editedContent.stepEight as unknown as DrinkStepLike)
    : (editedContent.stepSeven as unknown as DrinkStepLike);

  const images =
    venueInput.event_category_id && venueInput.event_category_id > 0
      ? getImagesByCategoryId(venueInput.event_category_id)
      : getDummyImages(venueInput.venueType);

  const setStep = (i: number) => {
    onApplyStepChange?.(i);
  };

  // --- Step 1: Basic Venue Info ---
  setStep(0);
  const stepOneData = {
    step: 1 as const,
    has_multiple_locations: venueInput.has_multiple_locations ?? false,
    name: venueInput.venueName,
    contact_number: venueInput.contactNumber,
    email: venueInput.email,
    address: venueInput.address,
    city: venueInput.city,
    domain: "",
    description: venueInput.description || "",
  };

  globalForm.setValue("stepOne", stepOneData);
  const step1Response = await onboardingService.storeStepData(stepOneData);

  if (!step1Response.status) {
    throw new Error(step1Response.message || "Failed to save venue info");
  }

  const vendorLocationId = step1Response.data?.vendor_location_id;
  if (vendorLocationId) {
    await updateSession({
      vendor_location_id: vendorLocationId,
      on_boarding_step: 2,
    });
  }

  // --- Step 2: Landing Page ---
  setStep(1);
  const coverFile =
    (await urlToImageFile(images.cover, "cover-image")) ??
    (await createPlaceholderPackageImage(venueInput.venueName));

  const logoFile = await createPlaceholderLogo(venueInput.venueName);

  const stepTwoData = {
    step: 2 as const,
    banner_heading: editedContent.stepTwo.banner_heading,
    banner_sub_heading: editedContent.stepTwo.banner_sub_heading,
    about_title: editedContent.stepTwo.about_title,
    about_description: editedContent.stepTwo.about_description,
    logo: logoFile,
    cover_image: coverFile,
  };

  globalForm.setValue("stepTwo", stepTwoData);
  const step2Response = await onboardingService.storeStepTwoData(stepTwoData);
  if (step2Response.status) {
    await updateSession({ on_boarding_step: 3 });
  }

  // --- Step 3: Event Details ---
  setStep(2);
  const bannerFile =
    (await urlToImageFile(images.banner, "event-banner")) ??
    (await createPlaceholderEventBanner(editedContent.stepThree.event_name));

  const stepThreeData = {
    step: 3 as const,
    vendor_location_id: vendorLocationId || 0,
    event_category_id: venueInput.event_category_id ?? 1,
    event_name: editedContent.stepThree.event_name,
    event_banner_image: bannerFile,
    event_banner_video: undefined as unknown as File,
    event_banner_heading: editedContent.stepThree.event_banner_heading,
    event_banner_sub_heading: editedContent.stepThree.event_banner_sub_heading,
    about_event_heading: editedContent.stepThree.about_event_heading,
    about_event_sub_heading: editedContent.stepThree.about_event_sub_heading,
    about_event_description: editedContent.stepThree.about_event_description,
  };

  globalForm.setValue("stepThree", stepThreeData);
  const step3Response =
    await onboardingService.storeStepThreeData(stepThreeData);

  const eventId =
    step3Response.data?.event_id || step3Response.data?.id || 0;
  if (step3Response.status) {
    await updateSession({ on_boarding_step: 4 });
  }

  // --- Step 4: Packages ---
  setStep(3);
  const packageFile =
    (await urlToImageFile(images.package, "package-image")) ??
    (await createPlaceholderPackageImage(editedContent.stepFour.package_title));

  let galleryFiles: File[] = [];
  try {
    galleryFiles = await fetchGalleryFiles(images.gallery);
  } catch {
    console.warn("Failed to fetch gallery images, skipping");
  }

  const stepFourData = {
    step: 4 as const,
    event_id: eventId,
    package_image: packageFile,
    package_title: editedContent.stepFour.package_title,
    package_description: editedContent.stepFour.package_description,
    package_button_name: editedContent.stepFour.package_button_name,
    package_details: editedContent.stepFour.package_details,
    event_schedular_title: editedContent.stepFour.event_schedular_title || "",
    event_schedule_subtitle:
      editedContent.stepFour.event_schedule_subtitle ||
      editedContent.stepFour.event_schedular_custom_copy ||
      "",
    event_schedular: editedContent.stepFour.event_schedular || [],
    gallery: galleryFiles,
  };

  const useRoomSystem = venueInput.has_room_system === true;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(
      "onboarding_is_rooms",
      useRoomSystem ? "true" : "false",
    );
  }
  let roomPayloadsForSubmit: Array<{
    id: number;
    name: string;
    package: {
      package_image: File | null;
      package_title: string;
      package_description: string;
      package_button_name: string;
      package_details: Array<{ title: string }>;
      event_schedular_title: string;
      event_schedule_subtitle: string;
      event_schedular: Array<{ title: string; time: string }>;
      gallery: File[];
    };
  }> = [];
  if (useRoomSystem) {
    const inputNames = (venueInput.room_names ?? [])
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
      .slice(0, 3);
    // Defensive fallback: AI room creation must always create at least 2 rooms.
    const roomNames =
      inputNames.length >= 2
        ? inputNames
        : inputNames.length === 1
          ? [inputNames[0], "Room 2"]
          : ["Room 1", "Room 2"];

    const createdRooms: Array<{ id: number; name: string }> = [];
    for (const name of roomNames) {
      const created = await roomService.create({ name });
      if (!created?.status || !created.data?.id) {
        throw new Error("Failed to create rooms for AI room system");
      }
      createdRooms.push({ id: created.data.id, name: created.data.name || name });
    }
    if (createdRooms.length < 2) {
      throw new Error("AI room system requires at least 2 created rooms");
    }

    roomPayloadsForSubmit = createdRooms.map((r) => ({
      id: r.id,
      name: r.name,
      package: {
        package_image: packageFile,
        package_title: editedContent.stepFour.package_title,
        package_description: editedContent.stepFour.package_description,
        package_button_name: editedContent.stepFour.package_button_name,
        package_details: editedContent.stepFour.package_details,
        event_schedular_title: editedContent.stepFour.event_schedular_title || "",
        event_schedule_subtitle:
          editedContent.stepFour.event_schedule_subtitle ||
          editedContent.stepFour.event_schedular_custom_copy ||
          "",
        event_schedular: editedContent.stepFour.event_schedular || [],
        gallery: galleryFiles,
      },
    }));

    globalForm.setValue("multiSpace", {
      enabled: true,
      currentRoomIndex: 0,
      rooms: roomPayloadsForSubmit as any,
    });
  }

  globalForm.setValue("stepFour", stepFourData);
  const step4Response = useRoomSystem
    ? await onboardingService.storeStepFourRoomsData({
        event_id: eventId,
        isApproved: true,
        currentRoomIndex: 0,
        rooms: roomPayloadsForSubmit as any,
      })
    : await onboardingService.storeStepFourData(stepFourData);
  if (step4Response.status) {
    await updateSession({ on_boarding_step: 5 });
  } else {
    throw new Error(step4Response.message || "Failed to save step 4");
  }

  // --- Step 5: Dates, Tickets & Tables ---
  setStep(4);
  const rawAiDates = editedContent.stepFive?.dates || [];
  const aiDates = (() => {
    const sorted = [...rawAiDates].sort(
      (a, b) =>
        new Date(a.event_date + "T00:00:00").getTime() -
        new Date(b.event_date + "T00:00:00").getTime(),
    );
    const seen = new Set<string>();
    return sorted.filter((d) => {
      if (!d.event_date || seen.has(d.event_date)) return false;
      seen.add(d.event_date);
      return true;
    });
  })();
  const formattedDates = aiDates.map((d) => {
    const bookingType = d.booking_type || "tickets";
    const tickets = (bookingType !== "tables" ? d.tickets || [] : []).map(
      (t) => ({
        title: t.title,
        description: t.description,
        total_capacity: t.total_capacity,
        price: t.price,
      }),
    );
    const tables = (bookingType !== "tickets" ? d.tables || [] : []).map(
      (t) => ({
        min_persons: t.min_persons,
        max_persons: t.max_persons,
        price: t.price,
        total_tables: t.total_tables,
      }),
    );

    const base: Record<string, unknown> = {
      event_date: d.event_date,
      booking_type: bookingType as "tickets" | "tables" | "both",
      total_ticket_types: tickets.length,
      total_table_types: tables.length,
      tickets,
      tables,
    };
    if (bookingType !== "tickets") {
      base.payment_type = (d.payment_type || "full") as "full" | "deposit";
      base.is_deposit_enabled = d.is_deposit_enabled ?? false;
      base.deposit_type = d.deposit_type ?? "amount";
      base.deposit_value = d.deposit_value ?? "";
      base.deposit_due_date = d.deposit_due_date ?? "";
    }
    return base;
  });

  const stepFiveData: StepFiveType = {
    step: 5,
    event_id: eventId,
    dates:
      formattedDates.length > 0
        ? (formattedDates as StepFiveType["dates"])
        : [
            {
              event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
              booking_type: "tickets",
              total_ticket_types: 1,
              total_table_types: 0,
              tickets: [
                {
                  title: "General Admission",
                  description: "Standard entry ticket",
                  total_capacity: "100",
                  price: "50",
                },
              ],
              tables: [],
            },
          ],
  };

  globalForm.setValue("stepFive", stepFiveData);
  const roomStepFiveByName = useRoomSystem
    ? new Map(
        (editedContent.stepFive as { rooms?: Array<{ room_name?: string; dates?: StepFiveType["dates"] }> } | undefined)
          ?.rooms?.map((room) => [
            (room.room_name ?? "").trim().toLowerCase(),
            room.dates ?? [],
          ]) ?? [],
      )
    : new Map<string, StepFiveType["dates"]>();
  const step5RoomsPayload = useRoomSystem
    ? ((globalForm.getValues("multiSpace")?.rooms ?? []).map((room) => {
        const roomNameKey = String((room as { name?: string }).name ?? "")
          .trim()
          .toLowerCase();
        const roomSpecificDates = roomStepFiveByName.get(roomNameKey);
        return {
          ...room,
          dates: {
            dates:
              Array.isArray(roomSpecificDates) && roomSpecificDates.length > 0
                ? roomSpecificDates
                : stepFiveData.dates,
          },
        };
      }) as any)
    : [];
  if (useRoomSystem) {
    globalForm.setValue("multiSpace.rooms", step5RoomsPayload as any);
  }
  const step5Response = useRoomSystem
    ? await onboardingService.storeStepFiveRoomsData({
        event_id: eventId,
        rooms: step5RoomsPayload,
        isApproved: true,
      })
    : await onboardingService.storeStepFiveData(stepFiveData);
  if (step5Response.status) {
    await updateSession({ on_boarding_step: 6 });
  }

  // --- Step 6: Menu ---
  setStep(5);
  const hasMenus = (editedContent.stepSix.menus?.length ?? 0) > 0;
  const menuRemoved = removedSections.has("menu");

  const roomsForMenuCategories = useRoomSystem
    ? (globalForm.getValues("multiSpace")?.rooms ?? [])
    : [];

  const primaryMenuCategoryId =
    hasMenus && eventId && !useRoomSystem
      ? await ensureEventMenuCategoriesForRoom(
          eventId,
          undefined,
          editedContent.stepSix.menus,
        )
      : undefined;

  const menuCategoryIdByRoomId = new Map<number, number>();
  if (hasMenus && eventId && useRoomSystem) {
    for (const room of roomsForMenuCategories) {
      const roomId = Number((room as { id?: number }).id);
      if (!Number.isFinite(roomId) || roomId <= 0) continue;
      const categoryId = await ensureEventMenuCategoriesForRoom(
        eventId,
        roomId,
        editedContent.stepSix.menus,
      );
      if (categoryId != null) {
        menuCategoryIdByRoomId.set(roomId, categoryId);
      }
    }
  }

  const stepSixData = {
    step: 6 as const,
    event_id: eventId,
    catering_option: (hasMenus ? 1 : 0) as 0 | 1,
    menu_title: hasMenus ? editedContent.stepSix.menu_title : "",
    menu_description: hasMenus ? editedContent.stepSix.menu_description : "",
    event_menu_category_id:
      primaryMenuCategoryId ??
      menuCategoryIdByRoomId.values().next().value ??
      0,
    menus: hasMenus ? editedContent.stepSix.menus : [],
  };
  globalForm.setValue("stepSix", stepSixData);
  const roomStepSixByName = useRoomSystem
    ? new Map(
        (
          editedContent.stepSix as {
            rooms?: Array<{
              room_name?: string;
              catering_option?: 0 | 1;
              menu_title?: string;
              menu_description?: string;
              event_menu_category_id?: number;
              menus?: StepSixType["menus"];
            }>;
          }
        )?.rooms?.map((room) => [
          (room.room_name ?? "").trim().toLowerCase(),
          {
            catering_option:
              typeof room.catering_option === "number"
                ? room.catering_option
                : stepSixData.catering_option,
            menu_title: room.menu_title ?? stepSixData.menu_title,
            menu_description:
              room.menu_description ?? stepSixData.menu_description,
            event_menu_category_id:
              typeof room.event_menu_category_id === "number"
                ? room.event_menu_category_id
                : stepSixData.event_menu_category_id,
            menus: Array.isArray(room.menus) ? room.menus : stepSixData.menus,
          },
        ]) ?? [],
      )
    : new Map<
        string,
        {
          catering_option: 0 | 1;
          menu_title: string;
          menu_description: string;
          event_menu_category_id: number;
          menus: StepSixType["menus"];
        }
      >();
  if (!menuRemoved && hasMenus) {
    const step6RoomsPayload = useRoomSystem
      ? ((globalForm.getValues("multiSpace")?.rooms ?? []).map((room) => {
          const roomNameKey = String((room as { name?: string }).name ?? "")
            .trim()
            .toLowerCase();
          const roomSpecific = roomStepSixByName.get(roomNameKey);
          const roomId = Number((room as { id?: number }).id);
          const roomMenuCategoryId =
            Number.isFinite(roomId) && roomId > 0
              ? menuCategoryIdByRoomId.get(roomId)
              : undefined;
          const cateringBase = roomSpecific ?? {
            catering_option: stepSixData.catering_option,
            menu_title: stepSixData.menu_title,
            menu_description: stepSixData.menu_description,
            event_menu_category_id: stepSixData.event_menu_category_id,
            menus: stepSixData.menus,
          };
          return {
            ...room,
            catering: {
              ...cateringBase,
              event_menu_category_id:
                roomMenuCategoryId ?? cateringBase.event_menu_category_id,
            },
          };
        }) as any)
      : [];
    if (useRoomSystem) {
      globalForm.setValue("multiSpace.rooms", step6RoomsPayload as any);
    }
    const step6Response = useRoomSystem
      ? await onboardingService.storeStepSixRoomsData({
          event_id: eventId,
          rooms: step6RoomsPayload,
          isApproved: true,
        })
      : await onboardingService.storeStepSixData(stepSixData);
    if (step6Response.status) {
      await updateSession({ on_boarding_step: 7 });
    }
  } else {
    await updateSession({ on_boarding_step: 7 });
  }

  // --- Step 7: Brochure, location & pricing ---
  setStep(6);
  const brochureEventAddress = brochureSource.event_address ?? venueInput.address;
  const brochurePriceStartFrom = brochureSource.price_start_from ?? "";
  const brochureLatitude =
    typeof brochureSource.latitude === "number"
      ? brochureSource.latitude
      : typeof brochureSource.lat === "number"
        ? brochureSource.lat
        : undefined;
  const brochureLongitude =
    typeof brochureSource.longitude === "number"
      ? brochureSource.longitude
      : typeof brochureSource.long === "number"
        ? brochureSource.long
        : undefined;
  const stepSevenData = {
    step: 7,
    event_id: eventId,
    event_address: brochureEventAddress,
    latitude: brochureLatitude,
    longitude: brochureLongitude,
    price_start_from: brochurePriceStartFrom,
    location: brochureSource.location ?? {
      title: "LOCATION",
      description: brochureEventAddress,
    },
    brochure_pdf: null,
    brochure_pdf_2: null,
    faq_pdf: null,
    downloads: [],
    more_info: [],
  };
  globalForm.setValue("stepSeven", stepSevenData);

  const step7RoomsPayload = useRoomSystem
    ? ((globalForm.getValues("multiSpace")?.rooms ?? []).map((room) => ({
        ...room,
        brochure: {
          ...(room as any).brochure,
          event_address: stepSevenData.event_address,
          latitude: stepSevenData.latitude,
          longitude: stepSevenData.longitude,
          price_start_from: stepSevenData.price_start_from,
          brochure_pdf: null,
          brochure_pdf_2: null,
          faq_pdf: null,
        },
      })) as any)
    : [];
  const step7Response = useRoomSystem
    ? await onboardingService.storeStepSevenRoomsData({
        event_id: eventId,
        event_address: stepSevenData.event_address,
        latitude: stepSevenData.latitude,
        longitude: stepSevenData.longitude,
        rooms: step7RoomsPayload,
        isApproved: true,
      })
    : await onboardingService.storeStepSevenData(stepSevenData);
  if (step7Response.status) {
    await updateSession({ on_boarding_step: 8 });
  }

  // --- Step 8: Drinks ---
  setStep(7);
  const drinkPackages = Array.isArray(drinksSource.packages)
    ? drinksSource.packages
    : [];
  const hasDrinkPackages = drinkPackages.length > 0;
  const drinksRemoved = removedSections.has("drinks");
  const stepEightData = {
    step: 8 as const,
    event_id: eventId,
    drink_title: drinksSource.drink_title ?? "",
    drink_description: drinksSource.drink_description ?? "",
    packages: drinkPackages,
  };
  globalForm.setValue("stepEight", stepEightData);
  if (!drinksRemoved && hasDrinkPackages) {
    const step8Response =
      await onboardingService.storeStepEightData(stepEightData);
    if (step8Response.status) {
      await updateSession({ on_boarding_step: 9 });
    }
  } else {
    await updateSession({ on_boarding_step: 9 });
  }

  // --- Step 9: FAQs ---
  setStep(8);
  const stepNineData = {
    step: 9,
    event_id: eventId,
    faqs: editedContent.stepNine.faqs.slice(0, STEP_NINE_MAX_FAQS),
  };

  globalForm.setValue("stepNine", stepNineData);
  const step9Response = await onboardingService.storeStepNineData(stepNineData);
  if (step9Response.status) {
    await updateSession({ on_boarding_step: 10 });
  }

  setStep(9);
  // Sync furthest progress to session, then open Site (step 2) for immediate preview
  await setActiveStep(10);
  await setActiveStep(2, { skipSessionSync: true });
  globalForm.setValue("activeStep", 2);
}
