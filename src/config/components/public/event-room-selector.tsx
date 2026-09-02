"use client";

import { cn } from "@/lib/utils";
import { FloatingRoomBar } from "@/components/rooms/floating-room-bar";
import type { PublicEventRoomRef } from "@/lib/resolve-public-event-room-slices";

/** Sticky site header height — room bar sits just below CommonHeader. */
export const PUBLIC_EVENT_HEADER_OFFSET = "4.5rem";

type EventRoomSelectorProps = {
  rooms: PublicEventRoomRef[];
  currentRoomIndex: number;
  onRoomChange: (index: number) => void;
  visible?: boolean;
  /** Override when a top strip (e.g. coupon banner) sits above the header. */
  stickyTop?: string;
  className?: string;
};

/** Room floating bar for the live event detail page (multi-room events). */
export function EventRoomSelector({
  rooms,
  currentRoomIndex,
  onRoomChange,
  visible = true,
  stickyTop = PUBLIC_EVENT_HEADER_OFFSET,
  className,
}: EventRoomSelectorProps) {
  return (
    <FloatingRoomBar
      rooms={rooms.map((room, index) => ({
        key: `${room.room_id}-${index}`,
        label: room.name || `Room ${index + 1}`,
        disabled: room.disabled,
      }))}
      activeIndex={currentRoomIndex}
      onSelect={onRoomChange}
      visible={visible}
      minRooms={2}
      layout="sticky"
      stickyTop={stickyTop}
      label="Choose Room"
      size="sm"
      className={cn("mx-auto max-w-7xl sm:px-6", className)}
    />
  );
}
