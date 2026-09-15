import { format, isValid, parseISO } from "date-fns";

function parseDoorEntryDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoCandidate = trimmed.includes("T")
    ? trimmed
    : /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? `${trimmed}T12:00:00`
      : trimmed;
  const iso = parseISO(isoCandidate);
  if (isValid(iso)) return iso;

  const dmy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) {
    const parsed = parseISO(`${dmy[3]}-${dmy[2]}-${dmy[1]}T12:00:00`);
    if (isValid(parsed)) return parsed;
  }

  return null;
}

export function formatDoorEntryDate(value: string): string {
  const parsed = parseDoorEntryDate(value);
  return parsed ? format(parsed, "EEE d MMM yyyy") : value;
}

export function formatDoorEntryDateTime(value: string): string {
  const parsed = parseDoorEntryDate(value);
  return parsed ? format(parsed, "d MMM yyyy, HH:mm") : value;
}
