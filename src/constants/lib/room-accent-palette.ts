/** Shared per-room dot colors for floating room selectors (Lovable / Stock Brook style). */
export const ROOM_FLOATING_ACCENTS = [
  { dot: "bg-emerald-500" },
  { dot: "bg-sky-500" },
  { dot: "bg-violet-500" },
  { dot: "bg-amber-500" },
  { dot: "bg-orange-500" },
  { dot: "bg-rose-500" },
] as const;

export type RoomFloatingAccent = (typeof ROOM_FLOATING_ACCENTS)[number];

export function getRoomFloatingAccent(index: number): RoomFloatingAccent {
  return ROOM_FLOATING_ACCENTS[index % ROOM_FLOATING_ACCENTS.length];
}
