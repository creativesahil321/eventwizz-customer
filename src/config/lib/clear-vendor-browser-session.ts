/**
 * Browser leftovers after logout (sessionStorage especially) survive a same-tab
 * redirect to /auth/login. That leaks `onboarding_mode` / `onboarding_is_rooms`
 * into the next account and skips mode selection / room questions.
 */

const ONBOARDING_SESSION_KEYS = [
  "onboarding_mode",
  "onboarding_is_rooms",
  "onboarding_data",
  "onboarding_active_step",
  "ew_ai_bulk_apply_active",
  "vendor_ai_event_draft_id",
] as const;

const SHARED_CLIENT_KEYS = [
  "permissions-backup",
  "vendor_location_id",
  "event_id",
  "impersonation-session",
  "extended-webhook-key",
  "nextauth.message",
] as const;

const PERSIST_KEYS = [
  "auth-storage",
  "permission-storage",
  "location-storage",
  "domain-storage",
  "cart-edit-storage",
  "cart-storage",
  "drink-selection-storage",
  "preview-device-storage",
] as const;

const KEY_PREFIXES = ["vendor_event_is_rooms:"] as const;

function removeKey(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // ignore quota / private-mode errors
  }
}

function removeByPrefix(storage: Storage, prefix: string) {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  } catch {
    return;
  }
  keys.forEach((key) => removeKey(storage, key));
}

function removeFromBoth(key: string) {
  if (typeof window === "undefined") return;
  removeKey(window.sessionStorage, key);
  removeKey(window.localStorage, key);
}

/** Drop onboarding + location leftovers so a new account does not inherit them. */
export function clearOnboardingBrowserState(): void {
  if (typeof window === "undefined") return;

  for (const key of ONBOARDING_SESSION_KEYS) {
    removeFromBoth(key);
  }
  removeFromBoth("vendor_location_id");
  removeFromBoth("event_id");
  removeKey(window.localStorage, "location-storage");
  for (const prefix of KEY_PREFIXES) {
    removeByPrefix(window.sessionStorage, prefix);
    removeByPrefix(window.localStorage, prefix);
  }
}

/**
 * Full vendor client wipe used on logout. Call AFTER Zustand persist has
 * rewritten `auth-storage` so those writes are also removed.
 */
export function clearVendorBrowserSession(): void {
  if (typeof window === "undefined") return;

  clearOnboardingBrowserState();

  for (const key of SHARED_CLIENT_KEYS) {
    removeFromBoth(key);
  }
  for (const key of PERSIST_KEYS) {
    removeFromBoth(key);
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
}
