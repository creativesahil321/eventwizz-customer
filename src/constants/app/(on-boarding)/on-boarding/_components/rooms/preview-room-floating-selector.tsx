"use client";

import { cn } from "@/lib/utils";
import { FloatingRoomBar } from "@/components/rooms/floating-room-bar";
import { useRoomManager } from "./use-room-manager";
import { ONBOARDING_PREVIEW_HEADER_OFFSET } from "../form-preview/preview-layout-constants";

interface PreviewRoomFloatingSelectorProps {
  className?: string;
  visible?: boolean;
}

export function PreviewRoomFloatingSelector({
  className,
  visible = false,
}: PreviewRoomFloatingSelectorProps) {
  const { enabled, rooms, currentRoomIndex, setCurrentRoomIndex } =
    useRoomManager();

  if (!enabled) return null;

  return (
    <FloatingRoomBar
      rooms={rooms.map((room, index) => ({
        key: `${room.id ?? "new"}-${index}`,
        label: room.name || `Room ${index + 1}`,
      }))}
      activeIndex={currentRoomIndex}
      onSelect={setCurrentRoomIndex}
      visible={visible}
      minRooms={1}
      layout="sticky"
      stickyTop={ONBOARDING_PREVIEW_HEADER_OFFSET}
      className={cn("mx-auto max-w-7xl sm:px-6", className)}
    />
  );
}
