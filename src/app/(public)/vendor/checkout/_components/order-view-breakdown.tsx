"use client";

import { useMemo } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { EditableDateData } from "@/store/cart-edit.store";
import type { ApiRoomCartData } from "@/lib/types/cart.types";
import {
  parseRoomDateKey,
  getBillableTables,
  getDateGuestCount,
} from "../_lib/cart-calculations";
import { getRoomFloatingAccent } from "@/lib/room-accent-palette";
import { cn } from "@/lib/utils";

interface OrderViewBreakdownProps {
  isOpen: boolean;
  onToggle: () => void;
  formatMoney: (amount: number) => string;
  formatDate: (dateKey: string) => string;
  getRoomName?: (dateKey: string) => string | null;
  rooms?: ApiRoomCartData[];
  dates: Array<{
    key: string;
    dateData: EditableDateData;
    todayAmount: number;
    laterAmount: number;
    fullAmount: number;
  }>;
}

function CategoryDivider({
  label,
  tone,
}: {
  label: string;
  tone: "ticket" | "package" | "table";
}) {
  const pillClass = {
    ticket: "bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_7%,white)] text-[color:var(--checkout-brand-accent)]",
    package: "bg-[color:color-mix(in_srgb,var(--checkout-brand-accent)_7%,white)] text-[color:var(--checkout-brand-accent)]",
    table: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="flex items-center gap-2 pt-1">
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
          pillClass,
        )}
      >
        {label}
      </span>
      <div className="h-px flex-1 bg-[color:var(--checkout-border)]" />
    </div>
  );
}

function BreakdownLineItem({
  label,
  unitPrice,
  unitLabel = "each",
  amount,
  formatMoney,
}: {
  label: string;
  unitPrice?: number;
  unitLabel?: string;
  amount: number;
  formatMoney: (amount: number) => string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5 text-xs">
      <div className="min-w-0">
        <span className="text-[color:var(--checkout-muted-foreground)]">
          {label}
        </span>
        {unitPrice != null && Number.isFinite(unitPrice) && unitPrice > 0 && (
          <span className="mt-0.5 block text-[10px] text-[color:var(--checkout-muted-foreground)]/75">
            {formatMoney(unitPrice)} {unitLabel}
          </span>
        )}
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-[color:var(--checkout-foreground)]">
        {formatMoney(amount)}
      </span>
    </div>
  );
}

function DateBreakdownCard({
  entry,
  formatMoney,
  formatDate,
}: {
  entry: OrderViewBreakdownProps["dates"][number];
  formatMoney: (amount: number) => string;
  formatDate: (dateKey: string) => string;
}) {
  const { dateData, key, fullAmount } = entry;
  const activeTables = getBillableTables(dateData);
  const activeTickets = dateData.tickets.filter((t) => t.quantity > 0);
  const activeDrinks = dateData.drinks.filter((d) => d.quantity > 0);
  const guestCount = getDateGuestCount(dateData);

  return (
    <div className="rounded-xl border border-[color:var(--checkout-border)] bg-white p-3">
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--checkout-border)] pb-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[color:var(--checkout-muted-foreground)]" />
          <span className="font-semibold text-[color:var(--checkout-foreground)]">
            {formatDate(key)}
          </span>
          {guestCount > 0 && (
            <span className="text-[color:var(--checkout-muted-foreground)]">
              · {guestCount} guest{guestCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold tabular-nums text-[color:var(--checkout-foreground)]">
          {formatMoney(fullAmount)}
        </span>
      </div>

      <div className="space-y-2 pt-2.5">
        {activeTickets.length > 0 && (
          <div className="space-y-1">
            <CategoryDivider label="Tickets" tone="ticket" />
            {activeTickets.map((ticket) => (
              <BreakdownLineItem
                key={ticket.id}
                label={`${ticket.title} × ${ticket.quantity}`}
                unitPrice={Number(ticket.price)}
                unitLabel="each"
                amount={ticket.price * ticket.quantity}
                formatMoney={formatMoney}
              />
            ))}
          </div>
        )}

        {activeDrinks.length > 0 && (
          <div className="space-y-1">
            <CategoryDivider label="Packages" tone="package" />
            {activeDrinks.map((drink) => (
              <BreakdownLineItem
                key={drink.id}
                label={`${drink.title} × ${drink.quantity}`}
                unitPrice={Number(drink.price)}
                unitLabel="each"
                amount={drink.price * drink.quantity}
                formatMoney={formatMoney}
              />
            ))}
          </div>
        )}

        {activeTables.length > 0 && (
          <div className="space-y-1">
            <CategoryDivider label="Tables" tone="table" />
            {activeTables.map((table) => {
              const min = table.minPersons || 1;
              const max = table.maxPersons || 999;
              const allocation =
                table.allocation?.length === table.quantity
                  ? table.allocation
                  : Array(table.quantity).fill(min);
              const tableTotal = allocation.reduce((s, g) => s + g, 0);
              const ppp = table.pricePerPerson || table.price;

              return (
                <BreakdownLineItem
                  key={table.id}
                  label={`Tables (${min}–${max}) × ${table.quantity}`}
                  unitPrice={ppp}
                  unitLabel="per guest"
                  amount={ppp * tableTotal}
                  formatMoney={formatMoney}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderViewBreakdown({
  isOpen,
  onToggle,
  formatMoney,
  formatDate,
  rooms = [],
  dates,
}: OrderViewBreakdownProps) {
  const activeDates = dates.filter((d) => d.fullAmount > 0);
  const roomMode = rooms.length > 0;

  const roomGroups = useMemo(() => {
    if (!roomMode) return null;

    return rooms
      .map((room, index) => {
        const roomDates = activeDates.filter((entry) => {
          const { roomId } = parseRoomDateKey(entry.key);
          return roomId === room.room_id;
        });
        if (roomDates.length === 0) return null;

        const roomTotal = roomDates.reduce((sum, d) => sum + d.fullAmount, 0);
        return { room, index, roomDates, roomTotal };
      })
      .filter((group): group is NonNullable<typeof group> => group != null);
  }, [roomMode, rooms, activeDates]);

  return (
    <div className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2 text-left text-sm font-semibold text-[color:var(--checkout-brand-accent)] transition-colors hover:opacity-80"
      >
        <span>View Breakdown</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-[color:var(--checkout-muted-foreground)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[color:var(--checkout-muted-foreground)]" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-[color:var(--checkout-border)] pt-4">
              {activeDates.length === 0 ? (
                <p className="py-2 text-sm text-[color:var(--checkout-muted-foreground)]">
                  Add tables, tickets, or drinks to see your itinerary.
                </p>
              ) : roomMode && roomGroups ? (
                roomGroups.map(({ room, index, roomDates, roomTotal }) => {
                  const accent = getRoomFloatingAccent(index);
                  return (
                    <div key={room.room_id} className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn("h-2 w-2 shrink-0 rounded-full", accent.dot)}
                            aria-hidden
                          />
                          <div className="min-w-0 leading-tight">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--checkout-muted-foreground)]">
                              Room
                            </p>
                            <p className="truncate text-sm font-bold text-[color:var(--checkout-foreground)]">
                              {room.room_name}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-[color:var(--checkout-foreground)]">
                          {formatMoney(roomTotal)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {roomDates.map((entry) => (
                          <DateBreakdownCard
                            key={entry.key}
                            entry={entry}
                            formatMoney={formatMoney}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                activeDates.map((entry) => (
                  <DateBreakdownCard
                    key={entry.key}
                    entry={entry}
                    formatMoney={formatMoney}
                    formatDate={formatDate}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
