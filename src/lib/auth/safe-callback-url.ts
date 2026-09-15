const AUTH_CALLBACK_STORAGE_KEY = "ew_auth_callback_url";

/**
 * Validate post-login return URLs (open-redirect safe).
 * Accepts same-origin absolute URLs or root-relative paths.
 */
export function getSafeCallbackUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw || typeof raw !== "string") return null;

  let value = raw.trim();
  if (!value) return null;

  try {
    value = decodeURIComponent(value);
  } catch {
    // keep original
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (
        typeof window !== "undefined" &&
        parsed.origin !== window.location.origin
      ) {
        return null;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("://")) return null;

  return value;
}

export function peekAuthCallbackUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return getSafeCallbackUrl(sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY));
  } catch {
    return null;
  }
}

function callbackPathname(safe: string): string {
  return safe.split("?")[0]?.split("#")[0] ?? "";
}

/** Same-origin vendor door-entry return paths only. */
export function isVendorDoorEntryCallback(raw: string | null | undefined): boolean {
  const safe = getSafeCallbackUrl(raw);
  if (!safe) return false;
  const path = callbackPathname(safe);
  return path === "/entry" || path === "/vendor/door-scan";
}

/** Persist callback across multi-step signup (OTP → create-password). */
export function saveAuthCallbackUrl(raw: string | null | undefined): void {
  const safe = getSafeCallbackUrl(raw);
  if (!safe || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_CALLBACK_STORAGE_KEY, safe);
  } catch {
    // ignore
  }
}

export function consumeAuthCallbackUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return getSafeCallbackUrl(stored);
  } catch {
    return null;
  }
}

type ResolvePostLoginRedirectArgs = {
  accountType: string;
  isVendorOnboarded?: boolean;
  callbackUrl?: string | null;
};

/**
 * Role-aware post-login destination. Customers honor a safe callbackUrl
 * (e.g. /vendor/checkout after booking a date while logged out).
 * Onboarded vendors honor a door-scan /entry callback so Google Lens
 * can return staff to Door Scan after login.
 */
export function resolvePostLoginRedirect({
  accountType,
  isVendorOnboarded = false,
  callbackUrl,
}: ResolvePostLoginRedirectArgs): string {
  const fromQuery = getSafeCallbackUrl(callbackUrl);
  const fromStore = peekAuthCallbackUrl();
  const safe = fromQuery || fromStore;

  if (accountType === "vendor") {
    if (!isVendorOnboarded) return "/on-boarding";
    if (safe && isVendorDoorEntryCallback(safe)) {
      saveAuthCallbackUrl(safe);
      return safe;
    }
    return "/welcome/select-location";
  }

  if (safe && accountType === "customer") {
    consumeAuthCallbackUrl();
    if (isVendorDoorEntryCallback(safe)) {
      return "/customer/dashboard";
    }
    return safe;
  }

  return `/${accountType}/dashboard`;
}
