import type { EventDetailData } from "@/services/vendor/events/type";
import type { EventSchemaType } from "../_components/tab-event-form/schema";

const DRAFT_KEY_PREFIX = "vendor-event-preview-draft:";
export const VENDOR_EVENT_PREVIEW_DRAFT_CHANGED =
  "vendor-event-preview-draft-changed";
const DRAFT_CHANGED_EVENT = VENDOR_EVENT_PREVIEW_DRAFT_CHANGED;
const IDB_NAME = "eventwizz-vendor-preview";
const IDB_VERSION = 1;
const IDB_STORE = "files";

type PreviewFileMarker = {
  __ewPreviewFile: true;
  key: string;
  name: string;
  type: string;
};

type DraftEnvelope = {
  updatedAt: number;
  form: Partial<EventSchemaType>;
  fileKeys: string[];
};

function draftStorageKey(eventId: string | number): string {
  return `${DRAFT_KEY_PREFIX}${eventId}`;
}

function isPreviewFileMarker(value: unknown): value is PreviewFileMarker {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as PreviewFileMarker).__ewPreviewFile === true &&
    typeof (value as PreviewFileMarker).key === "string"
  );
}

function mediaToPreviewSrc(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof File !== "undefined" && value instanceof File) {
    const withPreview = value as File & { preview?: string };
    if (typeof withPreview.preview === "string" && withPreview.preview.trim()) {
      return withPreview.preview;
    }
    return URL.createObjectURL(value);
  }
  if (typeof value === "object") {
    const record = value as { preview?: unknown; url?: unknown; path?: unknown };
    for (const key of ["preview", "url", "path"] as const) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return undefined;
}

function skipDraftOverlayValue(value: unknown): boolean {
  return value === undefined || isPreviewFileMarker(value);
}

function overlayDefined<T extends Record<string, unknown>>(
  base: T | undefined,
  overlay: Record<string, unknown> | undefined,
): T {
  const next = { ...(base ?? {}) } as Record<string, unknown>;
  if (!overlay) return next as T;
  for (const [key, value] of Object.entries(overlay)) {
    if (skipDraftOverlayValue(value)) continue;
    next[key] = value;
  }
  return next as T;
}

function withPreviewMediaDeep(value: unknown): unknown {
  if (isPreviewFileMarker(value)) return undefined;
  if (typeof File !== "undefined" && value instanceof File) {
    return mediaToPreviewSrc(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => withPreviewMediaDeep(item));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {
      ...(value as Record<string, unknown>),
    };
    for (const key of Object.keys(next)) {
      next[key] = withPreviewMediaDeep(next[key]);
    }
    return next;
  }
  return value;
}

/** Overlay unsaved editor values onto the last saved payload. Keeps File objects. */
export function applyVendorEventDraft<T extends Record<string, unknown>>(
  saved: T | null | undefined,
  liveForm: Partial<EventSchemaType> | null | undefined,
): T {
  const base = { ...(saved ?? {}) } as T;
  if (!liveForm) return base;

  const next = { ...base } as Record<string, unknown>;

  if (liveForm.stepOne) {
    next.stepOne = overlayDefined(
      (base as { stepOne?: Record<string, unknown> }).stepOne,
      liveForm.stepOne as Record<string, unknown>,
    );
  }
  if (liveForm.stepTwo) {
    next.stepTwo = overlayDefined(
      (base as { stepTwo?: Record<string, unknown> }).stepTwo,
      liveForm.stepTwo as Record<string, unknown>,
    );
  }
  if (liveForm.stepThree) {
    next.stepThree = overlayDefined(
      (base as { stepThree?: Record<string, unknown> }).stepThree,
      liveForm.stepThree as Record<string, unknown>,
    );
  }
  if (liveForm.stepFour) {
    next.stepFour = overlayDefined(
      (base as { stepFour?: Record<string, unknown> }).stepFour,
      liveForm.stepFour as Record<string, unknown>,
    );
  }
  if (liveForm.stepFive) {
    next.stepFive = overlayDefined(
      (base as { stepFive?: Record<string, unknown> }).stepFive,
      liveForm.stepFive as Record<string, unknown>,
    );
  }
  if (liveForm.stepSix) {
    next.stepSix = overlayDefined(
      (base as { stepSix?: Record<string, unknown> }).stepSix,
      liveForm.stepSix as Record<string, unknown>,
    );
  }
  if (liveForm.stepSeven) {
    next.stepSeven = overlayDefined(
      (base as { stepSeven?: Record<string, unknown> }).stepSeven,
      liveForm.stepSeven as Record<string, unknown>,
    );
  }
  if (liveForm.stepEight) {
    next.stepEight = overlayDefined(
      (base as { stepEight?: Record<string, unknown> }).stepEight,
      liveForm.stepEight as Record<string, unknown>,
    );
  }

  next.is_rooms =
    liveForm.stepTwo?.is_rooms ??
    liveForm.stepOne?.is_rooms ??
    (base as { is_rooms?: unknown }).is_rooms;
  next.vendor_location_id =
    liveForm.stepOne?.vendor_location_id ??
    (base as { vendor_location_id?: unknown }).vendor_location_id;

  return next as T;
}

/**
 * Preview display merge: unsaved form wins, Files become object URLs.
 */
export function mergeVendorLivePreviewData(
  saved: EventDetailData | null | undefined,
  liveForm: Partial<EventSchemaType> | null | undefined,
): EventDetailData {
  const merged = applyVendorEventDraft(
    (saved ?? {}) as Record<string, unknown>,
    liveForm,
  );
  return withPreviewMediaDeep(merged) as EventDetailData;
}

function openPreviewFileDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function putPreviewFile(key: string, file: File): Promise<void> {
  const db = await openPreviewFileDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB put failed"));
  });
  db.close();
}

async function getPreviewFile(key: string): Promise<File | null> {
  const db = await openPreviewFileDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const request = tx.objectStore(IDB_STORE).get(key);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result instanceof File ? result : null);
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB get failed"));
  });
  db.close();
  return file;
}

async function deletePreviewFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openPreviewFileDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    for (const key of keys) store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
  db.close();
}

function collectFiles(
  value: unknown,
  path: string,
  files: Map<string, File>,
  eventId: string,
): unknown {
  if (typeof File !== "undefined" && value instanceof File) {
    const key = `${eventId}:${path || "file"}`;
    files.set(key, value);
    const marker: PreviewFileMarker = {
      __ewPreviewFile: true,
      key,
      name: value.name,
      type: value.type,
    };
    return marker;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      collectFiles(item, path ? `${path}.${index}` : String(index), files, eventId),
    );
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      next[key] = collectFiles(child, path ? `${path}.${key}` : key, files, eventId);
    }
    return next;
  }
  return value;
}

async function restoreFiles(value: unknown): Promise<unknown> {
  if (isPreviewFileMarker(value)) {
    return (await getPreviewFile(value.key)) ?? undefined;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => restoreFiles(item)));
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([key, child]) => [
        key,
        await restoreFiles(child),
      ]),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

function readDraftEnvelope(eventId: string | number): DraftEnvelope | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(eventId));
    if (!raw) return null;
    return JSON.parse(raw) as DraftEnvelope;
  } catch {
    return null;
  }
}

function dispatchDraftChanged(eventId: string | number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DRAFT_CHANGED_EVENT, {
      detail: { eventId: String(eventId) },
    }),
  );
}

export async function persistVendorEventDraft(
  eventId: string | number,
  liveForm: Partial<EventSchemaType>,
): Promise<void> {
  if (typeof window === "undefined") return;
  const id = String(eventId);
  if (!/^\d+$/.test(id)) return;

  const files = new Map<string, File>();
  const form = collectFiles(liveForm, "", files, id) as Partial<EventSchemaType>;
  const fileKeys = [...files.keys()];
  const previous = readDraftEnvelope(id);

  try {
    await Promise.all([...files.entries()].map(([key, file]) => putPreviewFile(key, file)));
    const staleKeys = (previous?.fileKeys ?? []).filter((key) => !files.has(key));
    await deletePreviewFiles(staleKeys);

    localStorage.setItem(
      draftStorageKey(id),
      JSON.stringify({
        updatedAt: Date.now(),
        form,
        fileKeys,
      } satisfies DraftEnvelope),
    );
    dispatchDraftChanged(id);
  } catch {
    // Quota / private mode — preview falls back to in-memory form / saved API.
  }
}

export function writeVendorEventPreviewDraft(
  eventId: string | number,
  liveForm: Partial<EventSchemaType>,
): void {
  void persistVendorEventDraft(eventId, liveForm);
}

export async function loadVendorEventDraft(
  eventId: string | number,
): Promise<Partial<EventSchemaType> | null> {
  const envelope = readDraftEnvelope(eventId);
  if (!envelope?.form) return null;
  try {
    return (await restoreFiles(envelope.form)) as Partial<EventSchemaType>;
  } catch {
    return envelope.form;
  }
}

/** Sync JSON-only read — Files are still markers until `loadVendorEventDraft`. */
export function readVendorEventPreviewDraft(
  eventId: string | number,
): Partial<EventSchemaType> | null {
  return readDraftEnvelope(eventId)?.form ?? null;
}

export async function clearVendorEventPreviewDraft(
  eventId: string | number,
): Promise<void> {
  if (typeof window === "undefined") return;
  const envelope = readDraftEnvelope(eventId);
  try {
    await deletePreviewFiles(envelope?.fileKeys ?? []);
    localStorage.removeItem(draftStorageKey(eventId));
    dispatchDraftChanged(eventId);
  } catch {
    try {
      localStorage.removeItem(draftStorageKey(eventId));
    } catch {
      // ignore
    }
  }
}
