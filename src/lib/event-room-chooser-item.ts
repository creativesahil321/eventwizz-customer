/** Shared card model for the in-flow "Choose Your Room" selector. */
export type EventRoomChooserItem = {
  room_id: number;
  name: string;
  /** Position in the room list; used as the active-room index. */
  index: number;
  /** Best available room preview image. */
  thumbnail: string | null;
  /** Lowest positive package/drink price for the room, if any. */
  fromPrice: number | null;
  /** Number of priced packages available in the room. */
  packageCount: number;
  /** Short feature highlights (inclusions or package names). */
  highlights: string[];
  /**
   * True when the room has no bookable dates (empty payload or empty `dates`).
   * Shown in the chooser but not selectable.
   */
  disabled?: boolean;
};

/** First few non-empty titles, trimmed and de-duplicated. */
export function pickRoomHighlights(
  titles: Array<string | null | undefined>,
  limit: number,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of titles) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

export function lowestPositivePrice(
  prices: Array<string | number | null | undefined>,
): number | null {
  const values = prices
    .map((price) => parseFloat(String(price)))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length > 0 ? Math.min(...values) : null;
}

export function resolveRoomThumbnailUrl(
  value: string | File | null | undefined,
): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}
