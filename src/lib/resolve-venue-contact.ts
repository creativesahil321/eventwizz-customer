import type { ContactDetails, ThemeSchema } from "@/types/theme.types";

type VenueContactSource = Pick<ThemeSchema, "contactDetails"> | null | undefined;

type ExtendedContactDetails = ContactDetails & {
  phoneNumber?: string;
  alternativePhoneNumber?: string;
  alternativeAddress?: string;
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

function resolveVenueAddress(
  contact: ExtendedContactDetails | undefined,
): string | null {
  const lineOne = pickContactValue(contact?.address);
  const lineTwo = pickContactValue(contact?.alternativeAddress);
  if (lineOne && lineTwo) return `${lineOne}, ${lineTwo}`;
  return lineOne ?? lineTwo;
}

/** Resolve venue phone, email, and address from theme settings (supports API field variants). */
export function resolveVenueContact(source: VenueContactSource): {
  phone: string | null;
  email: string | null;
  address: string | null;
} {
  const contact = source?.contactDetails as ExtendedContactDetails | undefined;

  return {
    phone: pickContactValue(
      contact?.phone,
      contact?.phoneNumber,
      contact?.alternativePhone,
      contact?.alternativePhoneNumber,
    ),
    email: pickContactValue(contact?.email, contact?.alternativeEmail),
    address: resolveVenueAddress(contact),
  };
}
