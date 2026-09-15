/** Door-entry QR payload: `ewz1.<base64url>.<hmac-sha256-hex>` */
export const DOOR_ENTRY_TOKEN_PREFIX = "ewz1.";

import { env } from "@/env";

const PLATFORM_SITE_NAME = /^(event\s*wizz|eventwizz\.org)$/i;

function isPlatformSiteName(name: string): boolean {
  return PLATFORM_SITE_NAME.test(name.trim());
}

function looksLikeWifiPayload(value: string): boolean {
  return value.trim().toLowerCase().startsWith("wifi:");
}

function tokenIfPrefixed(value: string | null | undefined): string | null {
  const token = value?.trim();
  if (!token || looksLikeWifiPayload(token)) return null;
  return token.startsWith(DOOR_ENTRY_TOKEN_PREFIX) ? token : null;
}

function tokenFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const fromQuery = tokenIfPrefixed(
      url.searchParams.get("t") || url.searchParams.get("token"),
    );
    if (fromQuery) return fromQuery;
    for (const part of url.pathname.split("/")) {
      if (!part) continue;
      try {
        const fromPath = tokenIfPrefixed(decodeURIComponent(part));
        if (fromPath) return fromPath;
      } catch {
        const fromPath = tokenIfPrefixed(part);
        if (fromPath) return fromPath;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Raw `ewz1.` token, or the token embedded in a vendor `/entry` (or door-scan) URL. */
export function extractDoorEntryToken(raw: string): string | null {
  const token = raw.trim();
  if (!token || looksLikeWifiPayload(token)) return null;
  return tokenIfPrefixed(token) ?? tokenFromUrl(token);
}

export function isEventWizzDoorEntryToken(raw: string): boolean {
  return extractDoorEntryToken(raw) != null;
}

export function doorScanPathForToken(token: string): string {
  return `/vendor/door-scan?t=${encodeURIComponent(token)}`;
}

/** Vendor dashboard lives on the EventWizz platform host, not the customer site. */
export function platformDoorScanUrl(token?: string | null): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (!token) return `${base}/vendor/door-scan`;
  return `${base}${doorScanPathForToken(token)}`;
}

/** Public vendor-site brand, never the EventWizz admin platform name. */
export function pickVendorSiteIdentity(options: {
  siteName?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
}): string {
  const candidates = [options.siteName, options.venueName, options.venueCity];
  for (const candidate of candidates) {
    const name = candidate?.trim();
    if (name && !isPlatformSiteName(name)) return name;
  }
  return "this venue";
}

export function notVenueInvoiceQrMessage(siteName: string): string {
  const name = siteName.trim() || "this venue";
  if (name.toLowerCase() === "this venue") {
    return "This is not the booking invoice QR. Scan the QR printed on the guest's invoice.";
  }
  return `This is not the ${name} booking invoice QR. Scan the QR printed on the guest's invoice.`;
}

export function isNamedVendorSite(siteName: string): boolean {
  return siteName.trim().toLowerCase() !== "this venue";
}
