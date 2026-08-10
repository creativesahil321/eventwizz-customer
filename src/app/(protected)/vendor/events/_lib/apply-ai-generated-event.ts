import type {
  AIEventGeneratedContent,
  AIEventInput,
} from "@/app/api/ai/generate-event/route";
import { api, withSuppressedSuccessToasts } from "@/services/core/api-client";
import type { ApiResponse } from "@/services/core/api-client";
import { buildVendorEventGetUrl } from "@/services/vendor/events/build-vendor-event-get-url";
import { eventsService } from "@/services/vendor/events/events.service";
import { roomService } from "@/services/vendor/onboarding/room.service";
import type { EventDetailData } from "@/services/vendor/events/type";
import type {
  StepOneType,
  StepTwoType,
} from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import {
  getDummyImages,
  getImagesByCategoryId,
  urlToImageFile,
  fetchGalleryFiles,
  createPlaceholderEventBanner,
  createPlaceholderPackageImage,
} from "@/app/(on-boarding)/on-boarding/_lib/constants/dummy-images";
import {
  EVENT_GALLERY_MAX_IMAGES,
  resolveEventSchedulerItems,
} from "@/lib/event-form-limits";
import { filterSchedulerRowsForApi } from "@/app/(protected)/vendor/events/_lib/normalize-step-two-fields";
import {
  cleanVendorStepThreeDatesForForm,
  formatVendorStepThreeDateForApi,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-three-rooms";
import type { VendorStepFourRoomEntry } from "@/app/(protected)/vendor/events/_lib/vendor-step-four-rooms";
import { ensureEventMenuCategoriesForRoom } from "@/lib/event-menu-categories";
import type { StepFiveSavePayload } from "@/services/vendor/events/events.service";
import { persistAiEventDraftId } from "./ai-event-draft-storage";
import type { StepThreeType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import {
  resolveRoomBrochureDescription,
  resolveRoomMenuFields,
  resolveRoomPackageFields,
  type AIEventRoomBrochure,
} from "./ai-event-vendor-intent";
import type { AIDate } from "@/app/api/ai/generate-onboarding/route";

export const AI_EVENT_APPLY_STEPS = [
  { label: "Event details and schedule", icon: "📅" },
  { label: "Packages", icon: "📦" },
  { label: "Dates, tickets and tables", icon: "🎟️" },
  { label: "Catering and menu", icon: "🍽️" },
  { label: "Brochure", icon: "📍" },
  { label: "Other packages", icon: "🥂" },
  { label: "FAQs", icon: "❓" },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ApplyAIEventProgress = (stepIndex: number) => void;

export type ApplyAIGeneratedEventResult = {
  eventId: number;
  isRooms: boolean;
};

const AI_EVENT_MIN_ROOMS = 2;
const AI_EVENT_MAX_ROOMS = 3;

type AiStepTwoPackageFields = {
  package_title: string;
  package_description: string;
  package_button_link: string;
  package_details: Array<{ title: string }>;
  package_image: File;
  gallery: File[];
  event_schedular_title: string;
  event_schedule_subtitle: string;
  event_schedular: Array<{ title: string; time: string }>;
  event_schedular_background_image?: File;
};

function buildAiStepTwoPackageFields(params: {
  content: AIEventGeneratedContent;
  removedSections: Set<string>;
  packageImage: File;
  galleryFiles: File[];
  schedulerBgFile: File | null;
}): AiStepTwoPackageFields {
  const { content: s, removedSections, packageImage, galleryFiles, schedulerBgFile } =
    params;
  const removed = removedSections.has("stepTwo");

  const schedularSource = resolveEventSchedulerItems(
    !removed &&
      Array.isArray(s.stepTwo.event_schedular) &&
      s.stepTwo.event_schedular.length > 0
      ? s.stepTwo.event_schedular
      : [{ title: "Main Event", time: "19:00" }],
  );
  const event_schedular = filterSchedulerRowsForApi(schedularSource);
  const resolvedSchedular =
    event_schedular.length > 0
      ? event_schedular
      : [{ title: "Main Event", time: "19:00" }];

  return {
    package_title: removed ? "Package" : s.stepTwo.package_title,
    package_description: removed ? "Package details" : s.stepTwo.package_description,
    package_button_link: "",
    package_details: removed ? [{ title: "VIP Access" }] : s.stepTwo.package_details,
    package_image: packageImage,
    gallery: galleryFiles,
    event_schedular_title: removed
      ? "Event Schedule"
      : s.stepTwo.event_schedular_title || "Event Schedule",
    event_schedule_subtitle: removed ? "" : s.stepTwo.event_schedule_subtitle || "",
    event_schedular: resolvedSchedular,
    event_schedular_background_image: schedulerBgFile ?? undefined,
  };
}

function normalizeAiEventRoomNames(roomNames: string[] | undefined): string[] {
  const unique = Array.from(
    new Set(
      (roomNames ?? [])
        .map((name) => String(name || "").trim())
        .filter((name) => name.length > 0),
    ),
  ).slice(0, AI_EVENT_MAX_ROOMS);

  if (unique.length >= AI_EVENT_MIN_ROOMS) return unique;
  if (unique.length === 1) return [unique[0], "Room 2"];
  return ["Room 1", "Room 2"];
}

function matchAiRoomName<T extends { room_name?: string }>(
  entries: T[] | undefined,
  name: string,
): T | undefined {
  if (!entries?.length) return undefined;
  const key = name.trim().toLowerCase();
  return entries.find(
    (entry) => String(entry.room_name ?? "").trim().toLowerCase() === key,
  );
}

function mapAiDatesToFormDates(
  rawDates: AIDate[],
  defaultRoomId?: number,
) {
  const sortedUniqueDates = (() => {
    const sorted = [...rawDates].sort(
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

  return sortedUniqueDates.map((d) => {
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
      ...(defaultRoomId ? { room_id: defaultRoomId } : {}),
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
}

export async function applyAIGeneratedEventToBackend(params: {
  content: AIEventGeneratedContent;
  eventInput: AIEventInput;
  categoryId: number;
  removedSections?: Set<string>;
  onProgress?: ApplyAIEventProgress;
  /** Fired after step 1 succeeds so UI can open the draft in manual editor if later steps fail. */
  onEventCreated?: (eventId: number) => void;
}): Promise<ApplyAIGeneratedEventResult> {
  // Progress checklist is the UX; hide per-step API success toasts.
  return withSuppressedSuccessToasts(() =>
    applyAIGeneratedEventToBackendInner(params),
  );
}

async function applyAIGeneratedEventToBackendInner(params: {
  content: AIEventGeneratedContent;
  eventInput: AIEventInput;
  categoryId: number;
  removedSections?: Set<string>;
  onProgress?: ApplyAIEventProgress;
  onEventCreated?: (eventId: number) => void;
}): Promise<ApplyAIGeneratedEventResult> {
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

  const normalizedRoomNames = normalizeAiEventRoomNames(eventInput.room_names);
  const useRoomSystem =
    eventInput.has_room_system === true &&
    normalizedRoomNames.length >= AI_EVENT_MIN_ROOMS;

  const stepOneData: StepOneType = {
    step: 1 as const,
    event_category_id: categoryId,
    is_rooms: useRoomSystem ? 1 : 0,
    event_name: s.stepOne.event_name,
    event_banner_heading: s.stepOne.event_banner_heading,
    event_banner_sub_heading: s.stepOne.event_banner_sub_heading,
    about_event_heading: s.stepOne.about_event_heading,
    about_event_sub_heading: s.stepOne.about_event_sub_heading,
    about_event_description: s.stepOne.about_event_description,
    event_banner_image: bannerFile,
    event_banner_video: null,
  };

  const step1Res = await eventsService.storeStepOneData(stepOneData);
  const eventId =
    (step1Res as unknown as { data?: { id?: number; event_id?: number } })?.data?.id ||
    (step1Res as unknown as { data?: { event_id?: number } })?.data?.event_id;

  if (!eventId) throw new Error("Failed to create event — no event_id returned");

  persistAiEventDraftId(eventId);
  params.onEventCreated?.(eventId);

  const detailRes = await api.get<ApiResponse<EventDetailData>>(
    buildVendorEventGetUrl(eventId, useRoomSystem),
    { returnFullResponse: true },
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

  let galleryFiles: File[] = [];
  try {
    const galleryUrls = dummyImages.gallery ?? [];
    if (galleryUrls.length > 0) {
      galleryFiles = (
        await fetchGalleryFiles(galleryUrls)
      ).slice(0, EVENT_GALLERY_MAX_IMAGES);
    }
  } catch {
    console.warn("Failed to fetch gallery images for AI event, skipping");
  }

  const createdRooms: Array<{ id: number; name: string }> = [];

  if (useRoomSystem) {
    const selectedIds = (eventInput.selected_room_ids ?? []).filter(
      (id) => Number.isFinite(id) && id > 0,
    );

    if (selectedIds.length >= AI_EVENT_MIN_ROOMS) {
      const listed = await roomService.listVendorRooms();
      const catalog = Array.isArray(listed?.data) ? listed.data : [];
      createdRooms.push(
        ...catalog
          .map((room) => ({
            id: Number(room.id),
            name: String(room?.name ?? "").trim(),
          }))
          .filter(
            (room) =>
              selectedIds.includes(room.id) &&
              room.name.length > 0 &&
              Number.isFinite(room.id) &&
              room.id > 0,
          )
          .slice(0, AI_EVENT_MAX_ROOMS),
      );
      if (createdRooms.length < AI_EVENT_MIN_ROOMS) {
        throw new Error(
          "Selected venue rooms could not be loaded. Refresh and try again.",
        );
      }
    } else {
      for (const name of normalizedRoomNames) {
        const created = await roomService.create({ name });
        const createdId = Number(created?.data?.id);
        if (!Number.isFinite(createdId) || createdId <= 0) {
          throw new Error(`Failed to create room "${name}" during AI setup.`);
        }
        createdRooms.push({ id: createdId, name });
      }
    }
  }

  const stepTwoPackage = buildAiStepTwoPackageFields({
    content: s,
    removedSections,
    packageImage,
    galleryFiles,
    schedulerBgFile,
  });

  const stepTwoPayload: StepTwoType = {
    step: 2,
    event_id: eventId,
    is_rooms: useRoomSystem ? 1 : 0,
    active_room_index: useRoomSystem ? 0 : undefined,
    ...stepTwoPackage,
    rooms: useRoomSystem
      ? createdRooms.map((room) => {
          const resolved = resolveRoomPackageFields(
            room.name,
            {
              package_title: stepTwoPackage.package_title,
              package_description: stepTwoPackage.package_description,
              package_details: stepTwoPackage.package_details,
              event_schedular: stepTwoPackage.event_schedular,
            },
            s.stepTwo.rooms,
          );
          return {
            room_id: room.id,
            name: room.name,
            ...stepTwoPackage,
            package_title: resolved.package_title,
            package_description: resolved.package_description,
            package_details: resolved.package_details,
            event_schedular: resolved.event_schedular,
          };
        })
      : undefined,
  };

  await eventsService.storeStepTwoData(stepTwoPayload);
  await sleep(300);

  onProgress?.(2);
  if (!removedSections.has("stepThree")) {
    const rawDates = s.stepThree.dates || [];
    const perRoomDates = s.stepThree.rooms ?? [];
    const defaultRoomId =
      useRoomSystem && createdRooms[0]?.id ? createdRooms[0].id : undefined;

    const datesForForm = cleanVendorStepThreeDatesForForm(
      mapAiDatesToFormDates(rawDates as AIDate[], defaultRoomId) as StepThreeType["dates"],
    );
    const datesForApi = datesForForm.map((date) =>
      formatVendorStepThreeDateForApi(date),
    );

    if (useRoomSystem && createdRooms.length > 0) {
      await eventsService.storeStepThreeData({
        step: 3 as const,
        event_id: eventId,
        vendor_location_id: vendorLocationId,
        is_rooms: 1,
        rooms: createdRooms.map((room) => {
          const aiRoom = matchAiRoomName(perRoomDates, room.name);
          const roomRawDates =
            aiRoom?.dates?.length ? (aiRoom.dates as AIDate[]) : (rawDates as AIDate[]);
          const roomDatesForForm = cleanVendorStepThreeDatesForForm(
            mapAiDatesToFormDates(roomRawDates, room.id) as StepThreeType["dates"],
          );
          return {
            room_id: room.id,
            dates: roomDatesForForm.map((date) =>
              formatVendorStepThreeDateForApi(date),
            ),
          };
        }),
        dates: datesForForm,
      });
    } else {
      await eventsService.storeStepThreeData({
        step: 3 as const,
        event_id: eventId,
        vendor_location_id: vendorLocationId,
        is_rooms: 0,
        dates: datesForForm,
      });
    }
  }
  await sleep(300);

  onProgress?.(3);
  const cateringOption = removedSections.has("stepFour")
    ? 0
    : s.stepFour.catering_option === 1
      ? 1
      : 0;
  const hasCatering = cateringOption === 1;
  const menus = hasCatering ? (s.stepFour.menus ?? []) : [];

  let primaryMenuCategoryId: number | undefined;
  const menuCategoryIdByRoomId = new Map<number, number>();

  if (hasCatering && eventId) {
    if (useRoomSystem && createdRooms.length > 0) {
      for (const room of createdRooms) {
        const resolved = resolveRoomMenuFields(
          room.name,
          {
            catering_option: cateringOption,
            menu_title: s.stepFour.menu_title,
            menu_description: s.stepFour.menu_description,
            menus,
          },
          s.stepFour.rooms,
        );
        const roomMenus = resolved.menus ?? menus;
        const categoryId = await ensureEventMenuCategoriesForRoom(
          eventId,
          room.id,
          roomMenus,
        );
        if (categoryId != null) {
          menuCategoryIdByRoomId.set(room.id, categoryId);
        }
      }
    } else {
      primaryMenuCategoryId = await ensureEventMenuCategoriesForRoom(
        eventId,
        undefined,
        menus,
      );
    }
  }

  const defaultMenuCategoryId =
    primaryMenuCategoryId ??
    menuCategoryIdByRoomId.values().next().value ??
    0;

  const menuBgUrl = hasCatering
    ? (dummyImages as { menu_background?: string }).menu_background
    : null;
  const menuBgFile = menuBgUrl
    ? (await urlToImageFile(menuBgUrl, "menu-background")) ??
    (await createPlaceholderPackageImage(s.stepFour.menu_title || "Menu"))
    : null;

  const buildStepFourRoomEntry = (roomId: number, roomName: string): VendorStepFourRoomEntry => {
    const resolved = resolveRoomMenuFields(
      roomName,
      {
        catering_option: cateringOption,
        menu_title: hasCatering ? s.stepFour.menu_title : "",
        menu_description: hasCatering ? s.stepFour.menu_description : "",
        menus,
      },
      s.stepFour.rooms,
    );
    const roomMenus = hasCatering ? (resolved.menus ?? menus) : [];
    const roomCatering = resolved.catering_option === 1 ? 1 : 0;
    return {
      room_id: roomId,
      catering_option: roomCatering as 0 | 1,
      menu_title: roomCatering === 1 ? resolved.menu_title : "",
      menu_description: roomCatering === 1 ? resolved.menu_description : "",
      event_menu_category_id:
        menuCategoryIdByRoomId.get(roomId) ?? defaultMenuCategoryId,
      menus: roomMenus,
      menu_background_image: menuBgFile ?? null,
    };
  };

  if (useRoomSystem && createdRooms.length > 0) {
    const roomMenus = createdRooms.map((room) =>
      buildStepFourRoomEntry(room.id, room.name),
    );
    const activeMenu = roomMenus[0];
    await eventsService.storeStepFourData({
      step: 4 as const,
      event_id: eventId,
      is_rooms: 1,
      rooms: roomMenus,
      catering_option: activeMenu.catering_option,
      menu_title: activeMenu.menu_title,
      menu_description: activeMenu.menu_description,
      event_menu_category_id: activeMenu.event_menu_category_id,
      menus: activeMenu.menus,
      menu_background_image: activeMenu.menu_background_image ?? undefined,
    });
  } else {
    await eventsService.storeStepFourData({
      step: 4 as const,
      event_id: eventId,
      is_rooms: 0,
      catering_option: cateringOption,
      menu_title: hasCatering ? s.stepFour.menu_title : undefined,
      menu_description: hasCatering ? s.stepFour.menu_description : undefined,
      event_menu_category_id: hasCatering ? defaultMenuCategoryId : undefined,
      menus: hasCatering ? menus : undefined,
      menu_background_image: menuBgFile ?? undefined,
    });
  }
  await sleep(300);

  const stepFiveAny = s.stepFive as Record<string, unknown>;
  const stepSixAny = s.stepSix as Record<string, unknown>;
  const legacyAiShape =
    typeof stepFiveAny.drink_title === "string" || Array.isArray(stepFiveAny.packages);

  const brochureSource = (legacyAiShape ? stepSixAny : stepFiveAny) as {
    event_address?: string;
    price_start_from?: string;
    rooms?: AIEventRoomBrochure[];
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
    const brochureAddress = String(
      brochureSource.event_address || eventInput.venueAddress || "",
    );
    const brochureLat =
      typeof (brochureSource as { latitude?: number }).latitude === "number"
        ? String((brochureSource as { latitude?: number }).latitude)
        : "51.5074";
    const brochureLong =
      typeof (brochureSource as { longitude?: number }).longitude === "number"
        ? String((brochureSource as { longitude?: number }).longitude)
        : "-0.1278";

    if (useRoomSystem && createdRooms.length > 0) {
      const defaultBrochureDescription = brochureAddress;
      const brochureRoomEntries = brochureSource.rooms;
      const roomPayload: StepFiveSavePayload = {
        step: 5,
        event_id: eventId,
        is_rooms: 1,
        event_address: brochureAddress,
        latitude: Number(brochureLat) || undefined,
        longitude: Number(brochureLong) || undefined,
        location: {
          title: "LOCATION",
          description: brochureAddress,
          icon: "MapPin",
        },
        more_info:
          brochureRoomEntries && brochureRoomEntries.length > 0
            ? createdRooms.map((room) => ({
                title: room.name.slice(0, 40),
                description: resolveRoomBrochureDescription(
                  room.name,
                  defaultBrochureDescription,
                  brochureRoomEntries,
                ).slice(0, 160),
                button_text: "Details",
                button_link: "",
              }))
            : undefined,
        rooms: createdRooms.map((room) => ({
          room_id: room.id,
          brochure_pdf: null,
          brochure_pdf_2: null,
        })),
      };
      await eventsService.storeStepFiveData(roomPayload);
    } else {
      const stepFiveFD = new FormData();
      stepFiveFD.append("step", "5");
      stepFiveFD.append("event_id", String(eventId));
      stepFiveFD.append("is_rooms", "0");
      stepFiveFD.append("event_address", brochureAddress);
      stepFiveFD.append("lat", brochureLat);
      stepFiveFD.append("long", brochureLong);
      await eventsService.storeStepFiveData(stepFiveFD as unknown as never);
    }
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

  const perRoomDrinks = s.stepFive.rooms ?? [];

  await eventsService.storeStepSixData(
    useRoomSystem && createdRooms.length > 0
      ? {
          step: 6 as const,
          event_id: eventId,
          is_rooms: 1,
          rooms: createdRooms.map((room) => {
            const aiDrink = matchAiRoomName(perRoomDrinks, room.name);
            const roomPackages =
              aiDrink?.packages?.length
                ? aiDrink.packages.map((p) => ({
                    title: p.title || "",
                    description: p.description || "",
                    price: p.price ?? 0,
                    available_quantity: p.available_quantity ?? 0,
                  }))
                : hasUsableDrinksContent
                  ? mappedDrinkPackages
                  : placeholderDrinkPackages;
            const roomHasDrinks =
              String(aiDrink?.drink_title ?? drinksSource.drink_title ?? "").trim() !== "" &&
              roomPackages.length > 0;
            return {
              room_id: room.id,
              drink_title: roomHasDrinks
                ? String(aiDrink?.drink_title ?? drinksSource.drink_title).trim()
                : "Drinks",
              drink_description: roomHasDrinks
                ? String(
                    aiDrink?.drink_description ?? drinksSource.drink_description,
                  ).trim()
                : "Drink packages",
              packages: roomHasDrinks ? roomPackages : placeholderDrinkPackages,
            };
          }),
          drink_title: hasUsableDrinksContent
            ? String(drinksSource.drink_title).trim()
            : "Drinks",
          drink_description: hasUsableDrinksContent
            ? String(drinksSource.drink_description).trim()
            : "Drink packages",
          packages: hasUsableDrinksContent
            ? mappedDrinkPackages
            : placeholderDrinkPackages,
        }
      : {
          step: 6 as const,
          event_id: eventId,
          is_rooms: 0,
          drink_title: hasUsableDrinksContent
            ? String(drinksSource.drink_title).trim()
            : "Drinks",
          drink_description: hasUsableDrinksContent
            ? String(drinksSource.drink_description).trim()
            : "Drink packages",
          packages: hasUsableDrinksContent
            ? mappedDrinkPackages
            : placeholderDrinkPackages,
        },
  );
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

  return { eventId, isRooms: useRoomSystem };
}
