import { defaultValues } from "./defaultValues";
import {
  coerceHasMultipleLocationsFromApi,
  MAX_ROOMS,
  normalizeStepOneFromApi,
  readHasMultipleLocationsField,
} from "./schema";

/**
 * Step 1 gate: only when the GET truly has no flag yet step 1 is already saved (bad payload).
 */
export function shouldShowStepOneLocationGate(
  hasMultipleLocations: boolean | undefined,
  stepOneIsApproved: boolean | undefined,
): boolean {
  return hasMultipleLocations === undefined && stepOneIsApproved !== true;
}

/**
 * `true` / `false` when persistence already recorded the choice; `null` when absent — show AI gate only then.
 * Same root → `stepOne` precedence as {@link patchOnboardingPayloadFromApi}.
 */
export function getHasMultipleLocationsChoiceFromPersistence(
  payload: Record<string, unknown> | null | undefined,
): boolean | null {
  if (!payload) return null;
  const fromRoot = coerceHasMultipleLocationsFromApi(
    readHasMultipleLocationsField(payload),
  );
  if (fromRoot !== undefined) return fromRoot;

  const normalized = normalizeStepOneFromApi(payload.stepOne);
  if (typeof normalized.has_multiple_locations === "boolean") {
    return normalized.has_multiple_locations;
  }

  return null;
}

/**
 * Maps persisted GET onboarding JSON into the client form shape.
 * `has_multiple_locations`: root of the same response first, else `stepOne` on that same payload
 * (already normalized). No extra sources — the persistence response is the source of truth.
 */
export function patchOnboardingPayloadFromApi(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const dataAny = { ...raw };

  const fromRoot = coerceHasMultipleLocationsFromApi(
    readHasMultipleLocationsField(dataAny),
  );

  const normalizedStepOne = normalizeStepOneFromApi(dataAny.stepOne);
  const fromStepOneBody =
    typeof normalizedStepOne.has_multiple_locations === "boolean"
      ? normalizedStepOne.has_multiple_locations
      : undefined;

  const hasMultiple =
    fromRoot !== undefined ? fromRoot : fromStepOneBody;

  const shouldMergeStepOne =
    dataAny.stepOne !== undefined ||
    fromRoot !== undefined ||
    Object.keys(normalizedStepOne).length > 0;

  if (shouldMergeStepOne) {
    dataAny.stepOne = {
      ...defaultValues.stepOne,
      ...(typeof dataAny.stepOne === "object" && dataAny.stepOne !== null
        ? (dataAny.stepOne as object)
        : {}),
      ...normalizedStepOne,
      ...(hasMultiple !== undefined
        ? { has_multiple_locations: hasMultiple }
        : {}),
    };
  }

  // Backward compatibility: older payloads persist scheduler fields under step 3.
  // New flow keeps them in step 4 (packages & timeline), so migrate when step 4 is empty.
  const stepThree = (dataAny.stepThree ?? {}) as Record<string, unknown>;
  const stepFour = (dataAny.stepFour ?? {}) as Record<string, unknown>;
  const stepFourHasTimeline =
    (typeof stepFour.event_schedular_title === "string" &&
      stepFour.event_schedular_title.trim().length > 0) ||
    (Array.isArray(stepFour.event_schedular) &&
      stepFour.event_schedular.length > 0);
  if (!stepFourHasTimeline) {
    dataAny.stepFour = {
      ...stepFour,
      event_schedular_title:
        typeof stepThree.event_schedular_title === "string"
          ? stepThree.event_schedular_title
          : "",
      event_schedule_subtitle:
        typeof stepThree.event_schedule_subtitle === "string"
          ? stepThree.event_schedule_subtitle
          : typeof stepThree.event_schedular_custom_copy === "string"
            ? stepThree.event_schedular_custom_copy
            : "",
      // Legacy compatibility
      event_schedular_custom_copy:
        typeof stepThree.event_schedular_custom_copy === "string"
          ? stepThree.event_schedular_custom_copy
          : "",
      event_schedular: Array.isArray(stepThree.event_schedular)
        ? stepThree.event_schedular
        : [],
    };
  }

  // Hydrate the multi-space block from the API response if present. The backend may emit it
  // either as a top-level `multi_space` block, a flat `multi_space_enabled` + `rooms` pair, or
  // already-normalized as `multiSpace`. We accept all three so single-room responses keep the
  // default empty container and don't break the schema.
  const hydratedMultiSpace = hydrateMultiSpaceFromApi(dataAny);
  if (hydratedMultiSpace) {
    dataAny.multiSpace = hydratedMultiSpace;

    // Mirror shared catering menus onto stepSix so Step 6 binds the same data in every room tab.
    let sharedMenus: unknown[] = [];
    let sharedCategoryId: number | undefined;
    for (const room of hydratedMultiSpace.rooms) {
      const catering = room.catering as Record<string, unknown> | undefined;
      if (!catering) continue;
      const menus = catering.menus;
      if (Array.isArray(menus) && menus.length > sharedMenus.length) {
        sharedMenus = menus;
        if (typeof catering.event_menu_category_id === "number") {
          sharedCategoryId = catering.event_menu_category_id;
        }
      }
    }
    if (sharedMenus.length > 0) {
      const existingStepSix =
        typeof dataAny.stepSix === "object" && dataAny.stepSix !== null
          ? (dataAny.stepSix as Record<string, unknown>)
          : {};
      dataAny.stepSix = {
        ...existingStepSix,
        menus: sharedMenus,
        ...(sharedCategoryId !== undefined
          ? { event_menu_category_id: sharedCategoryId }
          : {}),
      };
    }
  }

  return dataAny;
}

/** Internal: pulls `multi_space` / `rooms` out of the API payload and normalizes the shape. */
function hydrateMultiSpaceFromApi(
  payload: Record<string, unknown>,
):
  | {
    enabled: boolean;
    currentRoomIndex: number;
    rooms: Array<Record<string, unknown> & { id?: number; name: string }>;
  }
  | undefined {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;
  const parseOptionalNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };
  const normalizeOptionalFileUrl = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const direct =
    (payload.multiSpace as Record<string, unknown> | undefined) ??
    (payload.multi_space as Record<string, unknown> | undefined);

  const enabledFlag =
    direct?.enabled ??
    payload.multi_space_enabled ??
    payload.multiSpaceEnabled;

  const rootIsRooms =
    payload.is_rooms === true ||
    payload.is_rooms === 1 ||
    payload.is_rooms === "1" ||
    payload.is_rooms === "true";

  const enabled =
    enabledFlag === true ||
    enabledFlag === 1 ||
    enabledFlag === "1" ||
    enabledFlag === "true" ||
    rootIsRooms;

  const rawRooms =
    (direct?.rooms as unknown[] | undefined) ??
    (payload.rooms as unknown[] | undefined);

  // Backend persistence currently sends multi-room data as object maps on stepFour/5/6/7:
  // stepFour.rooms = { "Room A": { room_id, package_*... }, ... } etc.
  const stepFourRooms = isRecord((payload.stepFour as Record<string, unknown> | undefined)?.rooms)
    ? ((payload.stepFour as Record<string, unknown>).rooms as Record<string, unknown>)
    : undefined;
  const stepFiveRooms = isRecord((payload.stepFive as Record<string, unknown> | undefined)?.rooms)
    ? ((payload.stepFive as Record<string, unknown>).rooms as Record<string, unknown>)
    : undefined;
  const stepSixRooms = isRecord((payload.stepSix as Record<string, unknown> | undefined)?.rooms)
    ? ((payload.stepSix as Record<string, unknown>).rooms as Record<string, unknown>)
    : undefined;
  const stepSevenRooms = isRecord((payload.stepSeven as Record<string, unknown> | undefined)?.rooms)
    ? ((payload.stepSeven as Record<string, unknown>).rooms as Record<string, unknown>)
    : undefined;

  if (
    !enabled &&
    (!rawRooms || rawRooms.length === 0) &&
    !stepFourRooms &&
    !stepFiveRooms &&
    !stepSixRooms &&
    !stepSevenRooms
  ) {
    return undefined;
  }

  const roomsFromArray = (rawRooms ?? [])
    .filter(
      (r): r is Record<string, unknown> => typeof r === "object" && r !== null,
    )
    .slice(0, MAX_ROOMS)
    .map((r, i) => ({
      id: typeof r.id === "number" ? r.id : undefined,
      name:
        typeof r.name === "string" && r.name.trim()
          ? r.name.trim()
          : `Room ${i + 1}`,
      isApprovedPackage: Boolean(r.isApprovedPackage ?? r.is_approved_package),
      isApprovedDates: Boolean(r.isApprovedDates ?? r.is_approved_dates),
      isApprovedCatering: Boolean(
        r.isApprovedCatering ?? r.is_approved_catering,
      ),
      isApprovedBrochure: Boolean(
        r.isApprovedBrochure ?? r.is_approved_brochure,
      ),
      package: (r.package as Record<string, unknown>) ?? {},
      dates: (r.dates as Record<string, unknown>) ?? { dates: [] },
      catering: (r.catering as Record<string, unknown>) ?? {},
      brochure: (r.brochure as Record<string, unknown>) ?? {},
    }));

  const roomMap = new Map<string, Record<string, unknown> & { id?: number; name: string }>();
  roomsFromArray.forEach((r) => {
    roomMap.set(String(r.name), r);
  });

  const upsertRoomByName = (name: string, patch: Record<string, unknown>) => {
    const key = name.trim();
    if (!key) return;
    const existing = roomMap.get(key);
    roomMap.set(key, {
      id: existing?.id,
      name: key,
      isApprovedPackage: Boolean(existing?.isApprovedPackage),
      isApprovedDates: Boolean(existing?.isApprovedDates),
      isApprovedCatering: Boolean(existing?.isApprovedCatering),
      isApprovedBrochure: Boolean(existing?.isApprovedBrochure),
      package: (existing?.package as Record<string, unknown>) ?? {},
      dates: (existing?.dates as Record<string, unknown>) ?? { dates: [] },
      catering: (existing?.catering as Record<string, unknown>) ?? {},
      brochure: (existing?.brochure as Record<string, unknown>) ?? {},
      ...existing,
      ...patch,
    });
  };

  if (stepFourRooms) {
    Object.entries(stepFourRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        id:
          typeof roomVal.room_id === "number"
            ? roomVal.room_id
            : typeof roomVal.id === "number"
              ? roomVal.id
              : undefined,
        isApprovedPackage: Boolean(
          (payload.stepFour as Record<string, unknown> | undefined)?.isApproved,
        ),
        package: {
          package_image: roomVal.package_image ?? null,
          package_title:
            typeof roomVal.package_title === "string" ? roomVal.package_title : "",
          package_description:
            typeof roomVal.package_description === "string"
              ? roomVal.package_description
              : "",
          package_button_name:
            typeof roomVal.package_button_name === "string"
              ? roomVal.package_button_name
              : "",
          event_schedular_title:
            typeof roomVal.event_schedular_title === "string"
              ? roomVal.event_schedular_title
              : typeof (payload.stepFour as Record<string, unknown> | undefined)
                ?.event_schedular_title === "string"
                ? (payload.stepFour as Record<string, unknown>).event_schedular_title
                : "",
          event_schedule_subtitle:
            typeof roomVal.event_schedule_subtitle === "string"
              ? roomVal.event_schedule_subtitle
              : typeof roomVal.event_schedular_custom_copy === "string"
                ? roomVal.event_schedular_custom_copy
                : typeof (payload.stepFour as Record<string, unknown> | undefined)
                  ?.event_schedule_subtitle === "string"
                  ? (payload.stepFour as Record<string, unknown>)
                    .event_schedule_subtitle
                  : typeof (payload.stepFour as Record<string, unknown> | undefined)
                    ?.event_schedular_custom_copy === "string"
                    ? (payload.stepFour as Record<string, unknown>)
                      .event_schedular_custom_copy
                    : "",
          event_schedular: Array.isArray(roomVal.event_schedular)
            ? roomVal.event_schedular
            : Array.isArray(
              (payload.stepFour as Record<string, unknown> | undefined)
                ?.event_schedular,
            )
              ? ((payload.stepFour as Record<string, unknown>)
                .event_schedular as unknown[])
              : [],
          package_details: Array.isArray(roomVal.package_details)
            ? roomVal.package_details
            : [],
          gallery: Array.isArray(roomVal.gallery)
            ? roomVal.gallery
            : Array.isArray(
              (payload.stepFour as Record<string, unknown> | undefined)
                ?.gallery,
            )
              ? ((payload.stepFour as Record<string, unknown>).gallery as unknown[])
              : [],
        },
      });
    });
  }

  if (stepFiveRooms) {
    Object.entries(stepFiveRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        id:
          typeof roomVal.room_id === "number"
            ? roomVal.room_id
            : undefined,
        isApprovedDates: Boolean(
          (payload.stepFive as Record<string, unknown> | undefined)?.isApproved,
        ),
        dates: {
          dates: Array.isArray(roomVal.dates) ? roomVal.dates : [],
        },
      });
    });
  }

  if (stepSixRooms) {
    Object.entries(stepSixRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        id:
          typeof roomVal.room_id === "number"
            ? roomVal.room_id
            : undefined,
        isApprovedCatering: Boolean(
          (payload.stepSix as Record<string, unknown> | undefined)?.isApproved,
        ),
        catering: {
          catering_option:
            typeof roomVal.catering_option === "number"
              ? roomVal.catering_option
              : typeof roomVal.catering_option === "string" &&
                roomVal.catering_option.trim() !== "" &&
                !Number.isNaN(Number(roomVal.catering_option))
                ? Number(roomVal.catering_option)
                : typeof (payload.stepSix as Record<string, unknown> | undefined)
                  ?.catering_option === "number"
                  ? (payload.stepSix as Record<string, unknown>).catering_option
                  : typeof (payload.stepSix as Record<string, unknown> | undefined)
                    ?.catering_option === "string" &&
                    String(
                      (payload.stepSix as Record<string, unknown>)
                        .catering_option,
                    ).trim() !== "" &&
                    !Number.isNaN(
                      Number(
                        (payload.stepSix as Record<string, unknown>)
                          .catering_option,
                      ),
                    )
                    ? Number(
                      (payload.stepSix as Record<string, unknown>)
                        .catering_option,
                    )
                    : 0,
          menu_title:
            typeof roomVal.menu_title === "string" ? roomVal.menu_title : "",
          menu_description:
            typeof roomVal.menu_description === "string"
              ? roomVal.menu_description
              : "",
          event_menu_category_id:
            typeof roomVal.event_menu_category_id === "number"
              ? roomVal.event_menu_category_id
              : undefined,
          menus: Array.isArray(roomVal.menus) ? roomVal.menus : [],
        },
      });
    });
  }

  if (stepSevenRooms) {
    Object.entries(stepSevenRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        id:
          typeof roomVal.room_id === "number"
            ? roomVal.room_id
            : undefined,
        isApprovedBrochure: Boolean(
          (payload.stepSeven as Record<string, unknown> | undefined)?.isApproved,
        ),
        brochure: {
          brochure_pdf: normalizeOptionalFileUrl(roomVal.brochure_pdf),
          brochure_pdf_2: normalizeOptionalFileUrl(roomVal.brochure_pdf_2),
          faq_pdf: normalizeOptionalFileUrl(roomVal.faq_pdf),
          event_address:
            typeof (payload.stepSeven as Record<string, unknown> | undefined)
              ?.event_address === "string"
              ? (payload.stepSeven as Record<string, unknown>).event_address
              : "",
          latitude:
            parseOptionalNumber(
              (payload.stepSeven as Record<string, unknown> | undefined)?.lat,
            ),
          longitude:
            parseOptionalNumber(
              (payload.stepSeven as Record<string, unknown> | undefined)?.long,
            ),
          price_start_from:
            typeof roomVal.price_start_from === "string"
              ? roomVal.price_start_from
              : typeof (payload.stepSeven as Record<string, unknown> | undefined)
                ?.price_start_from === "string"
                ? (payload.stepSeven as Record<string, unknown>).price_start_from
                : "",
        },
      });
    });
  }

  let rooms = Array.from(roomMap.values()).slice(0, MAX_ROOMS);

  // Catering menus are shared across all rooms — use the fullest menus payload everywhere.
  if (stepSixRooms && rooms.length > 0) {
    let sharedMenus: unknown[] = [];
    let sharedCategoryId: number | undefined;
    for (const room of rooms) {
      const catering = room.catering as Record<string, unknown> | undefined;
      if (!catering) continue;
      const menus = catering.menus;
      if (Array.isArray(menus) && menus.length > sharedMenus.length) {
        sharedMenus = menus;
        if (typeof catering.event_menu_category_id === "number") {
          sharedCategoryId = catering.event_menu_category_id;
        }
      }
    }
    if (sharedMenus.length > 0) {
      rooms = rooms.map((room) => ({
        ...room,
        catering: {
          ...(room.catering as Record<string, unknown>),
          menus: sharedMenus,
          ...(sharedCategoryId !== undefined
            ? { event_menu_category_id: sharedCategoryId }
            : {}),
        },
      }));
    }
  }

  return {
    enabled:
      enabled ||
      Boolean(stepFourRooms || stepFiveRooms || stepSixRooms || stepSevenRooms),
    currentRoomIndex: Math.min(
      Number(direct?.currentRoomIndex ?? direct?.current_room_index ?? 0) || 0,
      Math.max(rooms.length - 1, 0),
    ),
    rooms,
  };
}
