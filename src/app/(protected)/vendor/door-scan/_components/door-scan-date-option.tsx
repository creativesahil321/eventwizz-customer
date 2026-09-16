import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { DoorEntryDateRow } from "@/services/vendor/bookings/type";
import {
  doorEntryDateBadge,
  doorEntryDateHint,
  doorEntryDateTone,
  getDoorEntryDateKind,
} from "../_lib/door-entry-date-kind";
import {
  formatDoorEntryDate,
  formatDoorEntryDateTime,
} from "../_lib/format-door-entry-date";
import { DoorScanDateMerchandise } from "./door-scan-date-merchandise";

export function DoorScanDateOption({
  row,
  selected,
  isVenueToday,
}: {
  row: DoorEntryDateRow;
  selected: boolean;
  isVenueToday: boolean;
}) {
  const id = String(row.booking_date_id);
  const kind = getDoorEntryDateKind(row);
  const badge = doorEntryDateBadge(kind);
  const hint = doorEntryDateHint(kind);
  const showBackendLabel = kind === "blocked" && row.entry_label.trim() !== "";

  return (
    <Label
      htmlFor={`door-date-${id}`}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 font-normal",
        doorEntryDateTone(kind),
        selected && row.can_check_in && "ring-2 ring-[var(--color-primary)]",
        !row.can_check_in && "cursor-not-allowed",
      )}
    >
      <RadioGroupItem
        id={`door-date-${id}`}
        value={id}
        disabled={!row.can_check_in}
        className="mt-1"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{formatDoorEntryDate(row.booking_date)}</span>
          {isVenueToday && kind !== "ready" ? (
            <Badge variant="outline">Today</Badge>
          ) : null}
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
        </div>
        {row.room_name ? (
          <p className="text-sm text-muted-foreground">{row.room_name}</p>
        ) : null}
        {hint ? <p className="text-sm">{hint}</p> : null}
        {showBackendLabel ? (
          <p className="text-sm text-muted-foreground">{row.entry_label}</p>
        ) : null}
        <DoorScanDateMerchandise row={row} />
        {row.checked_in_at ? (
          <p className="text-xs text-muted-foreground">
            Checked in {formatDoorEntryDateTime(row.checked_in_at)}
          </p>
        ) : null}
      </div>
    </Label>
  );
}
