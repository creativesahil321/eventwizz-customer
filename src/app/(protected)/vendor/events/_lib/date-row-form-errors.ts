/** Walk react-hook-form / Zod nested error objects and surface a user-facing message. */

const SKIP_KEYS = new Set(["message", "type", "ref", "types", "root"]);

export function firstReactHookFormMessage(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;

  const err = node as { message?: unknown; [key: string]: unknown };
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }

  for (const [key, value] of Object.entries(err)) {
    if (SKIP_KEYS.has(key)) continue;
    const nested = firstReactHookFormMessage(value);
    if (nested) return nested;
  }

  return null;
}

export function getDateRowErrorNode(
  datesErrors: unknown,
  dateIndex: number,
): unknown {
  if (datesErrors == null || dateIndex < 0) return undefined;
  if (Array.isArray(datesErrors)) return datesErrors[dateIndex];
  if (typeof datesErrors === "object") {
    return (datesErrors as Record<string, unknown>)[String(dateIndex)];
  }
  return undefined;
}

export function firstDateRowErrorIndex(datesErrors: unknown): number | null {
  if (datesErrors == null) return null;

  if (Array.isArray(datesErrors)) {
    for (let i = 0; i < datesErrors.length; i++) {
      if (firstReactHookFormMessage(datesErrors[i])) return i;
    }
    return null;
  }

  if (typeof datesErrors !== "object") return null;

  const record = datesErrors as Record<string, unknown>;
  const numericKeys = Object.keys(record)
    .filter((key) => /^\d+$/.test(key))
    .map(Number)
    .sort((a, b) => a - b);

  for (const index of numericKeys) {
    if (firstReactHookFormMessage(record[String(index)])) return index;
  }

  // Array-level issues (e.g. chronological order) live on `dates.message`.
  if (numericKeys.length === 0 && firstReactHookFormMessage(datesErrors)) {
    return 0;
  }

  return null;
}
