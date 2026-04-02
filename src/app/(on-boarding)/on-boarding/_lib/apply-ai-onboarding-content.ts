import type { UseFormReturn } from "react-hook-form";
import type {
  AIGeneratedContent,
  AIOnboardingInput,
} from "@/app/api/ai/generate-onboarding/route";
import type { OnboardingFormData } from "../_components/form-provider/schema";
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

export const AI_ONBOARDING_APPLY_STEPS = [
  { label: "Venue info", icon: "🏛️" },
  { label: "Landing page", icon: "🎨" },
  { label: "Event details", icon: "📅" },
  { label: "Packages & gallery", icon: "📦" },
  { label: "Dates, tickets & tables", icon: "🎟️" },
  { label: "Catering & menu", icon: "🍽️" },
  { label: "Drink packages", icon: "🥂" },
  { label: "Location & pricing", icon: "📍" },
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
    about_link_title: editedContent.stepTwo.about_link_title,
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
    event_schedular_title: editedContent.stepThree.event_schedular_title,
    event_schedular: editedContent.stepThree.event_schedular,
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
    gallery: galleryFiles,
  };

  globalForm.setValue("stepFour", stepFourData);
  const step4Response = await onboardingService.storeStepFourData(stepFourData);
  if (step4Response.status) {
    await updateSession({ on_boarding_step: 5 });
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
  const step5Response = await onboardingService.storeStepFiveData(stepFiveData);
  if (step5Response.status) {
    await updateSession({ on_boarding_step: 6 });
  }

  // --- Step 6: Menu ---
  setStep(5);
  const hasMenus = (editedContent.stepSix.menus?.length ?? 0) > 0;
  const menuRemoved = removedSections.has("menu");
  const stepSixData = {
    step: 6 as const,
    event_id: eventId,
    catering_option: (hasMenus ? 1 : 0) as 0 | 1,
    menu_title: hasMenus ? editedContent.stepSix.menu_title : "",
    menu_description: hasMenus ? editedContent.stepSix.menu_description : "",
    event_menu_category_id: 1,
    menus: hasMenus ? editedContent.stepSix.menus : [],
  };
  globalForm.setValue("stepSix", stepSixData);
  if (!menuRemoved && hasMenus) {
    const step6Response = await onboardingService.storeStepSixData(stepSixData);
    if (step6Response.status) {
      await updateSession({ on_boarding_step: 7 });
    }
  } else {
    await updateSession({ on_boarding_step: 7 });
  }

  // --- Step 7: Drinks ---
  setStep(6);
  const hasDrinkPackages =
    (editedContent.stepSeven.packages?.length ?? 0) > 0;
  const drinksRemoved = removedSections.has("drinks");
  const stepSevenData = {
    step: 7 as const,
    event_id: eventId,
    drink_title: editedContent.stepSeven.drink_title ?? "",
    drink_description: editedContent.stepSeven.drink_description ?? "",
    packages: editedContent.stepSeven.packages ?? [],
  };
  globalForm.setValue("stepSeven", stepSevenData);
  if (!drinksRemoved && hasDrinkPackages) {
    const step7Response =
      await onboardingService.storeStepSevenData(stepSevenData);
    if (step7Response.status) {
      await updateSession({ on_boarding_step: 8 });
    }
  } else {
    await updateSession({ on_boarding_step: 8 });
  }

  // --- Step 8: Location & Pricing ---
  setStep(7);
  const stepEightData = {
    step: 8,
    event_id: eventId,
    event_address: editedContent.stepEight.event_address,
    price_start_from: editedContent.stepEight.price_start_from,
    price_start_from_button_text:
      editedContent.stepEight.price_start_from_button_text || "Book Now",
    location: editedContent.stepEight.location,
    brochure_pdf: null,
    brochure_pdf_2: null,
    faq_pdf: null,
    downloads: [],
    more_info: [],
  };

  globalForm.setValue("stepEight", stepEightData);

  const step8FormData = new FormData();
  step8FormData.append("step", "8");
  step8FormData.append("event_id", eventId.toString());
  step8FormData.append(
    "event_address",
    editedContent.stepEight.event_address,
  );
  step8FormData.append(
    "price_start_from",
    editedContent.stepEight.price_start_from,
  );
  step8FormData.append(
    "price_start_from_button_text",
    editedContent.stepEight.price_start_from_button_text || "Book Now",
  );

  const step8Response =
    await onboardingService.storeStepEightData(step8FormData);
  if (step8Response.status) {
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
