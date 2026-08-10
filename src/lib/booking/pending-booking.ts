export type PendingBookingIntent = {
  event_slug: string;
  event_name: string;
  event_image: string;
  event_date: string;
  room_id?: number;
};

const STORAGE_KEY = "ew_pending_booking_intent";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function savePendingBooking(intent: PendingBookingIntent): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // ignore quota / private mode
  }
}

export function peekPendingBooking(): PendingBookingIntent | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBookingIntent;
    if (
      !parsed ||
      typeof parsed.event_slug !== "string" ||
      typeof parsed.event_date !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function consumePendingBooking(): PendingBookingIntent | null {
  const pending = peekPendingBooking();
  if (!canUseStorage()) return pending;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return pending;
}

export function clearPendingBooking(): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
