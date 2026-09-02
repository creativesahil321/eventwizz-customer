import { autoArrangeGuests } from "@/app/(public)/vendor/checkout/_lib/guest-allocation";
import type { ChatBookingTable } from "@/lib/chat-event-booking";

export type ChatSeatingPlanItem = {
  tableId: number;
  minPersons: number;
  maxPersons: number;
  quantity: number;
  allocation: number[];
  price?: number;
};

export function chatTableLabel(table: Pick<ChatBookingTable, "minPersons" | "maxPersons">): string {
  return `Tables ${table.minPersons}–${table.maxPersons}`;
}

export function chatTableKey(
  table: Pick<ChatBookingTable, "id" | "minPersons" | "maxPersons">,
): string {
  return `${table.id ?? 0}:${table.minPersons}-${table.maxPersons}`;
}

export function findTableQuantityForGuests(
  guests: number,
  minPersons: number,
  maxPersons: number,
  stock?: number | null,
): number | null {
  if (guests < 1 || minPersons < 1 || maxPersons < minPersons) return null;
  const cap = stock != null && stock >= 0 ? stock : 40;
  if (cap < 1) return null;
  for (let qty = 1; qty <= cap; qty += 1) {
    if (guests >= minPersons * qty && guests <= maxPersons * qty) return qty;
  }
  return null;
}

function arrangePlan(
  picks: Array<{ table: ChatBookingTable; quantity: number }>,
  guests: number,
): ChatSeatingPlanItem[] | null {
  const usable = picks.filter(
    (pick) => pick.table.id != null && pick.table.id > 0 && pick.quantity > 0,
  );
  if (usable.length === 0) return null;

  const arranged = autoArrangeGuests(
    usable.map(({ table, quantity }) => ({
      id: table.id as number,
      title: chatTableLabel(table),
      minPersons: table.minPersons,
      maxPersons: table.maxPersons,
      quantity,
    })),
    guests,
  );

  const items: ChatSeatingPlanItem[] = usable.map(({ table, quantity }) => ({
    tableId: table.id as number,
    minPersons: table.minPersons,
    maxPersons: table.maxPersons,
    quantity,
    allocation:
      arranged[table.id as number] ?? Array(quantity).fill(table.minPersons),
    price: table.price,
  }));

  const seated = items.reduce(
    (sum, item) => sum + item.allocation.reduce((a, b) => a + b, 0),
    0,
  );
  if (seated !== guests) return null;
  const over = items.some((item) =>
    item.allocation.some(
      (count) => count < item.minPersons || count > item.maxPersons,
    ),
  );
  if (over) return null;
  return items;
}

export function planSingleTableType(
  table: ChatBookingTable,
  guests: number,
): ChatSeatingPlanItem[] | null {
  const qty = findTableQuantityForGuests(
    guests,
    table.minPersons,
    table.maxPersons,
    table.remaining,
  );
  if (qty == null) return null;
  return arrangePlan([{ table, quantity: qty }], guests);
}

export function recommendedChatTablePlan(
  tables: ChatBookingTable[],
  guests: number,
): ChatSeatingPlanItem[] | null {
  if (guests < 1 || tables.length === 0) return null;

  const singles: Array<{ items: ChatSeatingPlanItem[]; tables: number; waste: number }> =
    [];
  for (const table of tables) {
    const items = planSingleTableType(table, guests);
    if (!items) continue;
    const qty = items[0]?.quantity ?? 0;
    const waste = qty * table.maxPersons - guests;
    singles.push({ items, tables: qty, waste });
  }
  singles.sort((a, b) => a.tables - b.tables || a.waste - b.waste);
  if (singles[0]) return singles[0].items;

  for (let i = 0; i < tables.length; i += 1) {
    for (let j = i + 1; j < tables.length; j += 1) {
      const a = tables[i];
      const b = tables[j];
      const aStock = a.remaining ?? 20;
      const bStock = b.remaining ?? 20;
      for (let qa = 0; qa <= aStock; qa += 1) {
        for (let qb = 0; qb <= bStock; qb += 1) {
          if (qa === 0 && qb === 0) continue;
          const min = qa * a.minPersons + qb * b.minPersons;
          const max = qa * a.maxPersons + qb * b.maxPersons;
          if (guests < min || guests > max) continue;
          const picks = [
            ...(qa > 0 ? [{ table: a, quantity: qa }] : []),
            ...(qb > 0 ? [{ table: b, quantity: qb }] : []),
          ];
          const items = arrangePlan(picks, guests);
          if (items) return items;
        }
      }
    }
  }

  return null;
}

export function planFromTablePicks(
  picks: Array<{ table: ChatBookingTable; quantity: number }>,
  guests: number,
): ChatSeatingPlanItem[] | null {
  return arrangePlan(picks, guests);
}

export function formatChatSeatingPlan(
  items: ChatSeatingPlanItem[],
): string {
  return items
    .map((item) => {
      const split = item.allocation.join(", ");
      return `- **${item.quantity} × ${chatTableLabel(item)}** — ${split} guests`;
    })
    .join("\n");
}

export function chatSeatingPlanGuests(items: ChatSeatingPlanItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.allocation.reduce((a, b) => a + b, 0),
    0,
  );
}
