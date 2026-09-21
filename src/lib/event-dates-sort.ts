export const DUPLICATE_EVENT_DATE_MESSAGE =
  "Duplicate event dates are not allowed. Each date must be unique.";

/** Compare YYYY-MM-DD strings; empty values sort to the end. */
export function compareEventDateStrings(
  a: string | undefined | null,
  b: string | undefined | null,
): number {
  const valueA = a?.trim() ?? "";
  const valueB = b?.trim() ?? "";

  if (!valueA && !valueB) return 0;
  if (!valueA) return 1;
  if (!valueB) return -1;

  const timeA = new Date(`${valueA}T00:00:00`).getTime();
  const timeB = new Date(`${valueB}T00:00:00`).getTime();

  if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
  if (Number.isNaN(timeA)) return 1;
  if (Number.isNaN(timeB)) return -1;

  return timeA - timeB;
}

/** Sort field-array rows by event_date while preserving react-hook-form `id`s. */
export function sortDateFieldArrayWithIds<T extends { event_date?: string }>(
  fields: Array<{ id: string }>,
  dates: T[],
): Array<T & { id: string }> {
  return fields
    .map((field, index) => ({
      ...dates[index],
      id: field.id,
    }))
    .sort((a, b) => compareEventDateStrings(a.event_date, b.event_date));
}

export function hasEventDateOrderChanged<T extends { event_date?: string }>(
  dates: T[],
  sorted: T[],
): boolean {
  return sorted.some(
    (date, index) => date.event_date !== dates[index]?.event_date,
  );
}

export function normalizeEventDateKey(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Indexes of every date that shares its `event_date` with at least one other row.
 * Empty dates are ignored. Optionally skip rows (e.g. cancelled vendor dates).
 */
export function duplicateEventDateIndexes(
  dates: Array<{ event_date?: unknown } | null | undefined>,
  options?: { skipIndex?: (index: number) => boolean },
): number[] {
  const byKey = new Map<string, number[]>();

  dates.forEach((date, index) => {
    if (options?.skipIndex?.(index)) return;
    const key = normalizeEventDateKey(date?.event_date);
    if (!key) return;
    const list = byKey.get(key);
    if (list) list.push(index);
    else byKey.set(key, [index]);
  });

  return [...byKey.values()]
    .filter((indexes) => indexes.length > 1)
    .flat()
    .sort((a, b) => a - b);
}
