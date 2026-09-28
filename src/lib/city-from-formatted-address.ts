/** Fallback when Places omits locality (common on UK street addresses). */
const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi;
const US_ZIP = /\b\d{5}(?:-\d{4})?\b/g;
/** Truncated hero labels often cut the inward code (`CB8 0…`). */
const UK_POSTCODE_FRAGMENT = /\b[A-Z]{1,2}\d[A-Z\d]?(?:\s*\d[A-Z]{0,2})?…?\s*$/i;
const COUNTRY_LABELS = new Set([
  "uk",
  "gb",
  "us",
  "usa",
  "united kingdom",
  "united states",
  "united states of america",
  "great britain",
  "england",
  "scotland",
  "wales",
  "ireland",
  "northern ireland",
]);

function stripPostalCodes(part: string): string {
  return part
    .replace(UK_POSTCODE, "")
    .replace(US_ZIP, "")
    .replace(UK_POSTCODE_FRAGMENT, "")
    .trim()
    .replace(/^[-,]+|[-,]+$/g, "")
    .trim();
}

function isCountryLabel(part: string): boolean {
  const normalized = stripPostalCodes(part).toLowerCase();
  return normalized.length > 0 && COUNTRY_LABELS.has(normalized);
}

/**
 * Last locality-looking segment from a formatted street address.
 * Never returns the full line — breadcrumbs want city only.
 */
export function cityFromFormattedAddress(
  address: string | null | undefined,
): string | null {
  if (!address?.trim()) return null;
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const localityParts = isCountryLabel(parts[parts.length - 1])
    ? parts.slice(0, -1)
    : parts;

  for (let i = localityParts.length - 1; i >= 0; i--) {
    const city = stripPostalCodes(localityParts[i]);
    if (city.length >= 2 && !/^\d+$/.test(city)) return city;
  }
  return null;
}
