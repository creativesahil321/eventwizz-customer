/**
 * Professional venue-space examples for room-name inputs and unnamed fallbacks.
 * Avoid numbered labels like "Room 1" — they look generic and confuse vendors.
 */
export const ROOM_NAME_EXAMPLES = [
  "Dining Hall",
  "Snowball",
  "Grand Ballroom",
] as const;

export function roomNameExample(index = 0): string {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  return ROOM_NAME_EXAMPLES[i % ROOM_NAME_EXAMPLES.length]!;
}

/** Input hint so vendors know to type a real hall / space name. */
export function roomNamePlaceholder(index = 0): string {
  return `e.g. ${roomNameExample(index)}`;
}

/** Display label when a saved room has no name (never invent a hall). */
export function unnamedRoomLabel(): string {
  return "Untitled space";
}

export function padMinRoomNames(
  names: string[] | undefined,
  min: number,
  max: number,
): string[] {
  const unique = Array.from(
    new Set(
      (names ?? [])
        .map((name) => String(name || "").trim())
        .filter((name) => name.length > 0),
    ),
  ).slice(0, max);

  if (unique.length >= min) return unique;

  const used = new Set(unique.map((name) => name.toLowerCase()));
  const padded = [...unique];
  for (const example of ROOM_NAME_EXAMPLES) {
    if (padded.length >= min) break;
    if (used.has(example.toLowerCase())) continue;
    padded.push(example);
    used.add(example.toLowerCase());
  }
  while (padded.length < min) {
    const next = roomNameExample(padded.length);
    if (!used.has(next.toLowerCase())) {
      padded.push(next);
      used.add(next.toLowerCase());
      continue;
    }
    padded.push(`${next} ${padded.length + 1}`);
  }
  return padded;
}
