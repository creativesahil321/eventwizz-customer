/** 00:00–05:59 after an evening start is the finish, not the public start. */
export const OVERNIGHT_END_MINUTES = 6 * 60;

const HHMM = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const AMPM = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/;

/** Public clocks stay 24-hour (`19:00`). Invalid / empty input is omitted. */
export function formatPublicClock24h(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || trimmed.toUpperCase() === "TBD") return null;

  const twentyFour = trimmed.match(HHMM);
  if (twentyFour) {
    const hours = Number.parseInt(twentyFour[1], 10);
    const minutes = Number.parseInt(twentyFour[2], 10);
    if (hours > 23 || minutes > 59) return null;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const ampm = trimmed.match(AMPM);
  if (ampm) {
    let hours = Number.parseInt(ampm[1], 10);
    const minutes = Number.parseInt(ampm[2], 10);
    if (hours > 12 || minutes > 59) return null;
    const isPm = ampm[3].toLowerCase() === "pm";
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  return null;
}

export function clockToMinutes(hhmm: string): number | null {
  const parsed = formatPublicClock24h(hhmm);
  if (!parsed) return null;
  const [hours, minutes] = parsed.split(":").map(Number);
  return hours * 60 + minutes;
}

export function scheduleHasEveningStart(times: string[]): boolean {
  return times.some((time) => {
    const minutes = clockToMinutes(time);
    return minutes != null && minutes >= 12 * 60;
  });
}

export function scheduleHasOvernightEnd(times: string[]): boolean {
  if (!scheduleHasEveningStart(times)) return false;
  return times.some((time) => {
    const minutes = clockToMinutes(time);
    return minutes != null && minutes < OVERNIGHT_END_MINUTES;
  });
}

export function scheduleSortMinutes(raw: string, overnight: boolean): number {
  const minutes = clockToMinutes(raw);
  if (minutes == null) return Number.POSITIVE_INFINITY;
  return overnight && minutes < OVERNIGHT_END_MINUTES
    ? minutes + 24 * 60
    : minutes;
}

export function nowScheduleMinutes(
  overnight: boolean,
  now: Date = new Date(),
): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return overnight && minutes < OVERNIGHT_END_MINUTES
    ? minutes + 24 * 60
    : minutes;
}

export function sortScheduleRows<T extends { time: string }>(rows: T[]): T[] {
  const times = rows.map((row) => row.time);
  const overnight = scheduleHasOvernightEnd(times);
  return [...rows].sort(
    (a, b) =>
      scheduleSortMinutes(a.time, overnight) -
      scheduleSortMinutes(b.time, overnight),
  );
}

/** Keep a valid 24-hour clock; never invent midday for a blank or broken time. */
export function normalizeScheduleClock(
  raw: string | null | undefined,
): string {
  return formatPublicClock24h(raw) ?? "";
}
