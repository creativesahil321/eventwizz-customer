/** Encode / decode event-scoped room keys used in the discount form */
export function toRoomKey(eventId: number, roomId: number) {
  return `${eventId}:${roomId}`;
}

export function parseRoomKey(key: string): {
  eventId: number;
  roomId: number;
} | null {
  const [e, r] = String(key).split(":");
  const eventId = Number(e);
  const roomId = Number(r);
  if (!Number.isFinite(eventId) || !Number.isFinite(roomId)) return null;
  return { eventId, roomId };
}
