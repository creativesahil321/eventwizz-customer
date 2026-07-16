import type { ContactDetails, LocationData, ThemeSchema } from "@/types/theme.types";

type VenueContactSource = Pick<ThemeSchema, "contactDetails" | "locations"> | null | undefined;

export type ResolvedVenueContact = {
  phone: string | null;
  email: string | null;
  address: string | null;
};

/** Optional contact fields from a location detail / event payload. */
export type VenueContactOverride = {
  phone?: string | null;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
};

function pickContactValue(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function resolveFromContactDetails(
  contact: ContactDetails | null | undefined,
): ResolvedVenueContact {
  const lineOne = pickContactValue(contact?.address);
  const lineTwo = pickContactValue(contact?.alternativeAddress);
  const address =
    lineOne && lineTwo ? `${lineOne}, ${lineTwo}` : (lineOne ?? lineTwo);

  return {
    phone: pickContactValue(
      contact?.phone,
      contact?.phoneNumber,
      contact?.alternativePhone,
      contact?.alternativePhoneNumber,
    ),
    email: pickContactValue(contact?.email, contact?.alternativeEmail),
    address,
  };
}

function resolveFromLocation(
  location: LocationData | null | undefined,
): ResolvedVenueContact {
  return {
    phone: pickContactValue(location?.phone_number),
    email: pickContactValue(location?.email),
    address: pickContactValue(location?.address),
  };
}

function resolveFromOverride(
  override: VenueContactOverride | null | undefined,
): ResolvedVenueContact {
  return {
    phone: pickContactValue(override?.phone, override?.phone_number),
    email: pickContactValue(override?.email),
    address: pickContactValue(override?.address),
  };
}

function mergeContact(
  preferred: ResolvedVenueContact,
  fallback: ResolvedVenueContact,
): ResolvedVenueContact {
  return {
    phone: preferred.phone ?? fallback.phone,
    email: preferred.email ?? fallback.email,
    address: preferred.address ?? fallback.address,
  };
}

/** Resolve vendor-level phone, email, and address from theme `contactDetails`. */
export function resolveVenueContact(source: VenueContactSource): ResolvedVenueContact {
  return resolveFromContactDetails(source?.contactDetails);
}

/**
 * Resolve contact for a public page:
 * 1) explicit override (location/event API fields)
 * 2) matching `theme.locations[]` by slug (per-location contact)
 * 3) main `theme.contactDetails` (vendor-level fallback)
 */
export function resolvePublicPageContact(options: {
  theme?: VenueContactSource;
  locationSlug?: string | null;
  override?: VenueContactOverride | null;
}): ResolvedVenueContact {
  const { theme, locationSlug, override } = options;
  const main = resolveVenueContact(theme);

  const matchedLocation =
    locationSlug && theme?.locations?.length
      ? theme.locations.find(
          (loc) => loc.slug?.toLowerCase() === locationSlug.toLowerCase(),
        )
      : undefined;

  const fromLocation = resolveFromLocation(matchedLocation);
  const fromOverride = resolveFromOverride(override);

  return mergeContact(fromOverride, mergeContact(fromLocation, main));
}

export function hasResolvedContact(contact: ResolvedVenueContact): boolean {
  return Boolean(contact.phone || contact.email || contact.address);
}

export function contactsAreEqual(
  a: ResolvedVenueContact,
  b: ResolvedVenueContact,
): boolean {
  return a.phone === b.phone && a.email === b.email && a.address === b.address;
}

export type FooterContactBlock = {
  id: string;
  label: string;
  contact: ResolvedVenueContact;
};

/**
 * Resolve the contact blocks shown in the public footer.
 * On location pages: current venue first, then head office when different.
 * On the main page: head office only.
 */
export function resolveFooterContactBlocks(options: {
  theme?: VenueContactSource;
  locationSlug?: string | null;
  override?: VenueContactOverride | null;
}): FooterContactBlock[] {
  const { theme, locationSlug, override } = options;
  const main = resolveVenueContact(theme);
  const blocks: FooterContactBlock[] = [];

  const matchedLocation =
    locationSlug && theme?.locations?.length
      ? theme.locations.find(
          (loc) => loc.slug?.toLowerCase() === locationSlug.toLowerCase(),
        )
      : undefined;

  if (locationSlug) {
    const venueContact = resolvePublicPageContact({
      theme,
      locationSlug,
      override,
    });
    const venueLabel = matchedLocation?.city?.trim() || "This venue";

    if (hasResolvedContact(venueContact)) {
      blocks.push({
        id: "venue",
        label: venueLabel,
        contact: venueContact,
      });
    }

    if (hasResolvedContact(main) && !contactsAreEqual(main, venueContact)) {
      blocks.push({
        id: "head-office",
        label: "Head office",
        contact: main,
      });
    }

    return blocks;
  }

  if (hasResolvedContact(main)) {
    blocks.push({
      id: "head-office",
      label: "Head office",
      contact: main,
    });
  }

  return blocks;
}

export function buildMapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
