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
import { withSuppressedSuccessToasts } from "@/services/core/api-client";
import { ensureEventMenuCategoriesForRoom } from "@/lib/event-menu-categories";
import {
  AI_ONBOARDING_MAX_ROOMS,
  coerceAiStepFiveRooms,
  ensureOnboardingDates,
  fillOnboardingContentDefaults,
  formatAIDateForStepFive,
  normalizeAiRoomNames,
  parseVendorDescriptionHints,
} from "./ai-onboarding-sanitize";
import {
  EVENT_GALLERY_MAX_IMAGES,
  resolveEventSchedulerItems,
} from "@/lib/event-form-limits";

/** Remove stale vendor rooms so AI apply always starts from the names the user entered. */
async function resetVendorRoomsBeforeAiApply(): Promise<void> {
  const listed = await roomService.listVendorRooms();
  const existing = listed?.data ?? [];
  await Promise.allSettled(
    existing
      .map((room) => Number(room.id))
      .filter((id) => Number.isFinite(id) && id > 0)
      .map((id) => roomService.remove(id)),
  );
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

/** Truncated / compact AI JSON often omits later steps — apply must not throw. */
function normalizeAIGeneratedContent(
  c: Partial<AIGeneratedContent> | AIGeneratedContent,
): AIGeneratedContent {
  return {
    stepTwo: {
      banner_heading: "",
      banner_sub_heading: "",
      about_title: "",
      about_description: "",
      ...c.stepTwo,
    },
    stepThree: {
      event_name: "",
      event_banner_heading: "",
      event_banner_sub_heading: "",
      about_event_heading: "",
      about_event_sub_heading: "",
      about_event_description: "",
      ...c.stepThree,
    },
    stepFour: {
      package_title: "",
      package_description: "",
      package_button_name: "",
      event_schedular_title: "",
      ...c.stepFour,
      package_details: Array.isArray(c.stepFour?.package_details)
        ? c.stepFour.package_details
        : [],
      event_schedular: Array.isArray(c.stepFour?.event_schedular)
        ? c.stepFour.event_schedular
        : [],
    },
    stepFive: {
      dates: Array.isArray(c.stepFive?.dates) ? c.stepFive.dates : [],
      rooms: Array.isArray(c.stepFive?.rooms) ? c.stepFive.rooms : undefined,
    },
    stepSix: {
      menu_title: "",
      menu_description: "",
      ...c.stepSix,
      menus: Array.isArray(c.stepSix?.menus) ? c.stepSix.menus : [],
    },
    stepSeven: {
      drink_title: "",
      drink_description: "",
      ...c.stepSeven,
      packages: Array.isArray(c.stepSeven?.packages) ? c.stepSeven.packages : [],
    },
    stepEight: {
      event_address: "",
      price_start_from: "",
      price_start_from_button_text: "Book Now",
      ...c.stepEight,
      location: c.stepEight?.location ?? { title: "", description: "" },
    },
    stepNine: {
      faqs: Array.isArray(c.stepNine?.faqs) ? c.stepNine.faqs : [],
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
export async function applyAIGeneratedOnboardingContent(
  params: ApplyAIOnboardingParams,
): Promise<void> {
  // Progress checklist is the UX; hide per-step API success toasts.
  return withSuppressedSuccessToasts(() =>
    applyAIGeneratedOnboardingContentInner(params),
  );
}

async function applyAIGeneratedOnboardingContentInner({
  content,
  venueInput,
  removedSections = new Set<string>(),
  globalForm,
  setActiveStep,
  updateSession,
  onApplyStepChange,
}: ApplyAIOnboardingParams): Promise<void> {
  const editedContent = clampAiStepNineFaqs(
    fillOnboardingContentDefaults(normalizeAIGeneratedContent(content), {
      ...venueInput,
      bookingFacts: parseVendorDescriptionHints(
        venueInput.description,
        venueInput.room_names,
      ).bookingFacts,
    }),
  );

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
    rooms?: Array<{
      room_name?: string;
      drink_title?: string;
      drink_description?: string;
      packages?: Array<{
        title: string;
        description: string;
        price: number;
        available_quantity: number;
      }>;
    }>;
  };
  const stepSevenRaw = (editedContent.stepSeven ?? {}) as unknown as Record<
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
  if (!step2Response.status) {
    throw new Error(step2Response.message || "Failed to save landing page");
  }
  await updateSession({ on_boarding_step: 3 });

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
  if (!step3Response.status || !eventId) {
    throw new Error(step3Response.message || "Failed to save event details");
  }
  await updateSession({ on_boarding_step: 4 });

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
    event_schedular: resolveEventSchedulerItems(
      editedContent.stepFour.event_schedular,
    ),
    gallery: galleryFiles.slice(0, EVENT_GALLERY_MAX_IMAGES),
  };

  const normalizedRoomNames = normalizeAiRoomNames(venueInput.room_names);
  const useRoomSystem =
    venueInput.has_room_system === true && normalizedRoomNames.length >= 2;
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
    await resetVendorRoomsBeforeAiApply();

    const createdRooms: Array<{ id: number; name: string }> = [];
    for (const name of normalizedRoomNames) {
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
        event_schedular: resolveEventSchedulerItems(
          editedContent.stepFour.event_schedular,
        ),
        gallery: galleryFiles.slice(0, EVENT_GALLERY_MAX_IMAGES),
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
  const bookingFacts = parseVendorDescriptionHints(
    venueInput.description,
    venueInput.room_names,
  ).bookingFacts;
  const ensuredDates = ensureOnboardingDates(
    editedContent.stepFive?.dates,
    bookingFacts,
  );
  const rawAiDates = ensuredDates;
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
  const formattedDates = aiDates.map((d) =>
    formatAIDateForStepFive(d),
  );

  const stepFiveData: StepFiveType = {
    step: 5,
    event_id: eventId,
    dates: formattedDates as StepFiveType["dates"],
  };

  globalForm.setValue("stepFive", stepFiveData);
  const roomStepFiveByName = useRoomSystem
    ? new Map(
        coerceAiStepFiveRooms(editedContent.stepFive?.rooms).map((room) => [
          room.room_name.trim().toLowerCase(),
          ensureOnboardingDates(room.dates, bookingFacts).map((d) =>
            formatAIDateForStepFive(d),
          ) as StepFiveType["dates"],
        ]),
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
  if (!step5Response.status) {
    throw new Error(step5Response.message || "Failed to save dates, tickets and tables");
  }
  await updateSession({ on_boarding_step: 6 });

  // --- Step 6: Menu ---
  setStep(5);
  const hasMenus = (editedContent.stepSix?.menus?.length ?? 0) > 0;
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
    if (!step6Response.status) {
      throw new Error(step6Response.message || "Failed to save catering & menu");
    }
    await updateSession({ on_boarding_step: 7 });
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
        isApprovedBrochure: true,
        brochure: {
          ...(room as { brochure?: Record<string, unknown> }).brochure,
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
    : await onboardingService.storeStepSevenData({
        ...stepSevenData,
        isApproved: true,
      });
  if (!step7Response.status) {
    throw new Error(
      step7Response.message || "Failed to save brochure, location & pricing",
    );
  }
  if (useRoomSystem) {
    globalForm.setValue("multiSpace.rooms", step7RoomsPayload as never);
  }
  globalForm.setValue("stepSeven", { ...stepSevenData, isApproved: true });
  await updateSession({ on_boarding_step: 8 });

  // --- Step 8: Drinks ---
  setStep(7);
  const drinkPackages = Array.isArray(drinksSource.packages)
    ? drinksSource.packages
    : [];
  const resolvedDrinkPackages =
    drinkPackages.length > 0
      ? drinkPackages
      : [
          {
            title: "House pours",
            description: "Selected beers, wines and soft drinks",
            price: 25,
            available_quantity: 80,
          },
          {
            title: "Welcome drink",
            description: "A drink on arrival for each guest",
            price: 8,
            available_quantity: 100,
          },
        ];
  const hasDrinkPackages = resolvedDrinkPackages.length > 0;
  const drinksRemoved = removedSections.has("drinks");
  const stepEightData = {
    step: 8 as const,
    event_id: eventId,
    drink_title: drinksSource.drink_title ?? "",
    drink_description: drinksSource.drink_description ?? "",
    packages: resolvedDrinkPackages,
  };
  globalForm.setValue("stepEight", stepEightData);
  if (!drinksRemoved && hasDrinkPackages) {
    const roomDrinksByName = useRoomSystem
      ? new Map(
          (drinksSource.rooms ?? []).map((room) => [
            String(room.room_name ?? "").trim().toLowerCase(),
            {
              drink_title: room.drink_title ?? stepEightData.drink_title,
              drink_description:
                room.drink_description ?? stepEightData.drink_description,
              packages:
                Array.isArray(room.packages) && room.packages.length > 0
                  ? room.packages
                  : stepEightData.packages,
            },
          ]),
        )
      : new Map<
          string,
          {
            drink_title: string;
            drink_description: string;
            packages: typeof stepEightData.packages;
          }
        >();

    const step8RoomsPayload = useRoomSystem
      ? ((globalForm.getValues("multiSpace")?.rooms ?? []).map((room) => ({
          ...room,
          drinks: {
            ...(roomDrinksByName.get(
              String((room as { name?: string }).name ?? "")
                .trim()
                .toLowerCase(),
            ) ?? {
              drink_title: stepEightData.drink_title,
              drink_description: stepEightData.drink_description,
              packages: stepEightData.packages,
            }),
          },
        })) as any)
      : [];
    const hasValidRoomIdsForStep8 =
      useRoomSystem &&
      Array.isArray(step8RoomsPayload) &&
      step8RoomsPayload.some(
        (room) =>
          Number.isFinite(Number((room as { id?: number }).id)) &&
          Number((room as { id?: number }).id) > 0,
      );
    if (useRoomSystem) {
      globalForm.setValue("multiSpace.rooms", step8RoomsPayload as any);
    }
    const step8Response = hasValidRoomIdsForStep8
      ? await onboardingService.storeStepEightRoomsData({
          event_id: eventId,
          rooms: step8RoomsPayload,
          isApproved: true,
        })
      : await onboardingService.storeStepEightData(stepEightData);
    if (!step8Response.status) {
      throw new Error(step8Response.message || "Failed to save drink packages");
    }
    await updateSession({ on_boarding_step: 9 });
  } else {
    await updateSession({ on_boarding_step: 9 });
  }

  // --- Step 9: FAQs ---
  setStep(8);
  const stepNineData = {
    step: 9,
    event_id: eventId,
    faqs: (editedContent.stepNine?.faqs ?? []).slice(0, STEP_NINE_MAX_FAQS),
  };

  globalForm.setValue("stepNine", stepNineData);
  const step9Response = await onboardingService.storeStepNineData(stepNineData);
  if (!step9Response.status) {
    throw new Error(step9Response.message || "Failed to save FAQs");
  }
  await updateSession({ on_boarding_step: 10 });

  setStep(9);
  // Sync furthest progress to session, then open Site (step 2) for immediate preview
  await setActiveStep(10);
  await setActiveStep(2, { skipSessionSync: true });
  globalForm.setValue("activeStep", 2);
}
