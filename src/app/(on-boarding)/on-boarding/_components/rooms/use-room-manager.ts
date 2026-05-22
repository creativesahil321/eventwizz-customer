"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { useFormContext } from "../form-provider";
import {
  MAX_ROOMS,
  type MultiSpaceType,
  type RoomType,
} from "../form-provider/schema";
import { roomService } from "@/services/vendor/onboarding/room.service";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";

const ONBOARDING_IS_ROOMS_STORAGE_KEY = "onboarding_is_rooms";

/**
 * Slot in `roomSchema` that a wizard step writes into.
 * Mirrors the four wizard steps the multi-space system fans out per room.
 */
export type RoomSection = "package" | "dates" | "catering" | "brochure";

/**
 * Approval flag key on `RoomType` for a given section.
 * Centralised so step components don't ad-hoc concat strings.
 */
export const roomApprovalKey = (
  section: RoomSection,
):
  | "isApprovedPackage"
  | "isApprovedDates"
  | "isApprovedCatering"
  | "isApprovedBrochure" => {
  switch (section) {
    case "package":
      return "isApprovedPackage";
    case "dates":
      return "isApprovedDates";
    case "catering":
      return "isApprovedCatering";
    case "brochure":
      return "isApprovedBrochure";
  }
};

export const isRoomSectionComplete = (
  room: RoomType,
  section: RoomSection,
): boolean => {
  if (section === "package") {
    const pkg = room.package;
    const hasImage = Boolean(
      pkg?.package_image &&
      ((typeof pkg.package_image === "string" && pkg.package_image.length > 0) ||
        pkg.package_image instanceof File),
    );
    const hasTitle = String(pkg?.package_title ?? "").trim().length > 0;
    const hasDescription = String(pkg?.package_description ?? "").trim().length > 0;
    const hasButton = String(pkg?.package_button_name ?? "").trim().length > 0;
    const hasDetails = Array.isArray(pkg?.package_details)
      ? pkg.package_details.some(
        (detail) => String(detail?.title ?? "").trim().length > 0,
      )
      : false;
    return (
      hasImage &&
      hasTitle &&
      hasDescription &&
      hasButton &&
      hasDetails
    );
  }

  if (section === "dates") {
    const roomDates = room.dates?.dates;
    if (!Array.isArray(roomDates) || roomDates.length === 0) return false;
    return roomDates.some(
      (date) => String((date as { event_date?: unknown })?.event_date ?? "").trim().length > 0,
    );
  }

  if (section === "catering") {
    const catering = room.catering;
    if (!catering) return false;
    const option = Number(catering.catering_option ?? 0);
    if (option === 0) return true;
    return Array.isArray(catering.menus) && catering.menus.length > 0;
  }

  const brochure = room.brochure;
  if (!brochure) return false;
  const hasAddress = String(brochure.event_address ?? "").trim().length > 0;
  const hasBrochurePdf = Boolean(
    brochure.brochure_pdf &&
    ((typeof brochure.brochure_pdf === "string" &&
      brochure.brochure_pdf.length > 0) ||
      brochure.brochure_pdf instanceof File),
  );
  return hasAddress && hasBrochurePdf;
};

const blankRoom = (name: string): RoomType => ({
  name,
  package: {
    package_image: null,
    package_title: "",
    package_description: "",
    package_button_name: "",
    package_details: [{ title: "" }],
    event_schedular_title: "",
    event_schedule_subtitle: "",
    event_schedular: [],
    gallery: [],
  },
  dates: { dates: [] },
  catering: {
    catering_option: 0,
    menu_title: "",
    menu_description: "",
    event_menu_category_id: 0,
    menus: [],
  },
  brochure: {
    brochure_pdf: null,
    brochure_pdf_2: null,
    faq_pdf: null,
    event_address: "",
    price_start_from: "",
    location: { title: "LOCATION", description: "", icon: "MapPin" },
    downloads: [],
    more_info: [],
  },
});

/**
 * Single source of truth for the multi-room ("event spaces") feature.
 *
 * Reads/writes `globalForm.multiSpace`. All reads use {@link useWatch} so consumers re-render
 * the moment the user toggles, switches a tab, or renames/adds/removes a room. All writes go
 * through `globalForm.setValue("multiSpace", …)` to keep RHF + Zod in sync.
 *
 * Invariants this hook enforces:
 *  - At most {@link MAX_ROOMS} rooms.
 *  - When the toggle is flipped to `true`, at least one room exists (auto-seeded "Room 1").
 *  - `currentRoomIndex` is always within `[0, rooms.length - 1]` (clamped on remove).
 */
export function useRoomManager() {
  const { form } = useFormContext();
  const didHydrateRoomsRef = useRef(false);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const multiSpace = useWatch({
    control: form.control,
    name: "multiSpace",
  }) as MultiSpaceType | undefined;

  const rooms = useMemo<RoomType[]>(
    () => multiSpace?.rooms ?? [],
    [multiSpace?.rooms],
  );

  const enabled = multiSpace?.enabled === true;
  const currentRoomIndex = Math.min(
    multiSpace?.currentRoomIndex ?? 0,
    Math.max(rooms.length - 1, 0),
  );
  const currentRoom: RoomType | undefined = rooms[currentRoomIndex];

  // Hydrate rooms from backend list API when multi-space is enabled and local rooms are empty.
  useEffect(() => {
    if (!enabled) {
      didHydrateRoomsRef.current = false;
      setRoomsLoading(false);
      return;
    }
    if (didHydrateRoomsRef.current) return;
    if (rooms.length > 0) {
      didHydrateRoomsRef.current = true;
      setRoomsLoading(false);
      return;
    }

    didHydrateRoomsRef.current = true;
    setRoomsLoading(true);
    void roomService
      .listVendorRooms()
      .then((res) => {
        const data = res?.data ?? [];
        if (!Array.isArray(data) || data.length === 0) return;
        const current = (form.getValues("multiSpace") ??
          ({
            enabled: true,
            currentRoomIndex: 0,
            rooms: [],
          } as MultiSpaceType)) as MultiSpaceType;

        const existingRooms = current.rooms ?? [];
        const findExistingRoom = (roomId: number, roomName: string): RoomType | undefined => {
          if (Number.isFinite(roomId) && roomId > 0) {
            const byId = existingRooms.find((x) => Number(x.id) === roomId);
            if (byId) return byId;
          }
          const normalized = roomName.trim().toLowerCase();
          if (!normalized) return undefined;
          return existingRooms.find(
            (x) => String(x.name ?? "").trim().toLowerCase() === normalized,
          );
        };

        // Critical: preserve already-hydrated room payloads (package/dates/catering/brochure).
        // The room list endpoint only returns id/name, so replacing with blank rooms causes
        // intermittent empty tabs until full page refresh.
        const mergedRooms: RoomType[] = data
          .slice(0, MAX_ROOMS)
          .map((r, index) => {
            const id = Number(r.id);
            const name = String(r?.name ?? "").trim() || `Room ${index + 1}`;
            const existing = findExistingRoom(id, name);

            return {
              ...blankRoom(name),
              ...(existing ?? {}),
              id: Number.isFinite(id) && id > 0 ? id : existing?.id,
              name,
            };
          });

        if (mergedRooms.length === 0) return;

        form.setValue(
          "multiSpace",
          {
            ...current,
            enabled: true,
            currentRoomIndex: Math.min(
              current.currentRoomIndex ?? 0,
              Math.max(mergedRooms.length - 1, 0),
            ),
            rooms: mergedRooms,
          },
          { shouldDirty: false, shouldTouch: false },
        );
      })
      .catch((err) => {
        console.error("Failed to hydrate vendor rooms:", err);
      })
      .finally(() => {
        setRoomsLoading(false);
      });
  }, [enabled, rooms.length, form]);

  const writeMultiSpace = useCallback(
    (next: MultiSpaceType) => {
      form.setValue("multiSpace", next, {
        shouldDirty: true,
        shouldTouch: false,
      });
    },
    [form],
  );

  const setEnabled = useCallback(
    (next: boolean) => {
      const current = (form.getValues("multiSpace") ??
        { enabled: false, currentRoomIndex: 0, rooms: [] }) as MultiSpaceType;

      if (next === current.enabled) return;

      writeMultiSpace({
        enabled: next,
        currentRoomIndex: next ? 0 : current.currentRoomIndex,
        rooms: current.rooms,
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          ONBOARDING_IS_ROOMS_STORAGE_KEY,
          next ? "true" : "false",
        );
      }
      void onboardingService.notifyDataChanged();
    },
    [form, writeMultiSpace],
  );

  const setCurrentRoomIndex = useCallback(
    (index: number) => {
      const current = (form.getValues("multiSpace") ??
        { enabled: false, currentRoomIndex: 0, rooms: [] }) as MultiSpaceType;
      if (index < 0 || index >= current.rooms.length) return;
      writeMultiSpace({ ...current, currentRoomIndex: index });
    },
    [form, writeMultiSpace],
  );

  const addRoom = useCallback(
    (proposedName?: string): number | null => {
      const current = (form.getValues("multiSpace") ??
        { enabled: true, currentRoomIndex: 0, rooms: [] }) as MultiSpaceType;
      if (current.rooms.length >= MAX_ROOMS) return null;

      const fallbackName = `Room ${current.rooms.length + 1}`;
      const name = (proposedName ?? "").trim() || fallbackName;

      const nextRooms = [...current.rooms, blankRoom(name)];
      const nextIndex = nextRooms.length - 1;
      writeMultiSpace({
        enabled: true,
        currentRoomIndex: nextIndex,
        rooms: nextRooms,
      });

      // Persist immediately so we always have a real `room.id` (full dynamic CRUD).
      void roomService
        .create({ name })
        .then((res) => {
          const id = Number(res?.data?.id);
          if (!Number.isFinite(id) || id <= 0) return;

          const latest = (form.getValues("multiSpace") ??
            ({ enabled: true, currentRoomIndex: 0, rooms: [] } as MultiSpaceType)) as MultiSpaceType;
          const latestRooms = latest.rooms ?? [];
          if (!latestRooms[nextIndex]) return;

          const updatedRooms = latestRooms.map((r, i) =>
            i === nextIndex ? { ...r, id } : r,
          );
          form.setValue(
            "multiSpace",
            { ...latest, rooms: updatedRooms },
            { shouldDirty: true, shouldTouch: false },
          );
        })
        .catch((err) => {
          console.error("Failed to create room on backend:", err);
        });

      return nextIndex;
    },
    [form, writeMultiSpace],
  );

  const removeRoom = useCallback(
    (index: number) => {
      const current = (form.getValues("multiSpace") ??
        { enabled: true, currentRoomIndex: 0, rooms: [] }) as MultiSpaceType;
      if (index < 0 || index >= current.rooms.length) return;
      // Business rule: when multi-space mode is enabled, at least 2 rooms must remain.
      // Users who want fewer should toggle multi-space off.
      if (current.enabled && current.rooms.length <= 2) return;

      const removed = current.rooms[index];
      const nextRooms = current.rooms.filter((_, i) => i !== index);
      // Keep the user on a sensible tab after deletion: previous tab if we removed the active one.
      const nextIndex =
        nextRooms.length === 0
          ? 0
          : Math.min(
            current.currentRoomIndex > index
              ? current.currentRoomIndex - 1
              : current.currentRoomIndex,
            nextRooms.length - 1,
          );

      writeMultiSpace({
        // If the user removed the last room they implicitly want to abandon multi-space mode.
        enabled: nextRooms.length > 0,
        currentRoomIndex: nextIndex,
        rooms: nextRooms,
      });

      // Only call DELETE if the room was actually persisted (has a backend id). Newly added
      // rooms that the user removes before saving never hit the network.
      if (removed?.id) {
        void roomService.remove(removed.id).catch((err) => {
          console.error("Failed to delete room on backend:", err);
        });
      }
    },
    [form, writeMultiSpace],
  );

  const renameRoom = useCallback(
    (index: number, name: string) => {
      const current = (form.getValues("multiSpace") ??
        { enabled: true, currentRoomIndex: 0, rooms: [] }) as MultiSpaceType;
      if (index < 0 || index >= current.rooms.length) return;
      const cleaned = name.trim().slice(0, 40);
      if (!cleaned) return;
      const target = current.rooms[index];
      // No-op if the name didn't change (avoids redundant network traffic).
      if (target.name === cleaned) return;

      const nextRooms = current.rooms.map((room, i) =>
        i === index ? { ...room, name: cleaned } : room,
      );
      writeMultiSpace({ ...current, rooms: nextRooms });

      // Persist rename only for rooms that already exist server-side.
      if (target.id) {
        void roomService.update(target.id, { name: cleaned }).catch((err) => {
          console.error("Failed to update room name:", err);
        });
      }
    },
    [form, writeMultiSpace],
  );

  const isRoomComplete = useCallback(
    (room: RoomType): boolean => {
      return (
        isRoomSectionComplete(room, "package") &&
        isRoomSectionComplete(room, "dates") &&
        isRoomSectionComplete(room, "catering") &&
        isRoomSectionComplete(room, "brochure")
      );
    },
    [],
  );

  const completedRoomsCount = useMemo(
    () => rooms.filter(isRoomComplete).length,
    [rooms, isRoomComplete],
  );

  const canAddRoom = rooms.length < MAX_ROOMS;

  return {
    enabled,
    rooms,
    currentRoomIndex,
    currentRoom,
    roomsLoading,
    canAddRoom,
    completedRoomsCount,
    maxRooms: MAX_ROOMS,
    setEnabled,
    setCurrentRoomIndex,
    addRoom,
    removeRoom,
    renameRoom,
    isRoomComplete,
    isRoomSectionComplete,
  };
}
