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
import {
  ensureEventMenuCategoriesForRoom,
  isValidMenuCategoryId,
  toPositiveId,
} from "@/lib/event-menu-categories";
import { ensureFilePreview } from "@/lib/file-preview";
import { clipFooterBrandDescription } from "@/lib/footer-brand-description";
import { getSession } from "next-auth/react";
import {
  coerceAiDateList,
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

function firstPositiveEventId(...values: unknown[]): number | undefined {
  for (const value of values) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return undefined;
}

/** Remove stale vendor rooms so AI apply always starts from the names the user entered. */
function resolveVendorRoomId(
  room: { id?: unknown; room_id?: unknown } | null | undefined,
): number {
  const id = Number(room?.id ?? room?.room_id);
  return Number.isFinite(id) && id > 0 ? id : NaN;
}

async function resetVendorRoomsBeforeAiApply(): Promise<void> {
  const listed = await roomService.listVendorRooms();
  const existing = listed?.data ?? [];
  await Promise.allSettled(
    existing
      .map((room) => resolveVendorRoomId(room))
      .filter((id) => Number.isFinite(id) && id > 0)
      .map((id) => roomService.remove(id)),
  );
}

/**
 * Reuse rooms that already match the vendor's names (delete+recreate hits
 * Laravel max-room and leaves empty leftover spaces). Create only missing ones.
 */
async function syncVendorRoomsForAiApply(
  names: string[],
): Promise<Array<{ id: number; name: string }>> {
  const listed = await roomService.listVendorRooms();
  const existing = listed?.data ?? [];
  const wanted = new Set(names.map((name) => name.trim().toLowerCase()));

  await Promise.allSettled(
    existing
      .filter(
        (room) => !wanted.has(String(room.name ?? "").trim().toLowerCase()),
      )
      .map((room) => {
        const id = resolveVendorRoomId(room);
        return Number.isFinite(id) ? roomService.remove(id) : Promise.resolve();
      }),
  );

  const remaining = (await roomService.listVendorRooms())?.data ?? [];
  const byName = new Map(
    remaining.map((room) => [
      String(room.name ?? "").trim().toLowerCase(),
      room,
    ]),
  );

  const createdRooms: Array<{ id: number; name: string }> = [];
  for (const name of names) {
    const match = byName.get(name.trim().toLowerCase());
    const existingId = resolveVendorRoomId(match);
    if (Number.isFinite(existingId) && existingId > 0) {
      createdRooms.push({ id: existingId, name: match?.name || name });
      continue;
    }
    const created = await roomService.create({ name });
    const id = resolveVendorRoomId(created?.data);
    if (!created?.status || !Number.isFinite(id) || id <= 0) {
      throw new Error("Failed to create rooms for AI room system");
    }
    createdRooms.push({ id, name: created.data?.name || name });
  }
  if (createdRooms.length < 2) {
    throw new Error("AI room system requires at least 2 created rooms");
  }
  return createdRooms;
}

function minPriceStartFrom(
  dates: Array<{
    tickets?: Array<{ price?: unknown }>;
    tables?: Array<{ price?: unknown }>;
  }>,
  fallback: string,
): string {
  const prices: number[] = [];
  for (const date of dates) {
    for (const ticket of date.tickets ?? []) {
      const n = Number(String(ticket.price ?? "").replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n) && n > 0) prices.push(n);
    }
    for (const table of date.tables ?? []) {
      const n = Number(String(table.price ?? "").replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n) && n > 0) prices.push(n);
    }
  }
  if (prices.length > 0) return String(Math.min(...prices));
  const fb = Number(String(fallback).replace(/[^0-9.]/g, ""));
  return Number.isFinite(fb) && fb > 0 ? String(fb) : "50";
}

export const AI_ONBOARDING_APPLY_STEPS = [
  { label: "Venue info", icon: "🏛️" },
  { label: "Landing page", icon: "🎨" },
  { label: "Event details & location", icon: "📍" },
  { label: "Event highlights, timeline & gallery", icon: "📦" },
  { label: "Dates, tickets & tables", icon: "🎟️" },
  { label: "Catering & menu", icon: "🍽️" },
  { label: "Brochure & pricing", icon: "📄" },
  { label: "Drinks & extras", icon: "🥂" },
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
      footer_brand_description: "",
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
      dates: Array.isArray(c.stepFive?.dates)
        ? c.stepFive.dates
        : coerceAiDateList(c.stepFive?.dates),
      rooms: (() => {
        const rooms = coerceAiStepFiveRooms(c.stepFive?.rooms);
        return rooms.length > 0 ? rooms : undefined;
      })(),
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
  const vendorHints = parseVendorDescriptionHints(
    venueInput.description,
    venueInput.room_names,
  );
  const editedContent = clampAiStepNineFaqs(
    fillOnboardingContentDefaults(normalizeAIGeneratedContent(content), {
      ...venueInput,
      bookingFacts: vendorHints.bookingFacts,
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

  const formEventId = firstPositiveEventId(
    globalForm.getValues("stepThree.event_id"),
    globalForm.getValues("stepFour.event_id"),
    globalForm.getValues("stepFive.event_id"),
    globalForm.getValues("stepSix.event_id"),
    globalForm.getValues("stepSeven.event_id"),
    globalForm.getValues("stepEight.event_id"),
    globalForm.getValues("stepNine.event_id"),
  );

  const staleFaqIds = (globalForm.getValues("stepNine.faqs") ?? [])
    .map((faq) => Number((faq as { id?: number }).id))
    .filter((id) => Number.isFinite(id) && id > 0);

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
    isApproved: true,
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

  const logoFile = ensureFilePreview(
    await createPlaceholderLogo(venueInput.venueName),
  );
  const coverWithPreview = ensureFilePreview(coverFile);

  const stepTwoData = {
    step: 2 as const,
    banner_heading: editedContent.stepTwo.banner_heading,
    banner_sub_heading: editedContent.stepTwo.banner_sub_heading,
    about_title: editedContent.stepTwo.about_title,
    about_description: editedContent.stepTwo.about_description,
    footer_brand_description:
      clipFooterBrandDescription(
        editedContent.stepTwo.footer_brand_description || "",
      ),
    logo: logoFile,
    cover_image: coverWithPreview,
    isApproved: true,
  };

  globalForm.setValue("stepTwo", stepTwoData);
  const step2Response = await onboardingService.storeStepTwoData(stepTwoData);
  if (!step2Response.status) {
    throw new Error(step2Response.message || "Failed to save landing page");
  }
  const savedStepTwo = step2Response.data as
    | { logo?: unknown; cover_image?: unknown; stepTwo?: { logo?: unknown; cover_image?: unknown } }
    | undefined;
  const savedLogo =
    (typeof savedStepTwo?.logo === "string" && savedStepTwo.logo) ||
    (typeof savedStepTwo?.stepTwo?.logo === "string" &&
      savedStepTwo.stepTwo.logo) ||
    null;
  const savedCover =
    (typeof savedStepTwo?.cover_image === "string" &&
      savedStepTwo.cover_image) ||
    (typeof savedStepTwo?.stepTwo?.cover_image === "string" &&
      savedStepTwo.stepTwo.cover_image) ||
    null;
  if (savedLogo || savedCover) {
    globalForm.setValue("stepTwo", {
      ...stepTwoData,
      ...(savedLogo ? { logo: savedLogo } : {}),
      ...(savedCover ? { cover_image: savedCover } : {}),
    });
  }
  await updateSession({ on_boarding_step: 3 });

  const session = await getSession();
  const locationIdForPeek = firstPositiveEventId(
    vendorLocationId,
    session?.user?.vendor_location_id,
  );
  const persistedEventId = locationIdForPeek
    ? await onboardingService.readPersistedOnboardingEventId(locationIdForPeek)
    : undefined;
  // GET is bound to one onboarding event per location. Saving to a newly
  // created event_id returns success, then GET still echoes the old event
  // with empty room dates. Always update that persisted id when it exists.
  const existingEventId = firstPositiveEventId(
    persistedEventId,
    formEventId,
    session?.user?.event_id,
  );

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
    event_address:
      editedContent.stepThree.event_address ||
      brochureSource.event_address ||
      venueInput.address ||
      venueInput.city,
    latitude: editedContent.stepThree.latitude ?? brochureSource.latitude,
    longitude: editedContent.stepThree.longitude ?? brochureSource.longitude,
    location: {
      title: "LOCATION",
      description:
        editedContent.stepThree.event_address ||
        brochureSource.event_address ||
        venueInput.address ||
        venueInput.city,
      icon: "MapPin",
    },
    isApproved: true,
    ...(existingEventId ? { event_id: existingEventId } : {}),
  };

  globalForm.setValue("stepThree", stepThreeData);
  const step3Response =
    await onboardingService.storeStepThreeData(stepThreeData);

  const createdEventId = firstPositiveEventId(
    step3Response.data?.event_id,
    step3Response.data?.id,
  );
  const eventId = existingEventId || createdEventId || 0;
  if (!step3Response.status || !eventId) {
    throw new Error(step3Response.message || "Failed to save event details");
  }
  if (
    existingEventId &&
    createdEventId &&
    createdEventId !== existingEventId
  ) {
    await onboardingService.storeStepThreeData({
      ...stepThreeData,
      event_id: existingEventId,
    });
  }
  await updateSession({ on_boarding_step: 4, event_id: eventId });

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
    isApproved: true,
  };

  const normalizedRoomNames = normalizeAiRoomNames(venueInput.room_names);
  const useRoomSystem =
    venueInput.has_room_system === true && normalizedRoomNames.length >= 2;
  if (!useRoomSystem) {
    // Previous generates may have left is_rooms=1 with empty rooms; wipe them
    // so later steps save onto the event instead of a dead room payload.
    await resetVendorRoomsBeforeAiApply();
  }
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
    const createdRooms = await syncVendorRoomsForAiApply(normalizedRoomNames);

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
  const bookingFacts = vendorHints.bookingFacts;
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
    isApproved: true,
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
        const dates =
          Array.isArray(roomSpecificDates) && roomSpecificDates.length > 0
            ? roomSpecificDates
            : stepFiveData.dates;
        return {
          ...room,
          id: resolveVendorRoomId(room),
          isApprovedDates: true,
          dates: {
            dates,
          },
        };
      }) as any)
    : [];
  if (useRoomSystem) {
    const incomplete = step5RoomsPayload.filter((room: { id?: number; dates?: { dates?: unknown[] } }) => {
      const id = resolveVendorRoomId(room);
      const dates = Array.isArray(room.dates?.dates) ? room.dates.dates : [];
      return !Number.isFinite(id) || dates.length === 0;
    });
    if (incomplete.length > 0) {
      throw new Error("Failed to build dates for every event space");
    }
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
  const hasMenus =
    !vendorHints.omitCatering && (editedContent.stepSix?.menus?.length ?? 0) > 0;

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
      const roomId = toPositiveId((room as { id?: number }).id);
      if (roomId == null) continue;
      const categoryId = await ensureEventMenuCategoriesForRoom(
        eventId,
        roomId,
        editedContent.stepSix.menus,
      );
      const linkedId = toPositiveId(categoryId);
      if (linkedId != null) {
        menuCategoryIdByRoomId.set(roomId, linkedId);
      }
    }
  }

  // A category MUST exist before menus can be persisted. If category creation
  // failed (network/backend), do NOT save orphaned menus — degrade catering to
  // "off" so we never write the broken state the schema now rejects.
  const primaryCategoryId =
    toPositiveId(primaryMenuCategoryId) ??
    toPositiveId(menuCategoryIdByRoomId.values().next().value) ??
    0;
  const cateringPersistable = hasMenus && isValidMenuCategoryId(primaryCategoryId);
  if (hasMenus && !cateringPersistable) {
    console.warn(
      "[AI onboarding] Skipping catering: no menu category could be created for the generated menus.",
    );
  }

  const stepSixData = {
    step: 6 as const,
    event_id: eventId,
    catering_option: (cateringPersistable ? 1 : 0) as 0 | 1,
    menu_title: cateringPersistable ? editedContent.stepSix.menu_title : "",
    menu_description: cateringPersistable
      ? editedContent.stepSix.menu_description
      : "",
    event_menu_category_id: cateringPersistable ? primaryCategoryId : 0,
    menus: cateringPersistable ? editedContent.stepSix.menus : [],
    isApproved: true,
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
              toPositiveId(room.event_menu_category_id) ??
              stepSixData.event_menu_category_id,
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
  const step6RoomsPayload = useRoomSystem
    ? ((globalForm.getValues("multiSpace")?.rooms ?? []).map((room) => {
        const roomNameKey = String((room as { name?: string }).name ?? "")
          .trim()
          .toLowerCase();
        const roomSpecific = roomStepSixByName.get(roomNameKey);
        const roomId = toPositiveId((room as { id?: number }).id);
        const roomMenuCategoryId =
          roomId != null ? menuCategoryIdByRoomId.get(roomId) : undefined;
        const cateringBase = roomSpecific ?? {
          catering_option: stepSixData.catering_option,
          menu_title: stepSixData.menu_title,
          menu_description: stepSixData.menu_description,
          event_menu_category_id: stepSixData.event_menu_category_id,
          menus: stepSixData.menus,
        };
        const roomCategoryId = toPositiveId(
          roomMenuCategoryId ?? cateringBase.event_menu_category_id,
        );
        // Same rule per room: only keep catering when this room has a real
        // category. Otherwise store it as "off" so no orphaned menus are saved.
        const roomCateringPersistable =
          cateringBase.catering_option === 1 &&
          Array.isArray(cateringBase.menus) &&
          cateringBase.menus.length > 0 &&
          isValidMenuCategoryId(roomCategoryId);
        return {
          ...room,
          catering: {
            ...cateringBase,
            catering_option: (roomCateringPersistable ? 1 : 0) as 0 | 1,
            menu_title: roomCateringPersistable ? cateringBase.menu_title : "",
            menu_description: roomCateringPersistable
              ? cateringBase.menu_description
              : "",
            event_menu_category_id: roomCateringPersistable ? roomCategoryId : 0,
            menus: roomCateringPersistable ? cateringBase.menus : [],
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

  // --- Step 7: Brochure & pricing ---
  setStep(6);
  const brochurePriceStartFrom = minPriceStartFrom(
    formattedDates as Array<{
      tickets?: Array<{ price?: unknown }>;
      tables?: Array<{ price?: unknown }>;
    }>,
    brochureSource.price_start_from ?? "",
  );
  const stepSevenData = {
    step: 7,
    event_id: eventId,
    price_start_from: brochurePriceStartFrom,
    brochure_pdf: null,
    brochure_pdf_2: null,
    faq_pdf: null,
    downloads: [],
    more_info: [],
    isApproved: true,
  };
  globalForm.setValue("stepSeven", stepSevenData);

  const step7RoomsPayload = useRoomSystem
    ? ((globalForm.getValues("multiSpace")?.rooms ?? []).map((room) => ({
        ...room,
        isApprovedBrochure: true,
        brochure: {
          ...(room as { brochure?: Record<string, unknown> }).brochure,
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
        rooms: step7RoomsPayload,
        isApproved: true,
      })
    : await onboardingService.storeStepSevenData({
        ...stepSevenData,
        isApproved: true,
      });
  if (!step7Response.status) {
    throw new Error(
      step7Response.message || "Failed to save brochure & pricing",
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
      : vendorHints.omitDrinks
        ? []
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
  const stepEightData = {
    step: 8 as const,
    event_id: eventId,
    drink_title: drinksSource.drink_title ?? "",
    drink_description: drinksSource.drink_description ?? "",
    packages: resolvedDrinkPackages,
    isApproved: true,
  };
  globalForm.setValue("stepEight", stepEightData);
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
        (room) => Number.isFinite(resolveVendorRoomId(room)),
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

  // --- Step 9: FAQs ---
  setStep(8);
  const stepNineData = {
    step: 9,
    event_id: eventId,
    faqs: (editedContent.stepNine?.faqs ?? []).slice(0, STEP_NINE_MAX_FAQS),
    isApproved: true,
    ...(staleFaqIds.length > 0 ? { deleted_faq_ids: staleFaqIds } : {}),
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
