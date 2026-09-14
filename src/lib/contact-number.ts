export const CONTACT_NUMBER_MAX_CHARS = 20;
export const CONTACT_NUMBER_MIN_DIGITS = 7;
export const CONTACT_NUMBER_MAX_DIGITS = 15;

export const CONTACT_NUMBER_REQUIRED_MESSAGE = "Contact number is required";
export const CONTACT_NUMBER_FORMAT_MESSAGE =
  "Contact number can only contain numbers and phone formatting characters (+, -, spaces, parentheses)";
export const CONTACT_NUMBER_MAX_MESSAGE =
  `Contact number must not exceed ${CONTACT_NUMBER_MAX_CHARS} characters`;
export const CONTACT_NUMBER_DIGITS_MESSAGE =
  `Enter a valid contact number with ${CONTACT_NUMBER_MIN_DIGITS}–${CONTACT_NUMBER_MAX_DIGITS} digits`;

const PHONE_CHARS_RE = /^[\d+\-() ]+$/;

export function sanitizeContactNumberInput(value: string): string {
  return value
    .replace(/[^\d+\-() ]/g, "")
    .slice(0, CONTACT_NUMBER_MAX_CHARS);
}

export function getContactNumberIssue(
  value: string | undefined | null,
): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return CONTACT_NUMBER_REQUIRED_MESSAGE;
  if (!PHONE_CHARS_RE.test(trimmed)) {
    return CONTACT_NUMBER_FORMAT_MESSAGE;
  }
  if (trimmed.length > CONTACT_NUMBER_MAX_CHARS) {
    return CONTACT_NUMBER_MAX_MESSAGE;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (
    digits.length < CONTACT_NUMBER_MIN_DIGITS ||
    digits.length > CONTACT_NUMBER_MAX_DIGITS
  ) {
    return CONTACT_NUMBER_DIGITS_MESSAGE;
  }

  return null;
}
