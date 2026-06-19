"use client";

import { cn } from "@/lib/utils";
import { FloatingRoomBar } from "@/components/rooms/floating-room-bar";
import { ONBOARDING_PREVIEW_HEADER_OFFSET } from "@/app/(on-boarding)/on-boarding/_components/form-preview/preview-layout-constants";
import type { VendorPreviewRoomRef } from "../_lib/resolve-vendor-preview-room-slices";

type VendorPreviewRoomSelectorProps = {
  rooms: VendorPreviewRoomRef[];
  currentRoomIndex: number;
  onRoomChange: (index: number) => void;
  visible?: boolean;
  /** Sticky below site header (default). `inline` for full-page preview under chrome. */
  layout?: "sticky" | "inline";
  className?: string;
};

/** Room floating bar for vendor event preview. */
export function VendorPreviewRoomSelector({
  rooms,
  currentRoomIndex,
  onRoomChange,
  visible = true,
  layout = "sticky",
  className,
}: VendorPreviewRoomSelectorProps) {
  return (
    <FloatingRoomBar
      rooms={rooms.map((room, index) => ({
        key: `${room.room_id}-${index}`,
        label: room.name || `Room ${index + 1}`,
      }))}
      activeIndex={currentRoomIndex}
      onSelect={onRoomChange}
      visible={visible}
      minRooms={2}
      layout={layout}
      stickyTop={
        layout === "sticky" ? ONBOARDING_PREVIEW_HEADER_OFFSET : undefined
      }
      className={cn("z-[58] mx-auto max-w-7xl sm:px-6", className)}
    />
  );
}
