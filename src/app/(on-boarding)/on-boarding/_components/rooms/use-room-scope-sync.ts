"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useFormContext } from "../form-provider";
import type {
  StepFiveType,
  StepSixType,
  StepSevenType,
  RoomType,
} from "../form-provider/schema";
import {
  isRoomSectionComplete,
  useRoomManager,
  type RoomSection,
} from "./use-room-manager";

/**
 * Maps a {@link RoomSection} to the matching `multiSpace.rooms[i].*` slot key and the matching
 * `step*` global key. Centralised so steps 5/6/7 can share logic without each one re-deriving
 * its scope manually.
 */
const SECTION_MAP = {
  package: { roomKey: "package", stepKey: "stepFour", approvalKey: "isApprovedPackage" },
  dates: { roomKey: "dates", stepKey: "stepFive", approvalKey: "isApprovedDates" },
  catering: { roomKey: "catering", stepKey: "stepSix", approvalKey: "isApprovedCatering" },
  brochure: { roomKey: "brochure", stepKey: "stepSeven", approvalKey: "isApprovedBrochure" },
  drinks: { roomKey: "drinks", stepKey: "stepEight", approvalKey: "isApprovedDrinks" },
} as const;

const cloneRoomDatesSection = (
  dates: RoomType["dates"] | undefined,
): RoomType["dates"] => {
  return JSON.parse(JSON.stringify(dates ?? { dates: [] })) as RoomType["dates"];
};

interface RoomScopeSyncReturn {
  /** True when multi-room mode is active and the form should be treated as room-scoped. */
  isMultiRoom: boolean;
  /** The active room (undefined when multi-room mode is off). */
  currentRoom: RoomType | undefined;
  /** Backend room id for the active room, if it exists. */
  currentRoomId: number | undefined;
  /** Persisted approval flag for the current section/room (or `stepX.isApproved` in single mode). */
  persistedApproved: boolean;
  /**
   * Persist the current step data. In single-room mode, calls the legacy `singleRoomSave` you pass.
   * In multi-room mode, lazily creates the room (if needed) then dispatches to the room-scoped
   * endpoint via {@link roomService}. Returns `true` when the save succeeded so callers can advance.
   */
  saveSection: (args: {
    /** Latest form values for the current step. The shape matches `stepFive|Six|Seven`. */
    stepData: StepFiveType | StepSixType | StepSevenType;
    /** Callback for the legacy single-room save path; only called when not in multi-room mode. */
    singleRoomSave: () => Promise<boolean>;
    /** Optional callback after a successful multi-room save (e.g. update local state). */
    onMultiRoomSuccess?: () => void;
    /** When true, mirror the active room payload into other incomplete rooms before saving. */
    applyToAllRooms?: boolean;
  }) => Promise<boolean>;
}

/**
 * Hook used by Steps 5/6/7 to participate in the multi-room system.
 *
 * Why this hook exists:
 *  - The step components already write to `stepFive|Six|Seven` paths in many places. Refactoring
 *    them to a fully scoped path would be invasive and risky.
 *  - Instead, this hook keeps the global `stepX` slot in sync with the active room's data: when
 *    the user switches room tab, the step's slot is rehydrated from `multiSpace.rooms[i]`. When
 *    the user saves, the slot is mirrored back into `multiSpace.rooms[i]` and dispatched to the
 *    room-scoped endpoint.
 *  - Single-room behavior is fully preserved: when `enabled` is false, this hook is a no-op apart
 *    from forwarding to the caller-supplied `singleRoomSave`.
 */
export function useRoomScopeSync(section: RoomSection): RoomScopeSyncReturn {
  const { form: globalForm } = useFormContext();
  const { enabled, rooms, currentRoomIndex } = useRoomManager();
  const isMultiRoom = enabled && rooms.length > 0;
  const currentRoom = rooms[currentRoomIndex];
  const currentRoomId = currentRoom?.id;
  const { roomKey, stepKey, approvalKey } = SECTION_MAP[section];

  // Track the previous active room index so we know whether to re-hydrate. We use index
  // (not object identity) because `currentRoom` is a fresh object reference on every render.
  const prevIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isMultiRoom) {
      prevIndexRef.current = null;
      return;
    }

    // 1. Before hydrating the new room, write any unsaved step data BACK into the previous
    //    room's slot so users don't lose work when switching tabs without saving.
    const prevIndex = prevIndexRef.current;
    if (
      prevIndex !== currentRoomIndex &&
      prevIndex !== null &&
      prevIndex >= 0 &&
      prevIndex < rooms.length &&
      prevIndex !== currentRoomIndex
    ) {
      const stepValues = globalForm.getValues(stepKey as never) as
        | Record<string, unknown>
        | undefined;
      if (stepValues && typeof stepValues === "object") {
        // Strip wizard-level keys before persisting into the room slot.
        const {
          step: _step,
          event_id: _eventId,
          isApproved: _isApproved,
          ...sectionPayload
        } = stepValues as Record<string, unknown> & {
          step?: number;
          event_id?: number;
          isApproved?: boolean;
        };
        void _step;
        void _eventId;
        void _isApproved;
        globalForm.setValue(
          `multiSpace.rooms.${prevIndex}.${roomKey}` as never,
          sectionPayload as never,
          { shouldDirty: false },
        );
      }
    }

    // 2. Mirror the active room's section data into the `step*` slot so the form (which
    //    still binds to that slot) reflects the new room. We merge with existing defaults
    //    so type-required fields like `event_id` / `step` aren't wiped.
    const fromRoom = (currentRoom?.[roomKey] ?? {}) as Record<string, unknown>;
    const existing = (globalForm.getValues(stepKey as never) ??
      {}) as Record<string, unknown>;
    const merged = { ...existing, ...fromRoom };
    if (JSON.stringify(existing) !== JSON.stringify(merged)) {
      globalForm.setValue(
        stepKey as never,
        merged as never,
        { shouldDirty: false },
      );
    }
    prevIndexRef.current = currentRoomIndex;
  }, [
    isMultiRoom,
    currentRoomIndex,
    currentRoom,
    globalForm,
    roomKey,
    stepKey,
    rooms.length,
  ]);

  const persistedApproved = isMultiRoom
    ? Boolean(currentRoom?.[approvalKey])
    : Boolean(
      (globalForm.getValues(stepKey as never) as { isApproved?: boolean })
        ?.isApproved,
    );

  const saveSection = useCallback<RoomScopeSyncReturn["saveSection"]>(
    async ({ stepData, singleRoomSave, onMultiRoomSuccess, applyToAllRooms = false }) => {
      if (!isMultiRoom) {
        return singleRoomSave();
      }

      const eventId = (stepData as { event_id?: number }).event_id ?? 0;
      if (!eventId || eventId <= 0) {
        toast.error("Event ID is missing. Please refresh and try again.");
        return false;
      }

      const allRooms =
        (globalForm.getValues("multiSpace")?.rooms as RoomType[] | undefined) ??
        rooms;
      const { step: _step, event_id: _eventId, isApproved: _approved, ...currentSectionPayload } =
        stepData as Record<string, unknown> & {
          step?: number;
          event_id?: number;
          isApproved?: boolean;
        };
      void _step;
      void _eventId;
      void _approved;

      // Ensure the active room contributes its latest in-form values to the aggregate payload
      // before we send room-scoped step saves.
      const stagedRooms = allRooms.map((room, index) => {
        const isActiveRoom = index === currentRoomIndex;

        if (isActiveRoom) {
          return {
            ...room,
            [roomKey]: currentSectionPayload,
            [approvalKey]: true,
          } as RoomType;
        }

        // Per-room save: keep other rooms on their last persisted API snapshot so
        // unsaved tab edits (e.g. deposit toggled off) are not sent to the backend.
        if (!applyToAllRooms && section === "dates") {
          if (
            room.isApprovedDates &&
            room.persistedDates?.dates &&
            room.persistedDates.dates.length > 0
          ) {
            return {
              ...room,
              dates: cloneRoomDatesSection(room.persistedDates),
            };
          }

          // Never-configured rooms can pick up blank default rows from tab switches.
          // Send persisted snapshot or an empty dates array instead of placeholders.
          if (!isRoomSectionComplete(room, section)) {
            return {
              ...room,
              dates: cloneRoomDatesSection(
                room.persistedDates ?? { dates: [] },
              ),
            };
          }
        }

        if (applyToAllRooms && !isRoomSectionComplete(room, section)) {
          return {
            ...room,
            [roomKey]: currentSectionPayload,
            [approvalKey]: true,
          } as RoomType;
        }

        return room;
      });
      const missingRoomId = stagedRooms.some((room) => !room?.id);
      if (missingRoomId) {
        toast.error(
          "Please create rooms in Step 4 before editing room-specific steps.",
        );
        return false;
      }
      const roomsWithIds = stagedRooms as RoomType[];

      const currentMultiSpace = globalForm.getValues("multiSpace");
      if (currentMultiSpace) {
        globalForm.setValue("multiSpace", {
          ...currentMultiSpace,
          rooms: roomsWithIds,
        });
      }

      let response;
      const activeRoomOnly = [roomsWithIds[currentRoomIndex]];
      const roomsToSave = applyToAllRooms ? roomsWithIds : activeRoomOnly;
      const allRoomsCompleteForSection = roomsWithIds.every((room) =>
        isRoomSectionComplete(room, section),
      );

      // Always mirror the latest active-room payload locally so room switching keeps data stable
      // even before the aggregate API call runs.
      globalForm.setValue(
        `multiSpace.rooms.${currentRoomIndex}.${roomKey}` as never,
        currentSectionPayload as never,
      );
      globalForm.setValue(
        `multiSpace.rooms.${currentRoomIndex}.${approvalKey}` as never,
        true as never,
      );

      switch (section) {
        case "dates": {
          // Backend replaces the full step-5 rooms[] graph — always send every room.
          if (applyToAllRooms && !allRoomsCompleteForSection) {
            onMultiRoomSuccess?.();
            return true;
          }

          response = await onboardingService.storeStepFiveRoomsData({
            event_id: eventId,
            rooms: roomsWithIds,
            isApproved: true,
          });

          if (response?.status) {
            roomsWithIds.forEach((room, index) => {
              globalForm.setValue(
                `multiSpace.rooms.${index}.persistedDates` as never,
                cloneRoomDatesSection(room.dates) as never,
              );
            });
          }
          break;
        }
        case "catering": {
          response = await onboardingService.storeStepSixRoomsData({
            event_id: eventId,
            rooms: roomsToSave,
            isApproved: true,
          });
          break;
        }
        case "brochure": {
          const data = stepData as StepSevenType;
          response = await onboardingService.storeStepSevenRoomsData({
            event_id: eventId,
            event_address: data.event_address ?? "",
            latitude: data.latitude,
            longitude: data.longitude,
            rooms: roomsToSave,
            isApproved: true,
          });
          break;
        }
        default:
          return singleRoomSave();
      }

      if (!response?.status) {
        return false;
      }

      if (section === "brochure") {
        globalForm.setValue("stepSeven.event_address", (stepData as StepSevenType).event_address ?? "");
      }

      onMultiRoomSuccess?.();
      return true;
    },
    [
      isMultiRoom,
      section,
      globalForm,
      currentRoomIndex,
      roomKey,
      approvalKey,
      rooms,
    ],
  );

  return {
    isMultiRoom,
    currentRoom,
    currentRoomId,
    persistedApproved,
    saveSection,
  };
}
