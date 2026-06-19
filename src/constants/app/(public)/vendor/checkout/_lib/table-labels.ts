/** Checkout table capacity label shown to customers. */
export function formatTableCapacityTitle(
  minPersons: number,
  maxPersons: number,
): string {
  return `Table Capacity – Minimum ${minPersons}, Maximum ${maxPersons}`;
}

/** Shorter label for narrow viewports. */
export function formatTableCapacityCompact(
  minPersons: number,
  maxPersons: number,
): string {
  return `Tables · ${minPersons}–${maxPersons} guests`;
}

/** Parse min/max from legacy or new table title formats. */
export function parseTableCapacityFromTitle(title: string): {
  minPersons: number;
  maxPersons: number;
} | null {
  const newFormat = title.match(/Minimum\s+(\d+),\s+Maximum\s+(\d+)/i);
  if (newFormat) {
    const min = parseInt(newFormat[1], 10);
    const max = parseInt(newFormat[2], 10);
    return { minPersons: Math.min(min, max), maxPersons: Math.max(min, max) };
  }

  const legacyFormat = title.match(/\((\d+)-(\d+)\s+persons?\)/i);
  if (legacyFormat) {
    const min = parseInt(legacyFormat[1], 10);
    const max = parseInt(legacyFormat[2], 10);
    return { minPersons: Math.min(min, max), maxPersons: Math.max(min, max) };
  }

  return null;
}
