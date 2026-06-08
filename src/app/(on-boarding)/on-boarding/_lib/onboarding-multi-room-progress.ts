import { toast } from "sonner";
import type { RoomType } from "../_components/form-provider/schema";
import {
  isRoomSectionComplete,
  type RoomSection,
} from "../_components/rooms/use-room-manager";

/**
 * After a per-room save, move focus to the next room that still needs this section.
 * Returns true when navigation happened (caller should stay on the current step).
 */
export function focusNextIncompleteOnboardingRoom(
  rooms: RoomType[],
  section: RoomSection,
  currentRoomIndex: number,
  setCurrentRoomIndex: (index: number) => void,
): boolean {
  const nextIndex = rooms.findIndex(
    (room) => !isRoomSectionComplete(room, section),
  );
  if (nextIndex === -1) return false;

  if (nextIndex !== currentRoomIndex) {
    setCurrentRoomIndex(nextIndex);
  }
  toast.info("Saved. Continue with the next room.");
  return true;
}
