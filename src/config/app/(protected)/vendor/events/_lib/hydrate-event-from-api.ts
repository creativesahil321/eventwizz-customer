import type {
  EventSchemaType,
  StepFourType,
  StepFiveType,
  StepSixType,
  StepThreeType,
} from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import type { UseFormReturn } from "react-hook-form";
import { initialData } from "@/app/(protected)/vendor/events/_components/tab-event-form/initialData";
import {
  capEventRoomList,
  EVENT_GALLERY_MAX_IMAGES,
  normalizeVendorStepTwoRooms,
  parseEventIsRoomsFlag,
} from "@/lib/event-form-limits";
import {
  findStepThreeDatesForRoom,
  normalizeVendorStepThreeDateRow,
  normalizeVendorStepThreeRooms,
  syncStepThreeRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-three-rooms";
import {
  findStepFourMenuForRoom,
  normalizeVendorStepFourRooms,
  resolveCateringOptionFlag,
  roomEntryToStepFourFields,
  syncStepFourRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-four-rooms";
import {
  findStepFiveBrochureForRoom,
  normalizeVendorStepFiveRooms,
  parseStepFiveCoordinates,
  roomEntryToStepFiveBrochureFields,
  syncStepFiveRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-five-rooms";
import {
  findStepSixDrinksForRoom,
  normalizeVendorDrinkPackages,
  normalizeVendorStepSixRooms,
  roomEntryToStepSixFields,
  syncStepSixRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-six-rooms";
import {
  normalizeGalleryEntries,
  normalizePackageDetails,
  normalizePersistedMediaUrl,
  normalizeSchedulerRows,
} from "@/app/(protected)/vendor/events/_lib/normalize-step-two-fields";

/** Positive event editor step from API fields, or 0 if unknown. */
export function coercePositiveEventStep(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(8, Math.floor(n)) : 0;
}

/**
 * Maps persisted vendor event GET JSON into the tab-event-form schema.
 * Mirrors onboarding `patchOnboardingPayloadFromApi`.
 */
export function patchEventPayloadFromApi(
  raw: Record<string, unknown>,
): EventSchemaType {
  const eventDataAny = raw as unknown as EventSchemaType;
  const rawStepOneLocation = (eventDataAny.stepOne ?? {}) as Record<
    string,
    unknown
  >;
  const rawLegacyStepFive = (eventDataAny.stepFive ?? {}) as Record<
    string,
    unknown
  >;
  const stepOneCoords = parseStepFiveCoordinates(rawStepOneLocation);
  const legacyStepFiveCoords = parseStepFiveCoordinates(rawLegacyStepFive);
  const hydratedEventAddress = String(
    rawStepOneLocation.event_address ??
      rawLegacyStepFive.event_address ??
      "",
  );

  type StepSixWithLegacy = typeof eventDataAny.stepSix & {
    latitude?: number;
    longitude?: number;
    lat?: string | number;
    long?: string | number;
    is_rooms?: boolean | number | string;
    rooms?: unknown;
  };
  const stepSixData = eventDataAny.stepSix as StepSixWithLegacy | undefined;

  const stepTwoData = eventDataAny.stepTwo || initialData.stepTwo;
  const stepOneTimelineLegacy = eventDataAny.stepOne as
    | {
        event_schedular_title?: string;
        event_schedule_subtitle?: string;
        event_schedular_background_image?: string | File | null;
        event_schedular?: Array<{ title?: string; time?: string }>;
      }
    | undefined;
  const rawGallery = stepTwoData?.gallery;
  const cappedGallery =
    Array.isArray(rawGallery) && rawGallery.length > EVENT_GALLERY_MAX_IMAGES
      ? rawGallery.slice(0, EVENT_GALLERY_MAX_IMAGES)
      : rawGallery;

  const rawStepThree = eventDataAny.stepThree;
  const mapPersistedDates = (
    dates: Array<Record<string, unknown>> | undefined,
  ): StepThreeType["dates"] =>
    (dates ?? []).map((date) =>
      normalizeVendorStepThreeDateRow(date),
    );

  const eventRoot = raw as {
    is_rooms?: boolean | number | string;
    vendor_location_id?: number;
    current_step?: number;
  };
  const rootIsRooms = parseEventIsRoomsFlag(
    eventRoot.is_rooms ??
      eventDataAny.stepTwo?.is_rooms ??
      (eventDataAny.stepOne as { is_rooms?: boolean | number | string })
        ?.is_rooms,
  );

  const stepThreeRoomsFromApi = normalizeVendorStepThreeRooms(
    rawStepThree?.rooms,
  );
  const stepThreeFlatDates = Array.isArray(rawStepThree?.dates)
    ? mapPersistedDates(rawStepThree.dates as Array<Record<string, unknown>>)
    : [];

  const cappedStepTwoRooms = capEventRoomList(
    normalizeVendorStepTwoRooms(stepTwoData?.rooms),
  );
  const activeRoomIndexRaw = Number(
    (stepTwoData as { active_room_index?: number })?.active_room_index ?? 0,
  );
  const activeRoomIndex =
    cappedStepTwoRooms.length > 0
      ? Math.min(
          Math.max(activeRoomIndexRaw, 0),
          Math.max(cappedStepTwoRooms.length - 1, 0),
        )
      : 0;
  const activeRoomId =
    Number(cappedStepTwoRooms[activeRoomIndex]?.room_id) || 0;
  const stepThreeRoomsForSync =
    stepThreeRoomsFromApi.length > 0
      ? stepThreeRoomsFromApi
      : stepThreeFlatDates.length > 0
        ? [
            {
              room_id: Number(cappedStepTwoRooms[0]?.room_id) || 0,
              dates: stepThreeFlatDates,
            },
          ].filter((entry) => entry.room_id > 0)
        : [];

  const syncedStepThreeRooms = syncStepThreeRoomsFromStepTwo(
    cappedStepTwoRooms,
    stepThreeRoomsForSync,
  );

  const apiHadStepThreeDates =
    stepThreeRoomsFromApi.some((room) => room.dates.length > 0) ||
    stepThreeFlatDates.length > 0;
  const syncedRoomsLostDates =
    apiHadStepThreeDates &&
    syncedStepThreeRooms.every((room) => room.dates.length === 0);

  // Last-resort: keep API dates visible even if room remapping failed.
  const recoveredStepThreeRooms = (() => {
    if (!syncedRoomsLostDates) return syncedStepThreeRooms;

    if (stepThreeFlatDates.length > 0 && activeRoomId > 0) {
      return syncedStepThreeRooms.map((room, index) =>
        index === 0 || room.room_id === activeRoomId
          ? { ...room, dates: stepThreeFlatDates }
          : room,
      );
    }

    if (stepThreeRoomsFromApi.length > 0) {
      return syncStepThreeRoomsFromStepTwo(
        cappedStepTwoRooms,
        stepThreeRoomsFromApi.map((room, index) => ({
          ...room,
          // Force ordinal remapping when ids cannot match stepTwo.
          room_id: Number(cappedStepTwoRooms[index]?.room_id) || room.room_id,
        })),
      );
    }

    return syncedStepThreeRooms;
  })();

  const activeRoomDates = findStepThreeDatesForRoom(
    recoveredStepThreeRooms,
    activeRoomId,
  );
  const firstRoomWithDates = recoveredStepThreeRooms.find(
    (room) => room.dates.length > 0,
  )?.dates;
  const resolvedStepThreeDates =
    rootIsRooms === 1 && activeRoomId > 0
      ? activeRoomDates.length > 0
        ? activeRoomDates
        : stepThreeFlatDates.length > 0
          ? stepThreeFlatDates
          : firstRoomWithDates && firstRoomWithDates.length > 0
            ? firstRoomWithDates
            : initialData.stepThree.dates
      : stepThreeFlatDates.length > 0
        ? stepThreeFlatDates
        : firstRoomWithDates && firstRoomWithDates.length > 0
          ? firstRoomWithDates
          : initialData.stepThree.dates;

  const normalizedStepThree = rawStepThree
    ? {
        ...rawStepThree,
        vendor_location_id:
          rawStepThree.vendor_location_id ??
          (eventDataAny as { vendor_location_id?: number }).vendor_location_id ??
          eventDataAny.stepOne?.vendor_location_id,
        is_rooms: parseEventIsRoomsFlag(rawStepThree.is_rooms ?? rootIsRooms),
        rooms: recoveredStepThreeRooms,
        dates: resolvedStepThreeDates,
      }
    : initialData.stepThree;

  const explicitCurrentStep =
    coercePositiveEventStep(eventRoot.current_step) ||
    coercePositiveEventStep(
      (eventDataAny as { currentStep?: number }).currentStep,
    );

  const mappedData: Partial<EventSchemaType> = {
    currentStep: explicitCurrentStep > 0 ? explicitCurrentStep : 1,
    stepOne: {
      ...(eventDataAny.stepOne || initialData.stepOne),
      vendor_location_id:
        eventDataAny.stepOne?.vendor_location_id ?? eventRoot.vendor_location_id,
      event_address: hydratedEventAddress,
      ...(stepOneCoords.latitude !== undefined ||
      legacyStepFiveCoords.latitude !== undefined
        ? {
            latitude:
              stepOneCoords.latitude ?? legacyStepFiveCoords.latitude,
          }
        : {}),
      ...(stepOneCoords.longitude !== undefined ||
      legacyStepFiveCoords.longitude !== undefined
        ? {
            longitude:
              stepOneCoords.longitude ?? legacyStepFiveCoords.longitude,
          }
        : {}),
      location: {
        title: "LOCATION",
        description: hydratedEventAddress,
        icon: "MapPin",
      },
      is_rooms: parseEventIsRoomsFlag(
        (eventDataAny.stepOne as { is_rooms?: boolean | number | string })
          ?.is_rooms ?? rootIsRooms,
      ),
    },
    stepTwo: (() => {
      const eventId =
        stepTwoData?.event_id ??
        (eventDataAny.stepOne as { event_id?: number })?.event_id;

      if (rootIsRooms === 0) {
        return {
          ...stepTwoData,
          step: 2 as const,
          event_id: eventId,
          is_rooms: 0 as const,
          active_room_index: 0,
          rooms: [],
          package_image:
            normalizePersistedMediaUrl(stepTwoData?.package_image) ?? null,
          package_title: String(stepTwoData?.package_title ?? ""),
          package_description: String(stepTwoData?.package_description ?? ""),
          package_details: normalizePackageDetails(stepTwoData?.package_details),
          event_schedular_title: String(stepTwoData?.event_schedular_title ?? ""),
          event_schedule_subtitle: String(
            stepTwoData?.event_schedule_subtitle ?? "",
          ),
          event_schedular_background_image:
            normalizePersistedMediaUrl(
              stepTwoData?.event_schedular_background_image,
            ) ?? null,
          event_schedular: normalizeSchedulerRows(stepTwoData?.event_schedular),
          gallery: normalizeGalleryEntries(cappedGallery),
        } as EventSchemaType["stepTwo"];
      }

      return {
        ...stepTwoData,
        event_id: eventId,
        rooms: cappedStepTwoRooms,
        is_rooms: rootIsRooms,
        gallery: cappedGallery ?? initialData.stepTwo?.gallery ?? [],
        event_schedular_title:
          stepTwoData?.event_schedular_title ||
          stepOneTimelineLegacy?.event_schedular_title ||
          "",
        event_schedule_subtitle:
          stepTwoData?.event_schedule_subtitle ||
          stepOneTimelineLegacy?.event_schedule_subtitle ||
          "",
        event_schedular_background_image:
          stepTwoData?.event_schedular_background_image ??
          stepOneTimelineLegacy?.event_schedular_background_image ??
          null,
        event_schedular:
          Array.isArray(stepTwoData?.event_schedular) &&
          stepTwoData.event_schedular.length > 0
            ? stepTwoData.event_schedular
            : Array.isArray(stepOneTimelineLegacy?.event_schedular) &&
                stepOneTimelineLegacy.event_schedular.length > 0
              ? (stepOneTimelineLegacy.event_schedular as Array<{
                  title: string;
                  time: string;
                }>)
              : initialData.stepTwo.event_schedular,
        package_details:
          Array.isArray(stepTwoData?.package_details) &&
          stepTwoData.package_details.length > 0
            ? stepTwoData.package_details
            : initialData.stepTwo.package_details,
      } as EventSchemaType["stepTwo"];
    })(),
    stepThree: (normalizedStepThree ||
      initialData.stepThree) as EventSchemaType["stepThree"],
    stepFour: (() => {
      const rawStepFour = eventDataAny.stepFour;
      if (!rawStepFour) return initialData.stepFour;

      const stepFourIsRooms = parseEventIsRoomsFlag(
        (rawStepFour as { is_rooms?: boolean | number | string }).is_rooms ??
          rootIsRooms,
      );

      if (stepFourIsRooms !== 1) {
        const raw = rawStepFour as Record<string, unknown>;
        return {
          ...initialData.stepFour,
          ...rawStepFour,
          catering_option: resolveCateringOptionFlag(raw),
          is_rooms: 0 as const,
        } as StepFourType;
      }

      const stepFourRoomsFromApi = normalizeVendorStepFourRooms(
        (rawStepFour as { rooms?: unknown }).rooms,
      );
      const syncedStepFourRooms = syncStepFourRoomsFromStepTwo(
        cappedStepTwoRooms,
        stepFourRoomsFromApi,
      );
      const activeMenuEntry = findStepFourMenuForRoom(
        syncedStepFourRooms,
        activeRoomId,
      );

      return {
        ...rawStepFour,
        step: 4 as const,
        event_id:
          (rawStepFour as StepFourType).event_id ||
          (eventDataAny.stepOne as { event_id?: number })?.event_id ||
          0,
        is_rooms: 1 as const,
        rooms: syncedStepFourRooms,
        ...roomEntryToStepFourFields(activeMenuEntry),
      } as StepFourType;
    })(),
    stepFive: (() => {
      const rawStepFive = eventDataAny.stepFive;
      if (!rawStepFive) return initialData.stepFive;

      const stepFiveIsRooms = parseEventIsRoomsFlag(
        (rawStepFive as { is_rooms?: boolean | number | string }).is_rooms ??
          rootIsRooms,
      );
      const coords = parseStepFiveCoordinates(
        rawStepFive as {
          latitude?: unknown;
          longitude?: unknown;
          lat?: unknown;
          long?: unknown;
        },
      );

      if (stepFiveIsRooms !== 1) {
        return {
          ...initialData.stepFive,
          ...rawStepFive,
          step: 5 as const,
          is_rooms: 0 as const,
          ...coords,
        } as StepFiveType;
      }

      const stepFiveRoomsFromApi = normalizeVendorStepFiveRooms(
        (rawStepFive as { rooms?: unknown }).rooms,
      );
      const syncedStepFiveRooms = syncStepFiveRoomsFromStepTwo(
        cappedStepTwoRooms,
        stepFiveRoomsFromApi,
      );
      const activeBrochureEntry = findStepFiveBrochureForRoom(
        syncedStepFiveRooms,
        activeRoomId,
      );

      return {
        ...initialData.stepFive,
        ...rawStepFive,
        step: 5 as const,
        event_id:
          (rawStepFive as StepFiveType).event_id ||
          (eventDataAny.stepOne as { event_id?: number })?.event_id ||
          0,
        is_rooms: 1 as const,
        rooms: syncedStepFiveRooms,
        event_address: String(
          (rawStepFive as { event_address?: string }).event_address ?? "",
        ),
        ...coords,
        ...roomEntryToStepFiveBrochureFields(activeBrochureEntry),
      } as StepFiveType;
    })(),
    stepSix: (() => {
      if (!stepSixData) return initialData.stepSix;

      const stepSixIsRooms = parseEventIsRoomsFlag(
        stepSixData.is_rooms ?? rootIsRooms,
      );

      if (stepSixIsRooms !== 1) {
        return {
          ...initialData.stepSix,
          ...stepSixData,
          step: 6 as const,
          event_id:
            stepSixData.event_id ||
            (eventDataAny.stepOne as { event_id?: number })?.event_id ||
            0,
          is_rooms: 0 as const,
          packages: normalizeVendorDrinkPackages(stepSixData.packages),
        } as StepSixType;
      }

      const stepSixRoomsFromApi = normalizeVendorStepSixRooms(stepSixData.rooms);
      const syncedStepSixRooms = syncStepSixRoomsFromStepTwo(
        cappedStepTwoRooms,
        stepSixRoomsFromApi,
      );
      const activeDrinksEntry = findStepSixDrinksForRoom(
        syncedStepSixRooms,
        activeRoomId,
      );

      return {
        ...initialData.stepSix,
        ...stepSixData,
        step: 6 as const,
        event_id:
          stepSixData.event_id ||
          (eventDataAny.stepOne as { event_id?: number })?.event_id ||
          0,
        is_rooms: 1 as const,
        rooms: syncedStepSixRooms,
        ...roomEntryToStepSixFields(activeDrinksEntry),
      } as StepSixType;
    })(),
    stepSeven: eventDataAny.stepSeven || initialData.stepSeven,
    stepEight: eventDataAny.stepEight || initialData.stepEight,
  };

  return { ...initialData, ...mappedData };
}

export function hasPersistedStepOneData(patched: EventSchemaType): boolean {
  return Boolean(
    String(patched.stepOne?.event_name || "").trim() ||
      Number(patched.stepOne?.event_id) > 0,
  );
}

const ROOM_AWARE_STEP_KEYS = [
  "stepOne",
  "stepTwo",
  "stepThree",
  "stepFour",
  "stepFive",
  "stepSix",
] as const satisfies ReadonlyArray<keyof EventSchemaType>;

/** Merge a fresh GET payload into the global event form (used after room-system toggle). */
export function mergeEventApiIntoGlobalForm(
  form: Pick<UseFormReturn<EventSchemaType>, "setValue">,
  raw: Record<string, unknown>,
): EventSchemaType {
  const patched = patchEventPayloadFromApi(raw);

  for (const key of ROOM_AWARE_STEP_KEYS) {
    form.setValue(key, patched[key], {
      shouldDirty: false,
      shouldTouch: false,
    });
  }

  return patched;
}
