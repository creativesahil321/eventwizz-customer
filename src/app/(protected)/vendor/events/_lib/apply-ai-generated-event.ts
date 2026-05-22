import type {
  AIEventGeneratedContent,
  AIEventInput,
} from "@/app/api/ai/generate-event/route";
import { api } from "@/services/core/api-client";
import type { ApiResponse } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { eventsService } from "@/services/vendor/events/events.service";
import type { EventDetailData } from "@/services/vendor/events/type";
import type { StepOneType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import {
  getDummyImages,
  getImagesByCategoryId,
  urlToImageFile,
  fetchGalleryFiles,
  createPlaceholderEventBanner,
  createPlaceholderPackageImage,
} from "@/app/(on-boarding)/on-boarding/_lib/constants/dummy-images";

export const AI_EVENT_APPLY_STEPS = [
  { label: "Event details & schedule", icon: "📅" },
  { label: "Packages", icon: "📦" },
  { label: "Dates, tickets & tables", icon: "🎟️" },
  { label: "Catering & menu", icon: "🍽️" },
  { label: "Brochure info", icon: "📍" },
  { label: "Other packages", icon: "🥂" },
  { label: "FAQs", icon: "❓" },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ApplyAIEventProgress = (stepIndex: number) => void;

export async function applyAIGeneratedEventToBackend(params: {
  content: AIEventGeneratedContent;
  eventInput: AIEventInput;
  categoryId: number;
  removedSections?: Set<string>;
  onProgress?: ApplyAIEventProgress;
}): Promise<number> {
  const { content: s, eventInput, categoryId, onProgress } = params;
  const removedSections = params.removedSections ?? new Set<string>();

  const eventType = eventInput.eventType || "other";
  const dummyImages =
    categoryId > 0 ? getImagesByCategoryId(categoryId) : getDummyImages(eventType);

  onProgress?.(0);

  const bannerFile =
    (await urlToImageFile(dummyImages.banner, "event-banner")) ??
    (await createPlaceholderEventBanner(s.stepOne.event_name));

  const schedulerBgUrl = (dummyImages as { scheduler_background?: string }).scheduler_background;
  const schedulerBgFile = schedulerBgUrl
    ? (await urlToImageFile(schedulerBgUrl, "event-scheduler-background")) ??
      (await createPlaceholderEventBanner(`${s.stepOne.event_name} · schedule`))
    : null;

  const stepOneData: StepOneType = {
    step: 1 as const,
    event_category_id: categoryId,
    event_name: s.stepOne.event_name,
    event_banner_heading: s.stepOne.event_banner_heading,
    event_banner_sub_heading: s.stepOne.event_banner_sub_heading,
    about_event_heading: s.stepOne.about_event_heading,
    about_event_sub_heading: s.stepOne.about_event_sub_heading,
    about_event_description: s.stepOne.about_event_description,
    event_schedular_title: s.stepOne.event_schedular_title,
    event_schedular: s.stepOne.event_schedular,
    event_banner_image: bannerFile,
    event_banner_video: null,
    event_schedular_background_image: schedulerBgFile ?? undefined,
  };

  const step1Res = await eventsService.storeStepOneData(stepOneData);
  const eventId =
    (step1Res as unknown as { data?: { id?: number; event_id?: number } })?.data?.id ||
    (step1Res as unknown as { data?: { event_id?: number } })?.data?.event_id;

  if (!eventId) throw new Error("Failed to create event — no event_id returned");

  const detailRes = await api.get<ApiResponse<EventDetailData>>(
    API_ENDPOINTS.VENDOR.EVENT.GET_EVENT.replace("{eventId}", String(eventId)),
    { returnFullResponse: true }
  );
  const vendorLocationId =
    detailRes?.data?.vendor_location_id ?? detailRes?.data?.stepOne?.vendor_location_id;
  if (!vendorLocationId || vendorLocationId < 1) {
    throw new Error(
      "Could not resolve venue location for this event. Open the event editor and ensure a venue is selected, then try again."
    );
  }

  onProgress?.(1);
  const packageImage =
    (await urlToImageFile(dummyImages.package, "package-image")) ??
    (await createPlaceholderPackageImage(
      removedSections.has("stepTwo") ? "Package" : s.stepTwo.package_title
    ));

  const galleryUrls = dummyImages.gallery ?? [];
  const galleryFiles =
    galleryUrls.length > 0
      ? await fetchGalleryFiles(galleryUrls).then((files) => files.slice(0, 8))
      : [];

  await eventsService.storeStepTwoData({
    step: 2 as const,
    event_id: eventId,
    package_title: removedSections.has("stepTwo") ? "Package" : s.stepTwo.package_title,
    package_description: removedSections.has("stepTwo") ? "Package details" : s.stepTwo.package_description,
    package_button_name: removedSections.has("stepTwo") ? "Book Now" : s.stepTwo.package_button_name,
    package_details: removedSections.has("stepTwo") ? [{ title: "VIP Access" }] : s.stepTwo.package_details,
    package_image: packageImage,
    gallery: galleryFiles,
  });
  await sleep(300);

  onProgress?.(2);
  if (!removedSections.has("stepThree")) {
    const rawDates = s.stepThree.dates || [];
    const sortedUniqueDates = (() => {
      const sorted = [...rawDates].sort(
        (a, b) =>
          new Date(a.event_date + "T00:00:00").getTime() -
          new Date(b.event_date + "T00:00:00").getTime()
      );
      const seen = new Set<string>();
      return sorted.filter((d) => {
        if (!d.event_date || seen.has(d.event_date)) return false;
        seen.add(d.event_date);
        return true;
      });
    })();
    const dates = sortedUniqueDates.map((d) => {
      const tickets =
        d.booking_type !== "tables"
          ? (d.tickets || []).map((t) => ({
              title: t.title,
              description: t.description,
              total_capacity: parseInt(t.total_capacity) || 100,
              price: parseInt(t.price) || 50,
              sold_tickets: 0,
            }))
          : [];

      const tables =
        d.booking_type !== "tickets"
          ? (d.tables || []).map((t) => ({
              min_persons: parseInt(t.min_persons) || 2,
              max_persons: parseInt(t.max_persons) || 6,
              price: parseInt(t.price) || 100,
              total_tables: parseInt(t.total_tables) || 10,
              sold_tables: 0,
            }))
          : [];

      return {
        event_date: d.event_date,
        booking_type: d.booking_type,
        tickets,
        tables,
        total_ticket_types: d.booking_type !== "tables" ? tickets.length : 0,
        total_table_types: d.booking_type !== "tickets" ? tables.length : 0,
        payment_type: (d.booking_type !== "tickets" ? d.payment_type || "full" : "full") as
          | "full"
          | "deposit",
        is_deposit_enabled: d.is_deposit_enabled || false,
        deposit_type: (d.deposit_type || "amount") as "amount" | "percentage",
        deposit_value: d.deposit_value ? Number(d.deposit_value) : 0,
        deposit_due_date: d.deposit_due_date || "",
      };
    });

    await eventsService.storeStepThreeData({
      step: 3 as const,
      event_id: eventId,
      vendor_location_id: vendorLocationId,
      dates,
    });
  }
  await sleep(300);

  onProgress?.(3);
  const hasCatering = !removedSections.has("stepFour") && s.stepFour.catering_option === 1;
  const menuBgUrl = hasCatering
    ? (dummyImages as { menu_background?: string }).menu_background
    : null;
  const menuBgFile = menuBgUrl
    ? (await urlToImageFile(menuBgUrl, "menu-background")) ??
      (await createPlaceholderPackageImage(s.stepFour.menu_title || "Menu"))
    : null;
  await eventsService.storeStepFourData({
    step: 4 as const,
    event_id: eventId,
    catering_option: removedSections.has("stepFour") ? 0 : s.stepFour.catering_option,
    menu_title: hasCatering ? s.stepFour.menu_title : undefined,
    menu_description: hasCatering ? s.stepFour.menu_description : undefined,
    menus: hasCatering ? s.stepFour.menus : undefined,
    menu_background_image: menuBgFile ?? undefined,
  });
  await sleep(300);

  const stepFiveAny = s.stepFive as Record<string, unknown>;
  const stepSixAny = s.stepSix as Record<string, unknown>;
  const legacyAiShape =
    typeof stepFiveAny.drink_title === "string" || Array.isArray(stepFiveAny.packages);

  const brochureSource = (legacyAiShape ? stepSixAny : stepFiveAny) as {
    event_address?: string;
    price_start_from?: string;
    price_start_from_button_text?: string;
  };
  const drinksSource = (legacyAiShape ? stepFiveAny : stepSixAny) as {
    drink_title?: string;
    drink_description?: string;
    packages?: Array<{
      title?: string;
      description?: string;
      price?: number;
      available_quantity?: number;
    }>;
  };

  const brochureSectionRemoved = legacyAiShape
    ? removedSections.has("stepSix")
    : removedSections.has("stepFive");
  const drinksSectionRemoved = legacyAiShape
    ? removedSections.has("stepFive")
    : removedSections.has("stepSix");

  onProgress?.(4);
  if (!brochureSectionRemoved) {
    const stepFiveFD = new FormData();
    stepFiveFD.append("step", "5");
    stepFiveFD.append("event_id", String(eventId));
    stepFiveFD.append(
      "event_address",
      String(brochureSource.event_address || eventInput.venueAddress || "")
    );
    stepFiveFD.append(
      "price_start_from",
      String(brochureSource.price_start_from || "0")
    );
    stepFiveFD.append(
      "price_start_from_button_text",
      String(brochureSource.price_start_from_button_text || "Book Now")
    );
    stepFiveFD.append("lat", "51.5074");
    stepFiveFD.append("long", "-0.1278");
    await eventsService.storeStepFiveData(stepFiveFD as unknown as never);
  }
  await sleep(300);

  onProgress?.(5);
  const mappedDrinkPackages = (drinksSource.packages ?? [])
    .filter((p) => String(p.title ?? "").trim() !== "")
    .map((p) => ({
      title: p.title || "",
      description: p.description || "",
      price: p.price ?? 0,
      available_quantity: p.available_quantity ?? 0,
    }));
  const hasUsableDrinksContent =
    !drinksSectionRemoved &&
    String(drinksSource.drink_title ?? "").trim() !== "" &&
    String(drinksSource.drink_description ?? "").trim() !== "" &&
    mappedDrinkPackages.length > 0;

  const placeholderDrinkPackages = [
    {
      title: "Standard",
      description: "Standard package",
      price: 50,
      available_quantity: 100,
    },
  ];

  await eventsService.storeStepSixData({
    step: 6 as const,
    event_id: eventId,
    drink_title: hasUsableDrinksContent ? String(drinksSource.drink_title).trim() : "Drinks",
    drink_description: hasUsableDrinksContent
      ? String(drinksSource.drink_description).trim()
      : "Drink packages",
    packages: hasUsableDrinksContent ? mappedDrinkPackages : placeholderDrinkPackages,
  } as never);
  await sleep(300);

  onProgress?.(6);
  if (!removedSections.has("stepSeven")) {
    await eventsService.storeStepSevenData({
      step: 7 as const,
      event_id: eventId,
      faqs: s.stepSeven.faqs.slice(0, STEP_NINE_MAX_FAQS),
    });
  }

  onProgress?.(AI_EVENT_APPLY_STEPS.length);
  await sleep(400);

  return eventId;
}
