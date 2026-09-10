import { defaultValues } from "./defaultValues";
import { normalizeStepTenFromApi } from "./normalize-step-ten-gateways";
import {
  coerceHasMultipleLocationsFromApi,
  MAX_ROOMS,
  normalizeStepOneFromApi,
  readHasMultipleLocationsField,
} from "./schema";
import { toPositiveId, sortMenusForOnboardingDisplay } from "@/lib/event-menu-categories";
import { resolveDrinksOptionFlag } from "@/app/(protected)/vendor/events/_lib/vendor-step-six-rooms";

/**
 * Ask Yes/No whenever persistence has no `has_multiple_locations` yet.
 * Do not hide this behind `stepOne.isApproved` — GET can mark step 1 saved
 * without the flag, which is exactly when the vendor still needs to answer.
 */
export function shouldShowStepOneLocationGate(
  hasMultipleLocations: boolean | undefined,
): boolean {
  return hasMultipleLocations === undefined;
}

function hasNonEmptyText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function readCoordinate(
  source: Record<string, unknown>,
  primaryKey: "latitude" | "longitude",
  legacyKey: "lat" | "long",
): number | undefined {
  const value = source[primaryKey] ?? source[legacyKey];
  const coordinate =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

function hasPersistedUpload(value: unknown): boolean {
  if (typeof File !== "undefined" && value instanceof File) {
    return value.size > 0 || value.name.trim().length > 0;
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return value.size > 0;
  }
  return hasNonEmptyText(value);
}

/** Real catering copy — ignore the empty placeholder row in `defaultValues`. */
function hasPersistedCateringMenus(menus: unknown): boolean {
  if (!Array.isArray(menus)) return false;
  return menus.some((menu) => {
    if (!menu || typeof menu !== "object") return false;
    const row = menu as { name?: unknown; items?: unknown };
    if (hasNonEmptyText(row.name)) return true;
    if (!Array.isArray(row.items)) return false;
    return row.items.some((item) => {
      if (!item || typeof item !== "object") return false;
      const it = item as {
        title?: unknown;
        name?: unknown;
        description?: unknown;
      };
      return (
        hasNonEmptyText(it.title) ||
        hasNonEmptyText(it.name) ||
        hasNonEmptyText(it.description)
      );
    });
  });
}

/**
 * After AI apply (or any later-step work), flipping "multiple locations" rebuilds
 * the venue/brand model and wipes the generated draft. Lock the Yes/No *back*
 * control once anything past step 1 exists — do not rely on `stepOne.isApproved`
 * alone (GET often omits it).
 *
 * Empty default rows (one blank menu, one blank FAQ) must not lock a fresh
 * manual start — that skipped the question and made Save fail.
 */
export function isOnboardingLocationChoiceLocked(
  values: {
    last_completed_step?: number;
    stepOne?: { isApproved?: boolean };
    stepTwo?: {
      logo?: unknown;
      cover_image?: unknown;
      banner_heading?: unknown;
      about_description?: unknown;
      footer_brand_description?: unknown;
    };
    stepThree?: {
      event_name?: unknown;
      event_banner_heading?: unknown;
      about_event_heading?: unknown;
    };
    stepSix?: { menus?: unknown[] };
    stepNine?: { faqs?: Array<{ question?: unknown; answer?: unknown }> };
  } | null | undefined,
): boolean {
  if (!values) return false;
  if (values.stepOne?.isApproved === true) return true;
  const last = Number(values.last_completed_step ?? 0);
  if (Number.isFinite(last) && last >= 2) return true;

  const two = values.stepTwo;
  if (
    hasPersistedUpload(two?.logo) ||
    hasPersistedUpload(two?.cover_image) ||
    hasNonEmptyText(two?.banner_heading) ||
    hasNonEmptyText(two?.about_description) ||
    hasNonEmptyText(two?.footer_brand_description)
  ) {
    return true;
  }

  const three = values.stepThree;
  if (
    hasNonEmptyText(three?.event_name) ||
    hasNonEmptyText(three?.event_banner_heading) ||
    hasNonEmptyText(three?.about_event_heading)
  ) {
    return true;
  }

  if (hasPersistedCateringMenus(values.stepSix?.menus)) return true;

  const faqs = values.stepNine?.faqs ?? [];
  if (
    faqs.some(
      (faq) => hasNonEmptyText(faq.question) || hasNonEmptyText(faq.answer),
    )
  ) {
    return true;
  }

  return false;
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

  // Location moved from the legacy brochure step to Step 3. Prefer new Step 3
  // values, but copy Step 7 values forward so existing events remain editable.
  const persistedStepThree = (dataAny.stepThree ?? {}) as Record<
    string,
    unknown
  >;
  const legacyStepSeven = (dataAny.stepSeven ?? {}) as Record<string, unknown>;
  const eventAddress =
    hasNonEmptyText(persistedStepThree.event_address)
      ? String(persistedStepThree.event_address)
      : hasNonEmptyText(legacyStepSeven.event_address)
        ? String(legacyStepSeven.event_address)
        : "";
  const latitude =
    readCoordinate(persistedStepThree, "latitude", "lat") ??
    readCoordinate(legacyStepSeven, "latitude", "lat");
  const longitude =
    readCoordinate(persistedStepThree, "longitude", "long") ??
    readCoordinate(legacyStepSeven, "longitude", "long");
  if (
    dataAny.stepThree !== undefined ||
    eventAddress ||
    latitude !== undefined ||
    longitude !== undefined
  ) {
    dataAny.stepThree = {
      ...defaultValues.stepThree,
      ...persistedStepThree,
      about_event_image:
        persistedStepThree.about_event_image ??
        dataAny.about_event_image ??
        defaultValues.stepThree.about_event_image,
      ...(eventAddress
        ? {
            event_address: eventAddress,
            location: {
              title: "LOCATION",
              description: eventAddress,
              icon: "MapPin",
            },
          }
        : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    };
  }

  if (dataAny.stepTwo && typeof dataAny.stepTwo === "object") {
    dataAny.stepTwo = {
      ...defaultValues.stepTwo,
      ...(dataAny.stepTwo as object),
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

  // Step 10: API nests gateways under online/offline with key/secret — flatten for UI.
  if (dataAny.stepTen && typeof dataAny.stepTen === "object") {
    const normalizedStepTen = normalizeStepTenFromApi(dataAny.stepTen);
    if (normalizedStepTen) {
      dataAny.stepTen = {
        ...defaultValues.stepTen,
        ...normalizedStepTen,
      };
    }
  }

  // Step 11: subdomain label + confirmation restore from `isApproved`.
  if (dataAny.stepEleven && typeof dataAny.stepEleven === "object") {
    dataAny.stepEleven = normalizeStepElevenFromApi(
      dataAny.stepEleven as Record<string, unknown>,
    );
  }

  // Hydrate the multi-space block from the API response if present. The backend may emit it
  // either as a top-level `multi_space` block, a flat `multi_space_enabled` + `rooms` pair, or
  // already-normalized as `multiSpace`. We accept all three so single-room responses keep the
  // default empty container and don't break the schema.
  const hydratedMultiSpace = hydrateMultiSpaceFromApi(dataAny);
  if (hydratedMultiSpace) {
    dataAny.multiSpace = hydratedMultiSpace;

    // Bind stepSix to the active room's catering — menus are per-room, not shared.
    const activeIdx = Math.min(
      hydratedMultiSpace.currentRoomIndex ?? 0,
      Math.max(hydratedMultiSpace.rooms.length - 1, 0),
    );
    const activeCatering = hydratedMultiSpace.rooms[activeIdx]?.catering as
      | Record<string, unknown>
      | undefined;
    if (activeCatering) {
      const existingStepSix =
        typeof dataAny.stepSix === "object" && dataAny.stepSix !== null
          ? (dataAny.stepSix as Record<string, unknown>)
          : {};
      dataAny.stepSix = {
        ...existingStepSix,
        catering_option:
          typeof activeCatering.catering_option === "number"
            ? activeCatering.catering_option
            : existingStepSix.catering_option,
        menu_title:
          typeof activeCatering.menu_title === "string"
            ? activeCatering.menu_title
            : "",
        menu_description:
          typeof activeCatering.menu_description === "string"
            ? activeCatering.menu_description
            : "",
        menus: Array.isArray(activeCatering.menus)
          ? sortMenusForOnboardingDisplay(
              activeCatering.menus as Array<{ name?: string | null }>,
            )
          : [],
        ...(toPositiveId(activeCatering.event_menu_category_id) != null
          ? {
              event_menu_category_id: toPositiveId(
                activeCatering.event_menu_category_id,
              ),
            }
          : {}),
      };
    }

    const activeDrinks = hydratedMultiSpace.rooms[activeIdx]?.drinks as
      | Record<string, unknown>
      | undefined;
    if (activeDrinks) {
      const existingStepEight =
        typeof dataAny.stepEight === "object" && dataAny.stepEight !== null
          ? (dataAny.stepEight as Record<string, unknown>)
          : {};
      dataAny.stepEight = {
        ...existingStepEight,
        drinks_option: resolveDrinksOptionFlag(activeDrinks),
        drink_title:
          typeof activeDrinks.drink_title === "string"
            ? activeDrinks.drink_title
            : "",
        drink_description:
          typeof activeDrinks.drink_description === "string"
            ? activeDrinks.drink_description
            : "",
        packages: Array.isArray(activeDrinks.packages)
          ? activeDrinks.packages
          : [],
      };
    }
  }

  if (dataAny.stepSix && typeof dataAny.stepSix === "object") {
    const stepSix = dataAny.stepSix as Record<string, unknown>;
    const categoryId = toPositiveId(stepSix.event_menu_category_id);
    if (categoryId != null) {
      stepSix.event_menu_category_id = categoryId;
    } else {
      delete stepSix.event_menu_category_id;
    }
    if (Array.isArray(stepSix.menus)) {
      stepSix.menus = sortMenusForOnboardingDisplay(
        stepSix.menus as Array<{ name?: string | null }>,
      );
    }
  }

  if (dataAny.stepEight && typeof dataAny.stepEight === "object") {
    const stepEight = dataAny.stepEight as Record<string, unknown>;
    stepEight.drinks_option = resolveDrinksOptionFlag(stepEight);
  }

  return dataAny;
}

/** Subdomain label only: strip known host suffixes and normalize slug chars. */
function normalizeSubdomainLabelFromApi(
  raw: unknown,
  suffix?: string,
): string {
  if (typeof raw !== "string") return "";
  let label = raw.trim().toLowerCase();
  const suffixes = [
    suffix?.trim().toLowerCase(),
    "eventwizz.com",
    "eventwizz.vercel.app",
    "com",
  ].filter((s): s is string => Boolean(s));

  for (const suf of suffixes) {
    if (label.endsWith(`.${suf}`)) {
      label = label.slice(0, -(suf.length + 1));
    }
  }

  return label
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

/**
 * Maps persisted step 11 into the client form shape:
 * - `domain` → subdomain label only
 * - `domain_suffix` kept for UI (fallback eventwizz.com)
 * - `confirm_domain` restored from `isApproved` (vendor confirmation of saved domain)
 * - API `submit_type: "publish"` → client `"submit"`
 */
function normalizeStepElevenFromApi(
  stepEleven: Record<string, unknown>,
): Record<string, unknown> {
  const suffix =
    typeof stepEleven.domain_suffix === "string" &&
      stepEleven.domain_suffix.trim().length > 0
      ? stepEleven.domain_suffix.trim().toLowerCase()
      : "eventwizz.com";

  const domain = normalizeSubdomainLabelFromApi(stepEleven.domain, suffix);
  const isApproved = stepEleven.isApproved === true;

  const rawSubmit = stepEleven.submit_type;
  const submit_type =
    rawSubmit === "duplicate"
      ? "duplicate"
      : "submit"; /* publish / submit / unknown → submit */

  return {
    ...defaultValues.stepEleven,
    ...stepEleven,
    domain,
    domain_suffix: suffix,
    isApproved,
    // Same saved domain on return → checkbox stays checked via isApproved
    confirm_domain: isApproved && domain.length > 0,
    submit_type,
  };
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
  const stepEightRawRooms = (payload.stepEight as Record<string, unknown> | undefined)?.rooms;
  const stepEightRooms = isRecord(stepEightRawRooms)
    ? (stepEightRawRooms as Record<string, unknown>)
    : Array.isArray(stepEightRawRooms)
      ? Object.fromEntries(
        stepEightRawRooms
          .filter((room): room is Record<string, unknown> => isRecord(room))
          .map((room, index) => {
            const name =
              typeof room.name === "string" && room.name.trim()
                ? room.name.trim()
                : `Room ${index + 1}`;
            return [name, room];
          }),
      )
      : undefined;

  if (
    !enabled &&
    (!rawRooms || rawRooms.length === 0) &&
    !stepFourRooms &&
    !stepFiveRooms &&
    !stepSixRooms &&
    !stepSevenRooms &&
    !stepEightRooms
  ) {
    return undefined;
  }

  const roomsFromArray = (rawRooms ?? [])
    .filter(
      (r): r is Record<string, unknown> => typeof r === "object" && r !== null,
    )
    .slice(0, MAX_ROOMS)
    .map((r, i) => ({
      id: toPositiveId(r.id) ?? toPositiveId(r.room_id),
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
      isApprovedDrinks: Boolean(r.isApprovedDrinks ?? r.is_approved_drinks),
      package: (r.package as Record<string, unknown>) ?? {},
      dates: (r.dates as Record<string, unknown>) ?? { dates: [] },
      catering: (() => {
        const catering = (r.catering as Record<string, unknown>) ?? {};
        const categoryId = toPositiveId(catering.event_menu_category_id);
        return {
          ...catering,
          ...(categoryId != null
            ? { event_menu_category_id: categoryId }
            : {}),
        };
      })(),
      brochure: (r.brochure as Record<string, unknown>) ?? {},
      drinks: (r.drinks as Record<string, unknown>) ?? {},
    }));

  const roomMap = new Map<string, Record<string, unknown> & { id?: number; name: string }>();
  roomsFromArray.forEach((r) => {
    roomMap.set(String(r.name), r);
  });

  const upsertRoomByName = (name: string, patch: Record<string, unknown>) => {
    const key = name.trim();
    if (!key) return;
    const existing = roomMap.get(key);
    const merged = {
      id: existing?.id,
      name: key,
      isApprovedPackage: Boolean(existing?.isApprovedPackage),
      isApprovedDates: Boolean(existing?.isApprovedDates),
      isApprovedCatering: Boolean(existing?.isApprovedCatering),
      isApprovedBrochure: Boolean(existing?.isApprovedBrochure),
      isApprovedDrinks: Boolean(existing?.isApprovedDrinks),
      package: (existing?.package as Record<string, unknown>) ?? {},
      dates: (existing?.dates as Record<string, unknown>) ?? { dates: [] },
      catering: (existing?.catering as Record<string, unknown>) ?? {},
      brochure: (existing?.brochure as Record<string, unknown>) ?? {},
      drinks: (existing?.drinks as Record<string, unknown>) ?? {},
      ...existing,
      ...patch,
    };
    const id = toPositiveId(merged.id) ?? toPositiveId(existing?.id);
    if (id != null) merged.id = id;
    else delete merged.id;
    roomMap.set(
      key,
      merged as Record<string, unknown> & { id?: number; name: string },
    );
  };

  if (stepFourRooms) {
    Object.entries(stepFourRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        ...(toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id)
          ? {
              id:
                toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id),
            }
          : {}),
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
      const hydratedDates = Array.isArray(roomVal.dates) ? roomVal.dates : [];
      upsertRoomByName(roomName, {
        ...(toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id)
          ? {
              id:
                toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id),
            }
          : {}),
        isApprovedDates: Boolean(
          (payload.stepFive as Record<string, unknown> | undefined)?.isApproved,
        ),
        dates: {
          dates: hydratedDates,
        },
        persistedDates: {
          dates: JSON.parse(JSON.stringify(hydratedDates)),
        },
      });
    });
  }

  if (stepSixRooms) {
    Object.entries(stepSixRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        ...(toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id)
          ? {
              id:
                toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id),
            }
          : {}),
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
          event_menu_category_id: toPositiveId(
            roomVal.event_menu_category_id,
          ),
          menus: Array.isArray(roomVal.menus)
            ? sortMenusForOnboardingDisplay(
                roomVal.menus as Array<{ name?: string | null }>,
              )
            : [],
        },
      });
    });
  }

  if (stepSevenRooms) {
    Object.entries(stepSevenRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        ...(toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id)
          ? {
              id:
                toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id),
            }
          : {}),
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

  if (stepEightRooms) {
    Object.entries(stepEightRooms).forEach(([roomName, roomVal]) => {
      if (!isRecord(roomVal)) return;
      upsertRoomByName(roomName, {
        ...(toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id)
          ? {
              id:
                toPositiveId(roomVal.room_id) ?? toPositiveId(roomVal.id),
            }
          : {}),
        isApprovedDrinks: Boolean(
          (payload.stepEight as Record<string, unknown> | undefined)?.isApproved,
        ),
        drinks: {
          drinks_option: resolveDrinksOptionFlag(roomVal),
          drink_title:
            typeof roomVal.drink_title === "string"
              ? roomVal.drink_title
              : typeof (payload.stepEight as Record<string, unknown> | undefined)
                ?.drink_title === "string"
                ? (payload.stepEight as Record<string, unknown>).drink_title
                : "",
          drink_description:
            typeof roomVal.drink_description === "string"
              ? roomVal.drink_description
              : typeof (payload.stepEight as Record<string, unknown> | undefined)
                ?.drink_description === "string"
                ? (payload.stepEight as Record<string, unknown>).drink_description
                : "",
          packages: Array.isArray(roomVal.packages)
            ? roomVal.packages
            : Array.isArray(
              (payload.stepEight as Record<string, unknown> | undefined)?.packages,
            )
              ? ((payload.stepEight as Record<string, unknown>).packages as unknown[])
              : [],
        },
      });
    });
  }

  const rooms = Array.from(roomMap.values()).slice(0, MAX_ROOMS);

  return {
    enabled:
      enabled ||
      Boolean(
        stepFourRooms ||
        stepFiveRooms ||
        stepSixRooms ||
        stepSevenRooms ||
        stepEightRooms,
      ),
    currentRoomIndex: Math.min(
      Number(direct?.currentRoomIndex ?? direct?.current_room_index ?? 0) || 0,
      Math.max(rooms.length - 1, 0),
    ),
    rooms,
  };
}
