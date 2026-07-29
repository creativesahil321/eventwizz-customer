import type { VenueContactOverride } from "@/lib/resolve-venue-contact";
import type { ContactDetails, LocationData, ThemeSchema } from "@/types/theme.types";
import type { SiteEssentialsFormValues } from "./schema";

function pickTrimmed(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Location / vendor contact from site-essentials API/form — used in
 * `/preview/site` and `/preview/onboarding` so header/footer do not fall back
 * to the platform host theme (dummy EventWizz / admin contact).
 *
 * Priority matches the live vendor site:
 * 1) matching location by slug
 * 2) company_* draft fields (site-essentials editor)
 * 3) `contactDetails` from theme/site-essentials GET (public API shape)
 */
export function resolveSiteEssentialsPreviewContact(
  formValues: SiteEssentialsFormValues,
  locationSlug?: string | null,
): VenueContactOverride | null {
  const locations = formValues.locations ?? [];
  const slug = locationSlug?.trim();

  const match = slug
    ? locations.find(
        (loc) => loc.slug?.trim().toLowerCase() === slug.toLowerCase(),
      )
    : undefined;

  if (match) {
    const phone = pickTrimmed(match.phone_number);
    const email = pickTrimmed(match.email);
    const address = pickTrimmed(match.address);
    if (phone || email || address) {
      return { phone, email, address };
    }
  }

  const companyPhone = pickTrimmed(formValues.company_phone);
  const companyEmail = pickTrimmed(formValues.company_email);
  const companyAddress = pickTrimmed(formValues.company_registered_office);
  if (companyPhone || companyEmail || companyAddress) {
    return {
      phone: companyPhone,
      email: companyEmail,
      address: companyAddress,
    };
  }

  // Public theme / onboarding preview GET — same shape as live vendor footer
  const details = formValues.contactDetails;
  const phone = pickTrimmed(details?.phone, details?.phoneNumber);
  const email = pickTrimmed(details?.email);
  const address = pickTrimmed(details?.address);
  if (phone || email || address) {
    return { phone, email, address };
  }

  return null;
}

/**
 * Build the same contact source the live vendor footer uses (`theme.locations`
 * + `theme.contactDetails`) from site-essentials preview data — so Event /
 * Location previews can show venue + head office without the platform host theme.
 */
export function buildSiteEssentialsContactTheme(
  formValues: SiteEssentialsFormValues | null | undefined,
): Pick<ThemeSchema, "contactDetails" | "locations"> | null {
  if (!formValues) return null;

  const details = formValues.contactDetails;
  const phone = pickTrimmed(details?.phone, details?.phoneNumber);
  const email = pickTrimmed(details?.email);
  const address = pickTrimmed(details?.address);

  let contactDetails: ContactDetails | undefined;
  if (phone || email || address) {
    contactDetails = {
      phone: phone ?? "",
      email: email ?? "",
      address: address ?? "",
      ...(details?.phoneNumber ? { phoneNumber: details.phoneNumber } : {}),
      ...(details?.alternativeEmail
        ? { alternativeEmail: details.alternativeEmail }
        : {}),
      ...(details?.alternativePhone
        ? { alternativePhone: details.alternativePhone }
        : {}),
      ...(details?.alternativePhoneNumber
        ? { alternativePhoneNumber: details.alternativePhoneNumber }
        : {}),
      ...(details?.alternativeAddress
        ? { alternativeAddress: details.alternativeAddress }
        : {}),
    };
  } else {
    const companyPhone = pickTrimmed(formValues.company_phone);
    const companyEmail = pickTrimmed(formValues.company_email);
    const companyAddress = pickTrimmed(formValues.company_registered_office);
    if (companyPhone || companyEmail || companyAddress) {
      contactDetails = {
        phone: companyPhone ?? "",
        email: companyEmail ?? "",
        address: companyAddress ?? "",
      };
    }
  }

  const locations = (formValues.locations ?? []) as LocationData[];
  if (!contactDetails && locations.length === 0) return null;

  return {
    ...(contactDetails ? { contactDetails } : {}),
    ...(locations.length > 0 ? { locations } : {}),
  };
}
