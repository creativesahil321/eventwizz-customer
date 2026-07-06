/**
 * Normalizes Laravel / multipart API booleans (0, 1, "true", "false", etc.)
 * into consistent client-side values.
 */

const TRUTHY_STRINGS = new Set(["true", "1", "yes", "on"]);
const FALSY_STRINGS = new Set(["false", "0", "no", "off", ""]);

export type CoerceApiBooleanOptions = {
  /** Accept yes/on/empty-string falsy (form + Zod preprocess). Default: true. */
  extendedStrings?: boolean;
};

/** Returns `undefined` when the value is not a recognizable boolean. */
export function coerceApiBoolean(
  value: unknown,
  options: CoerceApiBooleanOptions = {},
): boolean | undefined {
  const extended = options.extendedStrings !== false;

  if (typeof value === "boolean") return value;
  if (value === 1) return true;
  if (value === 0) return false;

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "true" || trimmed === "1") return true;
    if (trimmed === "false" || trimmed === "0") return false;
    if (extended) {
      if (TRUTHY_STRINGS.has(trimmed)) return true;
      if (FALSY_STRINGS.has(trimmed)) return false;
    }
  }

  return undefined;
}

/** Strict API persistence shape — only 0/1/true/false variants. */
export function coerceApiBooleanOrNull(value: unknown): boolean | null {
  const coerced = coerceApiBoolean(value, { extendedStrings: false });
  return coerced ?? null;
}

/** Event/onboarding feature flags stored as `0 | 1`. */
export function coerceApiFlag(
  value: boolean | number | string | null | undefined,
): 0 | 1 {
  return coerceApiBoolean(value, { extendedStrings: false }) === true ? 1 : 0;
}

/** FormData value for Laravel `boolean` validation rules. */
export function booleanFlagToFormDataValue(flag: 0 | 1): "true" | "false" {
  return flag === 1 ? "true" : "false";
}
