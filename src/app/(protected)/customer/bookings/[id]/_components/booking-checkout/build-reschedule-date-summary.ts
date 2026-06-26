import type { BookingDateSource } from "./build-line-items";

export interface RescheduleDateSummary {
  date: string;
  people: number;
  tables: number;
  tickets: number;
  drinks: number;
  price: number;
}

export function buildRescheduleDateSummary(
  date: BookingDateSource & { totalAmount: number },
): RescheduleDateSummary {
  const tables = date.tables ?? [];
  const tablePeople = tables.reduce((sum, table) => sum + (table.quantity ?? 0), 0);
  const ticketPeople = (date.tickets ?? []).reduce(
    (sum, ticket) => sum + ticket.quantity,
    0,
  );
  const tableCount = tables.reduce(
    (sum, table) => sum + (table.table_count ?? 1),
    0,
  );
  const drinkCount = (date.packages ?? []).reduce(
    (sum, pkg) => sum + pkg.quantity,
    0,
  );

  return {
    date: date.date,
    people: tablePeople || ticketPeople,
    tables: tableCount,
    tickets: ticketPeople,
    drinks: drinkCount,
    price: date.totalAmount,
  };
}

export function dateHasAddons(date: BookingDateSource): boolean {
  return (date.addons?.total_amount ?? 0) > 0;
}
