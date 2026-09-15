export type CollectDraftSeed = {
  venueName?: string;
  venueType?: string;
  event_category_id?: number;
  city?: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  has_multiple_locations?: boolean;
  has_room_system?: boolean;
  room_names?: string[];
  description?: string;
  latitude?: number;
  longitude?: number;
};

export const AI_COLLECT_DRAFT_STORAGE_KEY = "ew.ai-onboarding.collect-draft";
const DRAFT_VERSION = 1 as const;
/** Safari can restore a tab days later; ignore a stale collect draft. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type DraftStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type AiCollectRoomName = { name: string };

export type AiCollectDraftV1 = {
  v: typeof DRAFT_VERSION;
  userKey: string;
  updatedAt: number;
  locationGateDone: boolean;
  isPlaceSelected: boolean;
  has_multiple_locations: boolean;
  has_room_system?: boolean;
  room_names: AiCollectRoomName[];
  room_names_stash: AiCollectRoomName[];
  venueName: string;
  selectedPlaceId: string;
  venueType: string;
  city: string;
  address: string;
  contactNumber: string;
  email: string;
  description: string;
  latitude?: number;
  longitude?: number;
};

export type CollectDraftRestore = {
  locationGateDone: boolean;
  isPlaceSelected: boolean;
  has_multiple_locations: boolean;
  has_room_system?: boolean;
  room_names: AiCollectRoomName[];
  room_names_stash: AiCollectRoomName[];
  venueName: string;
  selectedPlaceId: string;
  venueType: string;
  city: string;
  address: string;
  contactNumber: string;
  email: string;
  description: string;
  latitude?: number;
  longitude?: number;
};

function browserSessionStorage(): DraftStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalizeRooms(rooms: unknown): AiCollectRoomName[] {
  if (!Array.isArray(rooms)) return [];
  return rooms
    .map((row) => {
      if (typeof row === "string") return { name: row };
      if (row && typeof row === "object" && "name" in row) {
        return { name: String((row as { name?: unknown }).name ?? "") };
      }
      return { name: "" };
    })
    .slice(0, 3);
}

function namedRooms(rooms: AiCollectRoomName[]): AiCollectRoomName[] {
  return rooms
    .map((row) => ({ name: row.name.trim() }))
    .filter((row) => row.name.length > 0)
    .slice(0, 3);
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseDraft(raw: string): AiCollectDraftV1 | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AiCollectDraftV1>;
    if (!parsed || parsed.v !== DRAFT_VERSION) return null;
    if (typeof parsed.userKey !== "string" || !parsed.userKey.trim()) return null;
    if (typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt)) {
      return null;
    }
    if (Date.now() - parsed.updatedAt > DRAFT_TTL_MS) return null;
    return {
      v: DRAFT_VERSION,
      userKey: parsed.userKey.trim(),
      updatedAt: parsed.updatedAt,
      locationGateDone: parsed.locationGateDone === true,
      isPlaceSelected: parsed.isPlaceSelected === true,
      has_multiple_locations: parsed.has_multiple_locations === true,
      has_room_system:
        parsed.has_room_system === true
          ? true
          : parsed.has_room_system === false
            ? false
            : undefined,
      room_names: normalizeRooms(parsed.room_names),
      room_names_stash: namedRooms(normalizeRooms(parsed.room_names_stash)),
      venueName: asString(parsed.venueName),
      selectedPlaceId: asString(parsed.selectedPlaceId),
      venueType: asString(parsed.venueType),
      city: asString(parsed.city),
      address: asString(parsed.address),
      contactNumber: asString(parsed.contactNumber),
      email: asString(parsed.email),
      description: asString(parsed.description),
      latitude: asFiniteNumber(parsed.latitude),
      longitude: asFiniteNumber(parsed.longitude),
    };
  } catch {
    return null;
  }
}

export function readAiCollectDraft(
  userKey: string,
  storage: DraftStorage | null = browserSessionStorage(),
): AiCollectDraftV1 | null {
  if (!storage || !userKey.trim()) return null;
  const raw = storage.getItem(AI_COLLECT_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  const draft = parseDraft(raw);
  if (!draft) {
    storage.removeItem(AI_COLLECT_DRAFT_STORAGE_KEY);
    return null;
  }
  if (draft.userKey !== userKey.trim()) return null;
  return draft;
}

export function writeAiCollectDraft(
  draft: Omit<AiCollectDraftV1, "v" | "updatedAt"> &
    Partial<Pick<AiCollectDraftV1, "v" | "updatedAt">>,
  storage: DraftStorage | null = browserSessionStorage(),
): void {
  if (!storage || !draft.userKey.trim()) return;
  const payload: AiCollectDraftV1 = {
    v: DRAFT_VERSION,
    updatedAt: Date.now(),
    userKey: draft.userKey.trim(),
    locationGateDone: draft.locationGateDone === true,
    isPlaceSelected: draft.isPlaceSelected === true,
    has_multiple_locations: draft.has_multiple_locations === true,
    has_room_system:
      draft.has_room_system === true
        ? true
        : draft.has_room_system === false
          ? false
          : undefined,
    room_names: normalizeRooms(draft.room_names),
    room_names_stash: namedRooms(normalizeRooms(draft.room_names_stash)),
    venueName: asString(draft.venueName),
    selectedPlaceId: asString(draft.selectedPlaceId),
    venueType: asString(draft.venueType),
    city: asString(draft.city),
    address: asString(draft.address),
    contactNumber: asString(draft.contactNumber),
    email: asString(draft.email),
    description: asString(draft.description),
    latitude: asFiniteNumber(draft.latitude),
    longitude: asFiniteNumber(draft.longitude),
  };
  try {
    storage.setItem(AI_COLLECT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — skip; live form still works.
  }
}

export function clearAiCollectDraft(
  storage: DraftStorage | null = browserSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(AI_COLLECT_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function applyRoomSystemChoice(input: {
  enabled: boolean;
  roomNames: AiCollectRoomName[];
  stash: AiCollectRoomName[];
}): { roomNames: AiCollectRoomName[]; stash: AiCollectRoomName[] } {
  const currentNamed = namedRooms(input.roomNames);
  if (input.enabled) {
    const source =
      currentNamed.length >= 2
        ? input.roomNames.slice(0, 3)
        : input.stash.length > 0
          ? input.stash.slice(0, 3)
          : input.roomNames.slice(0, 3);
    const next = source.map((row) => ({ name: row.name ?? "" }));
    while (next.length < 2) next.push({ name: "" });
    return {
      roomNames: next.slice(0, 3),
      stash: namedRooms(next),
    };
  }

  return {
    roomNames: [],
    stash: currentNamed.length > 0 ? currentNamed : namedRooms(input.stash),
  };
}

function roomsFromSeed(names: string[] | undefined): AiCollectRoomName[] {
  if (!names?.length) return [];
  return names
    .map((name) => ({ name: String(name) }))
    .slice(0, 3);
}

function overlaySeed(
  base: CollectDraftRestore,
  seed: CollectDraftSeed,
): CollectDraftRestore {
  const next: CollectDraftRestore = { ...base };
  if (seed.venueName) next.venueName = seed.venueName;
  if (seed.venueType) next.venueType = seed.venueType;
  if (seed.event_category_id != null) {
    next.venueType = String(seed.event_category_id);
  }
  if (seed.city) next.city = seed.city;
  if (seed.address) next.address = seed.address;
  if (seed.contactNumber) next.contactNumber = seed.contactNumber;
  if (seed.email) next.email = seed.email;
  if (typeof seed.description === "string") next.description = seed.description;
  if (typeof seed.has_multiple_locations === "boolean") {
    next.has_multiple_locations = seed.has_multiple_locations;
    next.locationGateDone = true;
  }
  if (typeof seed.has_room_system === "boolean") {
    next.has_room_system = seed.has_room_system;
  }
  if (seed.room_names && seed.room_names.length > 0) {
    next.room_names = roomsFromSeed(seed.room_names);
    next.room_names_stash = namedRooms(next.room_names);
  }
  const lat = asFiniteNumber(seed.latitude);
  const lng = asFiniteNumber(seed.longitude);
  if (lat != null) next.latitude = lat;
  if (lng != null) next.longitude = lng;
  if (seed.venueName && seed.has_multiple_locations !== true) {
    next.isPlaceSelected = true;
  }
  return next;
}

export function resolveCollectDraftRestore(args: {
  userKey: string;
  draft: AiCollectDraftV1 | null;
  initialData: CollectDraftSeed | null;
  persistedHasMultipleLocations: boolean | null;
  persistedHasRoomSystem: boolean | null;
  persistedRoomNames: string[];
}): CollectDraftRestore | null {
  const empty: CollectDraftRestore = {
    locationGateDone: false,
    isPlaceSelected: false,
    has_multiple_locations: false,
    has_room_system: undefined,
    room_names: [],
    room_names_stash: [],
    venueName: "",
    selectedPlaceId: "",
    venueType: "",
    city: "",
    address: "",
    contactNumber: "",
    email: "",
    description: "",
  };

  let restored: CollectDraftRestore | null = args.draft
    ? {
        locationGateDone: args.draft.locationGateDone,
        isPlaceSelected: args.draft.isPlaceSelected,
        has_multiple_locations: args.draft.has_multiple_locations,
        has_room_system: args.draft.has_room_system,
        room_names: args.draft.room_names,
        room_names_stash: args.draft.room_names_stash,
        venueName: args.draft.venueName,
        selectedPlaceId: args.draft.selectedPlaceId,
        venueType: args.draft.venueType,
        city: args.draft.city,
        address: args.draft.address,
        contactNumber: args.draft.contactNumber,
        email: args.draft.email,
        description: args.draft.description,
        latitude: args.draft.latitude,
        longitude: args.draft.longitude,
      }
    : args.initialData
      ? { ...empty }
      : null;

  if (!restored && args.initialData) restored = { ...empty };
  if (!restored) {
    if (
      args.persistedHasMultipleLocations === true ||
      args.persistedHasMultipleLocations === false ||
      args.persistedHasRoomSystem === true ||
      args.persistedHasRoomSystem === false
    ) {
      restored = { ...empty };
    } else {
      return null;
    }
  }

  if (args.initialData) {
    restored = overlaySeed(restored, args.initialData);
  }

  if (args.persistedHasMultipleLocations === true) {
    restored.has_multiple_locations = true;
    restored.locationGateDone = true;
  } else if (args.persistedHasMultipleLocations === false) {
    restored.has_multiple_locations = false;
    restored.locationGateDone = true;
  }

  if (args.persistedHasRoomSystem === true) {
    restored.has_room_system = true;
    if (args.persistedRoomNames.length > 0) {
      restored.room_names = roomsFromSeed(args.persistedRoomNames);
      restored.room_names_stash = namedRooms(restored.room_names);
    }
  } else if (args.persistedHasRoomSystem === false) {
    restored.has_room_system = false;
    restored.room_names = [];
  }

  return restored;
}

export function snapshotFromCollectForm(input: {
  userKey: string;
  locationGateDone: boolean;
  isPlaceSelected: boolean;
  has_multiple_locations: boolean;
  has_room_system?: boolean;
  room_names: AiCollectRoomName[];
  room_names_stash: AiCollectRoomName[];
  venueName: string;
  selectedPlaceId?: string;
  venueType: string;
  city: string;
  address: string;
  contactNumber: string;
  email: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}): Omit<AiCollectDraftV1, "v" | "updatedAt"> {
  const rooms = normalizeRooms(input.room_names);
  const stash =
    input.has_room_system === true
      ? namedRooms(rooms).length > 0
        ? namedRooms(rooms)
        : namedRooms(input.room_names_stash)
      : namedRooms(input.room_names_stash);

  return {
    userKey: input.userKey,
    locationGateDone: input.locationGateDone,
    isPlaceSelected: input.isPlaceSelected,
    has_multiple_locations: input.has_multiple_locations,
    has_room_system: input.has_room_system,
    room_names: rooms,
    room_names_stash: stash,
    venueName: input.venueName,
    selectedPlaceId: input.selectedPlaceId ?? "",
    venueType: input.venueType,
    city: input.city,
    address: input.address,
    contactNumber: input.contactNumber,
    email: input.email,
    description: input.description ?? "",
    latitude: input.latitude,
    longitude: input.longitude,
  };
}
