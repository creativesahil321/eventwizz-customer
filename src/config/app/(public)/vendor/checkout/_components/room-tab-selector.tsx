"use client";

import { DoorOpen, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ApiRoomCartData } from "@/lib/types/cart.types";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { getCheckoutRoomTone } from "../_lib/checkout-room-tones";

interface RoomTabSelectorProps {
  rooms: ApiRoomCartData[];
  activeRoomId: number;
  onRoomChange: (roomId: number) => void;
  /** Client-computed subtotals keyed by room_id (API `room_subtotal` is often 0). */
  roomSubtotals?: Record<number, number>;
  showAddRoom?: boolean;
  addRoomUrl?: string;
}

export default function RoomTabSelector({
  rooms,
  activeRoomId,
  onRoomChange,
  roomSubtotals,
  showAddRoom = false,
  addRoomUrl,
}: RoomTabSelectorProps) {
  const { format: formatMoney } = useCurrencyFormat();

  if (rooms.length === 0) return null;

  const useScrollRow = rooms.length > 2;
  const gridClass = cn(
    useScrollRow
      ? "flex gap-2.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory sm:grid sm:overflow-visible sm:pb-0"
      : "grid gap-2.5 sm:gap-3",
    !useScrollRow && rooms.length === 1 && "grid-cols-1",
    !useScrollRow &&
      rooms.length === 2 &&
      !showAddRoom &&
      "grid-cols-1 min-[420px]:grid-cols-2",
    !useScrollRow &&
      rooms.length === 2 &&
      showAddRoom &&
      addRoomUrl &&
      "grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-[1fr_1fr_auto]",
    useScrollRow &&
      "sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]",
  );

  return (
    <div className={gridClass}>
      {rooms.map((room, index) => {
        const tone = getCheckoutRoomTone(index);
        const isActive = room.room_id === activeRoomId;

        return (
          <button
            key={room.room_id}
            type="button"
            onClick={() => onRoomChange(room.room_id)}
            className={cn(
              "flex min-h-[3.25rem] items-center gap-2.5 rounded-[var(--checkout-radius)] border px-3 py-2.5 text-left transition-all sm:gap-3 sm:px-3.5 sm:py-3",
              useScrollRow &&
                "w-[min(100%,14.5rem)] shrink-0 snap-start sm:w-auto sm:shrink",
              isActive
                ? "border-[color:var(--checkout-brand-primary)] bg-[color:var(--checkout-brand-primary)] text-white shadow-sm"
                : tone.tabInactive,
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--checkout-radius)-2px)] sm:h-9 sm:w-9",
                isActive ? "bg-white/10 text-white" : tone.iconInactive,
              )}
            >
              <DoorOpen className="h-4 w-4" strokeWidth={2} />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-[10px] font-semibold uppercase tracking-[0.14em]",
                  isActive
                    ? "text-white/70"
                    : "text-[color:var(--checkout-muted-foreground)]",
                )}
              >
                Room
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-sm font-semibold leading-tight",
                  isActive ? "text-white" : "text-[color:var(--checkout-foreground)]",
                )}
              >
                {room.room_name}
              </span>
            </span>

            <span
              className={cn(
                "shrink-0 rounded-[calc(var(--checkout-radius)-4px)] px-1.5 py-1 text-xs font-bold tabular-nums leading-none sm:px-2 sm:text-sm",
                isActive
                  ? "border border-white/20 bg-white/10 text-white"
                  : "text-[color:var(--checkout-brand-accent)]",
              )}
            >
              {formatMoney(
                roomSubtotals?.[room.room_id] ?? room.room_subtotal ?? 0,
              )}
            </span>
          </button>
        );
      })}

      {showAddRoom && addRoomUrl && (
        <Link
          href={addRoomUrl}
          className="flex min-h-[3.25rem] items-center justify-center gap-1.5 rounded-[var(--checkout-radius)] border border-dashed border-[color:var(--checkout-brand-accent)]/35 px-3 text-xs font-semibold text-[color:var(--checkout-brand-accent)] transition-colors hover:border-[color:var(--checkout-brand-accent)] hover:bg-blue-50/50 min-[420px]:col-span-1 sm:col-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add room
        </Link>
      )}
    </div>
  );
}
