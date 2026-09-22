"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { AIOnboardingInput } from "@/app/api/ai/generate-onboarding/route";
import {
  applyRoomSystemChoice,
  readAiCollectDraft,
  resolveCollectDraftRestore,
  snapshotFromCollectForm,
  writeAiCollectDraft,
  type AiCollectRoomName,
} from "@/app/(on-boarding)/on-boarding/_lib/ai-collect-draft-cache";

export type AiCollectFormValues = {
  has_multiple_locations: boolean;
  has_room_system?: boolean;
  room_names: AiCollectRoomName[];
  venueName: string;
  selectedPlaceId?: string;
  venueType: string;
  city: string;
  address: string;
  contactNumber: string;
  email: string;
  eventType?: string;
  guestCount?: string;
  priceRange?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
};

type Args = {
  form: UseFormReturn<AiCollectFormValues>;
  userKey: string;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
  initialData: AIOnboardingInput | null;
  persistedHasMultipleLocations: boolean | null;
  persistedHasRoomSystem: boolean | null;
  persistedRoomNames: string[];
  locationGateDone: boolean;
  setLocationGateDone: (value: boolean) => void;
  isPlaceSelected: boolean;
  setIsPlaceSelected: (value: boolean) => void;
};

export function useAiCollectDraft({
  form,
  userKey,
  sessionStatus,
  initialData,
  persistedHasMultipleLocations,
  persistedHasRoomSystem,
  persistedRoomNames,
  locationGateDone,
  setLocationGateDone,
  isPlaceSelected,
  setIsPlaceSelected,
}: Args) {
  const [draftReady, setDraftReady] = useState(false);
  const roomNamesStashRef = useRef<AiCollectRoomName[]>([]);
  const skipWriteRef = useRef(true);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  const persistDraft = useCallback(
    (immediate = false) => {
      if (skipWriteRef.current || !userKey) return;

      const run = () => {
        const values = form.getValues();
        writeAiCollectDraft(
          snapshotFromCollectForm({
            userKey,
            locationGateDone,
            isPlaceSelected,
            has_multiple_locations: values.has_multiple_locations === true,
            has_room_system: values.has_room_system,
            room_names: values.room_names ?? [],
            room_names_stash: roomNamesStashRef.current,
            venueName: values.venueName ?? "",
            selectedPlaceId: values.selectedPlaceId ?? "",
            venueType: values.venueType ?? "",
            city: values.city ?? "",
            address: values.address ?? "",
            contactNumber: values.contactNumber ?? "",
            email: values.email ?? "",
            description: values.description ?? "",
            latitude: values.latitude,
            longitude: values.longitude,
          }),
        );
      };

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      if (immediate) {
        run();
        return;
      }
      persistTimerRef.current = setTimeout(run, 200);
    },
    [form, isPlaceSelected, locationGateDone, userKey],
  );

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "authenticated" && !userKey) return;
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const draft = userKey ? readAiCollectDraft(userKey) : null;
    const restored = resolveCollectDraftRestore({
      userKey,
      draft,
      initialData,
      persistedHasMultipleLocations,
      persistedHasRoomSystem,
      persistedRoomNames,
    });

    if (restored) {
      roomNamesStashRef.current = restored.room_names_stash;
      const rooms =
        restored.has_room_system === true
          ? applyRoomSystemChoice({
              enabled: true,
              roomNames: restored.room_names,
              stash: restored.room_names_stash,
            }).roomNames
          : [];

      form.reset({
        ...form.getValues(),
        has_multiple_locations: restored.has_multiple_locations,
        has_room_system: restored.has_room_system,
        room_names: rooms,
        venueName: restored.venueName,
        selectedPlaceId: restored.selectedPlaceId,
        venueType: restored.venueType || form.getValues("venueType"),
        city: restored.city,
        address: restored.address,
        contactNumber: restored.contactNumber,
        email: restored.email || form.getValues("email"),
        description: restored.description,
        latitude: restored.latitude,
        longitude: restored.longitude,
      });

      if (restored.locationGateDone) setLocationGateDone(true);
      if (restored.has_multiple_locations === true) {
        setIsPlaceSelected(false);
      } else if (restored.isPlaceSelected || restored.selectedPlaceId) {
        setIsPlaceSelected(true);
      }
    }

    skipWriteRef.current = false;
    setDraftReady(true);
  }, [
    form,
    initialData,
    persistedHasMultipleLocations,
    persistedHasRoomSystem,
    persistedRoomNames,
    sessionStatus,
    setIsPlaceSelected,
    setLocationGateDone,
    userKey,
  ]);

  useEffect(() => {
    if (!draftReady) return;
    persistDraft(false);
    const sub = form.watch(() => persistDraft(false));
    return () => sub.unsubscribe();
  }, [draftReady, form, persistDraft]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistDraft(true);
    };
  }, [persistDraft]);

  const applyRoomToggle = useCallback(
    (enabled: boolean) => {
      const next = applyRoomSystemChoice({
        enabled,
        roomNames: form.getValues("room_names") ?? [],
        stash: roomNamesStashRef.current,
      });
      roomNamesStashRef.current = next.stash;
      form.setValue("has_room_system", enabled, { shouldValidate: true });
      form.setValue("room_names", next.roomNames, { shouldValidate: true });
      if (!enabled) {
        form.clearErrors("room_names");
      }
      persistDraft(true);
    },
    [form, persistDraft],
  );

  return { draftReady, applyRoomToggle, persistDraft };
}
