import type { DoorEntryDateRow } from "@/services/vendor/bookings/type";

function guestLabel(count: number): string {
  return `${count} ${count === 1 ? "guest" : "guests"}`;
}

export function DoorScanDateMerchandise({
  row,
}: {
  row: DoorEntryDateRow;
}) {
  const tickets = row.tickets ?? [];
  const tables = row.tables ?? [];
  const guestCount = row.guest_count ?? 0;

  if (tickets.length === 0 && tables.length === 0 && guestCount <= 0) {
    return null;
  }

  return (
    <div className="space-y-0.5 pt-1.5 text-sm text-muted-foreground">
      {tickets.map((ticket, index) => (
        <p key={`${ticket.name}-${index}`}>
          {ticket.name} × {ticket.quantity}
        </p>
      ))}
      {tables.map((table) => (
        <p key={table.id}>
          {table.name}
          {table.people > 0 ? ` · ${guestLabel(table.people)}` : null}
        </p>
      ))}
      {guestCount > 0 && tables.length > 1 ? (
        <p>{guestLabel(guestCount)} at tables</p>
      ) : null}
    </div>
  );
}
