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

/**
 * Room picker as full-width horizontal rows — readable on mobile,
 * not cramped two-column tiles or tiny pills.
 */
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

  const showAdd = Boolean(showAddRoom && addRoomUrl);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--checkout-muted-foreground)]">
        Rooms
      </p>
      <div className="flex flex-col gap-2">
        {rooms.map((room, index) => {
          const tone = getCheckoutRoomTone(index);
          const isActive = room.room_id === activeRoomId;
          const subtotal =
            roomSubtotals?.[room.room_id] ?? room.room_subtotal ?? 0;

          return (
            <button
              key={room.room_id}
              type="button"
              onClick={() => onRoomChange(room.room_id)}
              aria-pressed={isActive}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                "active:scale-[0.99]",
                isActive
                  ? "border-[color:var(--checkout-brand-primary)] bg-[color:var(--checkout-brand-primary)] text-white shadow-sm"
                  : tone.tabInactive,
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isActive ? "bg-white/15 text-white" : tone.iconInactive,
                )}
              >
                <DoorOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm font-semibold leading-tight",
                    isActive
                      ? "text-white"
                      : "text-[color:var(--checkout-foreground)]",
                  )}
                >
                  {room.room_name}
                </span>
              </span>

              <span
                className={cn(
                  "shrink-0 text-sm font-bold tabular-nums",
                  isActive
                    ? "text-white"
                    : "text-[color:var(--checkout-brand-accent)]",
                )}
              >
                {formatMoney(subtotal)}
              </span>
            </button>
          );
        })}

        {showAdd && addRoomUrl ? (
          <Link
            href={addRoomUrl}
            className={cn(
              "flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed",
              "border-[color:var(--checkout-brand-accent)]/40 px-3 py-2.5",
              "text-sm font-semibold text-[color:var(--checkout-brand-accent)]",
              "transition-colors hover:border-[color:var(--checkout-brand-accent)] hover:bg-blue-50/50",
            )}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add room
          </Link>
        ) : null}
      </div>
    </div>
  );
}
