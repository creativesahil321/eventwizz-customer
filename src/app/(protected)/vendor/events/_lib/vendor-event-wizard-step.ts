const VENDOR_EVENT_WIZARD_MAX_STEP = 8;

export type VendorEventWizardSteps = {
  activeStep: number;
  unlockStep: number;
};

type VendorEventGetStepFields = {
  completed_step?: unknown;
  current_step?: unknown;
};

function coerceWizardStep(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0
    ? Math.min(VENDOR_EVENT_WIZARD_MAX_STEP, Math.floor(n))
    : 0;
}

/** Positive numeric event id for URL paths — never `"false"` from a boolean. */
export function toPositiveVendorEventPathId(value: unknown): string | null {
  if (typeof value === "boolean" || value == null) return null;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return raw;
}

/** `data.current_step` from POST/PUT update — already the UI step to open. */
export function readVendorEventUpdateCurrentStep(
  response: unknown,
): unknown {
  if (!response || typeof response !== "object") return undefined;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;
  return (data as { current_step?: unknown }).current_step;
}

export function readVendorEventUpdateCompletedStep(
  response: unknown,
): unknown {
  if (!response || typeof response !== "object") return undefined;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;
  return (data as { completed_step?: unknown }).completed_step;
}

/**
 * After Save & Next: prefer update `current_step`. Never add 1 to that value.
 * If the field is missing (older APIs), fall back to savedStep + 1, capped at 8.
 */
export function resolveWizardStepAfterSave(params: {
  updateCurrentStep?: unknown;
  savedStep: number;
}): number {
  const fromApi = coerceWizardStep(params.updateCurrentStep);
  if (fromApi > 0) return fromApi;
  const saved = coerceWizardStep(params.savedStep) || 1;
  return Math.min(VENDOR_EVENT_WIZARD_MAX_STEP, saved + 1);
}

/** Visible tab + furthest unlocked tab after a successful step save. */
export function resolveWizardStepsAfterSave(params: {
  updateCurrentStep?: unknown;
  updateCompletedStep?: unknown;
  savedStep: number;
  previousUnlockStep: number;
}): VendorEventWizardSteps {
  const activeStep = resolveWizardStepAfterSave({
    updateCurrentStep: params.updateCurrentStep,
    savedStep: params.savedStep,
  });
  const completed = coerceWizardStep(params.updateCompletedStep);
  const previous = coerceWizardStep(params.previousUnlockStep) || 1;
  return {
    activeStep,
    unlockStep: Math.max(previous, activeStep, completed),
  };
}

/**
 * Hard refresh / first load: open last completed. Unlock may include GET
 * `current_step` (next incomplete) so mid-flow tabs stay reachable.
 */
export function resolveWizardStepsFromGet(
  data?: VendorEventGetStepFields | null,
): VendorEventWizardSteps {
  const completed = coerceWizardStep(data?.completed_step);
  const current = coerceWizardStep(data?.current_step);
  const activeStep = completed > 0 ? completed : current > 0 ? current : 1;
  return {
    activeStep,
    unlockStep: Math.max(completed, current, 1),
  };
}

/** Prefer a pending Save & Next step over GET `completed_step` after create redirect. */
export function resolveVisibleWizardSteps(params: {
  getData?: VendorEventGetStepFields | null;
  stashedStep?: unknown;
}): VendorEventWizardSteps {
  const fromGet = resolveWizardStepsFromGet(params.getData);
  const stashed = coerceWizardStep(params.stashedStep);
  if (stashed > 0) {
    return {
      activeStep: stashed,
      unlockStep: Math.max(fromGet.unlockStep, stashed),
    };
  }
  return fromGet;
}

const PENDING_STEP_KEY_PREFIX = "vendor-event-wizard-next-step:";
const PENDING_STEP_TTL_MS = 15_000;

export type VendorEventWizardNavigation = {
  type?: string;
  documentUrl?: string;
};

function pendingStepStorageKey(eventId: string): string {
  return `${PENDING_STEP_KEY_PREFIX}${eventId}`;
}

function vendorEventIdFromDocumentUrl(urlOrPath: string): string | null {
  try {
    const path = /^https?:\/\//i.test(urlOrPath)
      ? new URL(urlOrPath).pathname
      : urlOrPath;
    const match = path.match(/\/events\/(\d+)(?:\/|$)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function readDocumentNavigation(): VendorEventWizardNavigation {
  if (typeof performance === "undefined") return {};
  const nav = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;
  return {
    type: nav?.type,
    documentUrl: nav?.name,
  };
}

function shouldDiscardStashOnDocumentReload(
  eventId: string,
  navigation: VendorEventWizardNavigation,
): boolean {
  if (navigation.type !== "reload") return false;
  return vendorEventIdFromDocumentUrl(navigation.documentUrl ?? "") === eventId;
}

/** Used when create Save & Next navigates to `/vendor/events/:id` (new mount). */
export function stashWizardStepForNextMount(
  eventId: unknown,
  step: number,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : sessionStorage,
): void {
  const id = toPositiveVendorEventPathId(eventId);
  const next = coerceWizardStep(step);
  if (!id || next < 1 || !storage) return;
  storage.setItem(
    pendingStepStorageKey(id),
    JSON.stringify({ step: next, at: Date.now() }),
  );
}

/**
 * One-shot step after create→edit navigation. Ignored only when this document
 * itself was a hard reload of `/vendor/events/:id` — not when the SPA was
 * reloaded on create/list and then client-navigated here.
 */
export function consumeStashedWizardStep(
  eventId: unknown,
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window ===
  "undefined"
    ? null
    : sessionStorage,
  navigation: VendorEventWizardNavigation = readDocumentNavigation(),
): number {
  const id = toPositiveVendorEventPathId(eventId);
  if (!id || !storage) return 0;
  const key = pendingStepStorageKey(id);
  if (shouldDiscardStashOnDocumentReload(id, navigation)) {
    storage.removeItem(key);
    return 0;
  }
  const raw = storage.getItem(key);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as { step?: unknown; at?: unknown };
    const step = coerceWizardStep(parsed.step);
    const at = Number(parsed.at);
    if (step < 1 || !Number.isFinite(at) || Date.now() - at > PENDING_STEP_TTL_MS) {
      storage.removeItem(key);
      return 0;
    }
    return step;
  } catch {
    const step = coerceWizardStep(raw);
    storage.removeItem(key);
    return step;
  }
}
