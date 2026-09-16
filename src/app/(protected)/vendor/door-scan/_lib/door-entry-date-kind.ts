import type { DoorEntryDateRow } from "@/services/vendor/bookings/type";

export type DoorEntryDateKind =
  | "ready"
  | "not_tonight"
  | "checked_in"
  | "not_paid"
  | "cancelled"
  | "refunded"
  | "blocked";

function haystack(row: DoorEntryDateRow): string {
  return `${row.entry_status ?? ""} ${row.entry_label}`.toLowerCase();
}

export function getDoorEntryDateKind(row: DoorEntryDateRow): DoorEntryDateKind {
  if (row.can_check_in) return "ready";

  const text = haystack(row);
  if (text.includes("not_tonight") || text.includes("not tonight") || text.includes("not today")) {
    return "not_tonight";
  }
  if (text.includes("checked")) return "checked_in";
  if (text.includes("refund")) return "refunded";
  if (text.includes("cancel")) return "cancelled";
  if (
    text.includes("not_paid") ||
    text.includes("unpaid") ||
    text.includes("not paid") ||
    text.includes("not fully paid")
  ) {
    return "not_paid";
  }
  return "blocked";
}

export function doorEntryDateTone(kind: DoorEntryDateKind): string {
  switch (kind) {
    case "ready":
      return "border-emerald-200 bg-emerald-50/70";
    case "checked_in":
      return "border-sky-200 bg-sky-50/70";
    case "not_paid":
    case "cancelled":
    case "refunded":
      return "border-rose-200 bg-rose-50/70";
    default:
      return "border-[var(--color-border)] bg-muted/40";
  }
}

export function doorEntryDateBadge(kind: DoorEntryDateKind): {
  label: string;
  variant: "primary" | "outline" | "destructive" | "secondary";
} | null {
  switch (kind) {
    case "ready":
      return { label: "Today", variant: "primary" };
    case "not_tonight":
      return { label: "Not today", variant: "outline" };
    case "checked_in":
      return { label: "Checked in", variant: "secondary" };
    case "not_paid":
      return { label: "Unpaid", variant: "destructive" };
    case "cancelled":
      return { label: "Cancelled", variant: "destructive" };
    case "refunded":
      return { label: "Refunded", variant: "destructive" };
    default:
      return null;
  }
}

export function doorEntryDateHint(kind: DoorEntryDateKind): string | null {
  switch (kind) {
    case "ready":
      return "Ready to check in now.";
    case "not_tonight":
      return "Come back on this date to check in.";
    case "not_paid":
      return "This date must be paid before door entry.";
    default:
      return null;
  }
}

export function doorScanConfirmHint(dates: DoorEntryDateRow[]): string | null {
  if (dates.some((row) => row.can_check_in)) {
    return "This admits the whole booking for today's date.";
  }

  const kinds = dates.map(getDoorEntryDateKind);
  const hasCheckedIn = kinds.includes("checked_in");
  const hasNotTonight = kinds.includes("not_tonight");
  const hasUnpaid = kinds.includes("not_paid");

  if (hasCheckedIn && hasNotTonight) {
    return "Today is already checked in. Other dates open on their event day.";
  }
  if (hasNotTonight) {
    return "None of these dates is today. Check-in opens on the event day.";
  }
  if (hasCheckedIn) {
    return "This guest is already checked in for the dates that allow entry.";
  }
  if (hasUnpaid) {
    return "Today's date is not fully paid, so this guest cannot be admitted yet.";
  }
  return "This guest cannot be checked in right now.";
}
