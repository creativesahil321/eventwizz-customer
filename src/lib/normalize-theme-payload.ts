import { flattenInfoPages } from "@/lib/flatten-info-pages";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * `/theme/settings` and Site Essentials GET return fonts flat
 * (`typography.heading` / `typography.body`). The app reads
 * `typography.fontFamily.heading` / `.body`. Nested values win.
 */
export function normalizeThemeTypography<T>(data: T): T {
  if (!isRecord(data) || !isRecord(data.typography)) return data;

  const { heading, body, ...rest } = data.typography;
  const fontFamily = isRecord(rest.fontFamily) ? rest.fontFamily : {};
  const resolvedHeading =
    nonEmptyString(fontFamily.heading) ?? nonEmptyString(heading);
  const resolvedBody = nonEmptyString(fontFamily.body) ?? nonEmptyString(body);
  if (!resolvedHeading && !resolvedBody) return data;

  return {
    ...data,
    typography: {
      ...rest,
      fontFamily: {
        ...fontFamily,
        ...(resolvedHeading ? { heading: resolvedHeading } : {}),
        ...(resolvedBody ? { body: resolvedBody } : {}),
      },
    },
  } as T;
}

/** Theme / Site Essentials GET → shape the rest of the app already reads. */
export function normalizeThemePayload<T>(data: T): T {
  return normalizeThemeTypography(flattenInfoPages(data));
}
