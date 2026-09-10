"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useForm, UseFormReturn, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import { useParams } from "next/navigation";
import { EventApiResponse } from "@/services/vendor/events/type";
import { useEventData } from "../../_lib/hooks/useEventData";
import {
  hasPersistedStepOneData,
  patchEventPayloadFromApi,
} from "../../_lib/hydrate-event-from-api";
import {
  consumeStashedWizardStep,
  readVendorEventUpdateCompletedStep,
  readVendorEventUpdateCurrentStep,
  resolveWizardStepsAfterSave,
  resolveVisibleWizardSteps,
} from "../../_lib/vendor-event-wizard-step";
import {
  applyVendorEventDraft,
  clearVendorEventPreviewDraft,
  loadVendorEventDraft,
} from "../../_lib/vendor-event-preview-live-data";
import {
  cloneEventFormSnapshot,
  eventFormHasUnsavedEdits,
  shouldAdoptPristineEditorAsSaved,
  VENDOR_EVENT_DISCARD_REQUESTED,
} from "../../_lib/event-form-discard";
import { resolveVendorEventIsRoomsForFetch } from "../../_lib/vendor-event-is-rooms";
import { EventSchemaType, eventSchema } from "../tab-event-form/schema";
import { initialData } from "../tab-event-form/initialData";
import { useLocationStore } from "@/store/location.store";
import { resolveVenueLocationAddress, resolveVenueLocationCoords } from "@/lib/venue-location-address";

interface EventFormContextType {
  form: UseFormReturn<EventSchemaType>;
  activeStep: number;
  currentStep: number;
  activeField: string | null;
  setActiveField: (fieldName: string | null) => void;
  setActiveStep: (step: number) => Promise<void>;
  save: () => Promise<void>;
  next: () => Promise<void>;
  /** Advance wizard after a step tab already persisted via its own API call. */
  advanceStep: (
    completedStep?: number,
    updateResponse?: unknown,
  ) => Promise<void>;
  back: () => Promise<void>;
  isLoading: boolean;
  /** True while Finalize (step 8) publish/draft save is in flight. */
  finalizeBusy: boolean;
  setFinalizeBusy: (busy: boolean) => void;
  /** True after persistence GET was merged into the global form. */
  persistedHydrated: boolean;
  /** When true, user can only view (read-event); Save/Submit and edits are disabled */
  readOnly: boolean;
  /** Last saved API snapshot — Discard restores this. */
  hasUnsavedEventEdits: boolean;
  isDiscarding: boolean;
  discardEpoch: number;
  discardUnsavedEventEdits: () => Promise<void>;
  /** Call after a step is persisted so Discard hides until the next edit. */
  markEventFormSaved: (completedStep?: number) => void;
}

const FormContext = createContext<EventFormContextType | undefined>(undefined);

// Simplified saveStepData function
const saveStepData = async (): Promise<{ success: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
};

export function FormProvider({
  children,
  serverData,
}: {
  children: ReactNode;
  serverData: EventApiResponse | null;
}) {
  const params = useParams<{ eventID?: string }>();
  const eventIdFromUrl = Array.isArray(params?.eventID)
    ? params.eventID[0]
    : params?.eventID;

  const canUpdateEvent = usePermission("update-event");
  const readOnly = !canUpdateEvent;
  const selectedLocation = useLocationStore((s) => s.selectedLocation);

  const isRoomsForFetch = eventIdFromUrl
    ? resolveVendorEventIsRoomsForFetch(eventIdFromUrl)
    : undefined;
  const {
    eventData,
    isLoading: eventQueryLoading,
    invalidateCache,
    refetch,
  } = useEventData(eventIdFromUrl, isRoomsForFetch, {
    enabled: Boolean(eventIdFromUrl),
  });

  const resolvedServerData = useMemo((): EventApiResponse | null => {
    if (serverData?.status && serverData.data) return serverData;
    if (eventData?.status && eventData.data) {
      return eventData as EventApiResponse;
    }
    return null;
  }, [serverData, eventData]);

  const maxSteps = 8;
  const isMounted = useRef(true);
  const dataLoadAttempted = useRef(false);
  const hydratedEventIdRef = useRef<string | null>(null);
  const isDiscardingRef = useRef(false);
  const hydrationCatchupEnabledRef = useRef(false);
  const didInitActiveStepFromServer = useRef(false);

  const [activeStep, setActiveStep] = useState(() => {
    const stashed = consumeStashedWizardStep(eventIdFromUrl);
    if (stashed > 0) {
      didInitActiveStepFromServer.current = true;
      return stashed;
    }
    return 1;
  });
  const [currentStep, setLastCompletedStep] = useState(() => {
    const stashed = consumeStashedWizardStep(eventIdFromUrl);
    return stashed > 0 ? stashed : 1;
  });
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [finalizeBusy, setFinalizeBusy] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [persistedHydrated, setPersistedHydrated] = useState(false);
  const [savedBaseline, setSavedBaseline] = useState<EventSchemaType | null>(
    null,
  );
  const [discardEpoch, setDiscardEpoch] = useState(0);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const mergedDefaults = useMemo(() => {
    if (resolvedServerData?.status && resolvedServerData.data) {
      return patchEventPayloadFromApi(
        resolvedServerData.data as unknown as Record<string, unknown>,
      );
    }
    // New event: start from the selected venue location address + pin.
    const venueAddress = resolveVenueLocationAddress(selectedLocation);
    const venueCoords = resolveVenueLocationCoords(
      selectedLocation as (typeof selectedLocation & Record<string, unknown>) | null,
    );
    if (!venueAddress && !venueCoords) return initialData;
    return {
      ...initialData,
      stepOne: {
        ...initialData.stepOne,
        ...(venueAddress
          ? {
              event_address: venueAddress,
              location: {
                title: "LOCATION",
                description: venueAddress,
                icon: "MapPin",
              },
            }
          : {}),
        ...(venueCoords
          ? {
              latitude: venueCoords.latitude,
              longitude: venueCoords.longitude,
            }
          : {}),
      },
    };
  }, [resolvedServerData, selectedLocation]);

  // Initialize the form
  const form = useForm<EventSchemaType>({
    resolver: zodResolver(eventSchema) as unknown as Resolver<EventSchemaType>,
    defaultValues: useMemo(() => mergedDefaults, [mergedDefaults]),
    mode: "onChange",
  });

  // Hydrate once per event. Later API refetches must not wipe unsaved Files.
  useEffect(() => {
    if (!resolvedServerData?.status || !resolvedServerData.data) return;

    const eventKey = eventIdFromUrl ? String(eventIdFromUrl) : "new";
    if (hydratedEventIdRef.current === eventKey) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      const draft = eventIdFromUrl
        ? await loadVendorEventDraft(eventIdFromUrl)
        : null;
      if (cancelled) return;

      // API snapshot only — leftover preview drafts must stay dirty so Discard shows.
      setSavedBaseline(cloneEventFormSnapshot(mergedDefaults));

      const nextValues = applyVendorEventDraft(
        mergedDefaults as unknown as Record<string, unknown>,
        draft,
      ) as EventSchemaType;

      hydrationCatchupEnabledRef.current = !eventFormHasUnsavedEdits(
        nextValues,
        mergedDefaults,
      );

      form.reset(nextValues);
      hydratedEventIdRef.current = eventKey;

      if (hasPersistedStepOneData(nextValues)) {
        setPersistedHydrated(true);
      }

      const fromVisible = resolveVisibleWizardSteps({
        getData: resolvedServerData.data as {
          current_step?: number;
          completed_step?: number;
        },
        stashedStep: consumeStashedWizardStep(eventIdFromUrl),
      });

      if (cancelled) return;

      setLastCompletedStep(fromVisible.unlockStep);
      if (!didInitActiveStepFromServer.current) {
        didInitActiveStepFromServer.current = true;
        setActiveStep(fromVisible.activeStep);
      }

      setInitialDataLoaded(true);
      setIsLoading(false);
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [resolvedServerData, mergedDefaults, form, eventIdFromUrl]);

  useEffect(() => {
    if (!eventIdFromUrl && !eventQueryLoading) {
      setIsLoading(false);
      setInitialDataLoaded(true);
      setPersistedHydrated(false);
    }
  }, [eventIdFromUrl, eventQueryLoading]);

  const watchedFormValues = form.watch();
  const isEditorDirty = form.formState.isDirty;
  const hasUnsavedEventEdits = useMemo(() => {
    const canDiscard =
      persistedHydrated &&
      savedBaseline != null &&
      !readOnly &&
      Boolean(eventIdFromUrl && /^\d+$/.test(String(eventIdFromUrl)));
    if (!canDiscard) return false;
    return eventFormHasUnsavedEdits(watchedFormValues, savedBaseline);
  }, [
    watchedFormValues,
    savedBaseline,
    persistedHydrated,
    readOnly,
    eventIdFromUrl,
  ]);

  useEffect(() => {
    if (
      !shouldAdoptPristineEditorAsSaved({
        catchupEnabled: hydrationCatchupEnabledRef.current,
        isDirty: isEditorDirty,
        hasUnsavedEdits: hasUnsavedEventEdits,
      })
    ) {
      if (isEditorDirty) {
        hydrationCatchupEnabledRef.current = false;
      }
      return;
    }

    setSavedBaseline(cloneEventFormSnapshot(form.getValues()));
    if (eventIdFromUrl && /^\d+$/.test(String(eventIdFromUrl))) {
      void clearVendorEventPreviewDraft(eventIdFromUrl);
    }
  }, [
    form,
    hasUnsavedEventEdits,
    isEditorDirty,
    watchedFormValues,
    eventIdFromUrl,
  ]);

  const discardUnsavedEventEdits = useCallback(async () => {
    if (readOnly) return;
    if (!eventIdFromUrl || !/^\d+$/.test(String(eventIdFromUrl))) return;

    isDiscardingRef.current = true;
    setIsDiscarding(true);
    try {
      await clearVendorEventPreviewDraft(eventIdFromUrl);
      await invalidateCache();
      const result = await refetch();
      const payload =
        (result.data?.data as Record<string, unknown> | undefined) ??
        (resolvedServerData?.data as unknown as Record<string, unknown> | undefined);
      if (!payload) {
        toast.error("Could not restore the last saved event. Try again.");
        return;
      }

      const next = patchEventPayloadFromApi(payload);
      form.reset(next, {
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false,
      });
      hydrationCatchupEnabledRef.current = true;
      setSavedBaseline(cloneEventFormSnapshot(next));
      setDiscardEpoch((value) => value + 1);
      toast.success("Changes discarded");
    } catch (error) {
      console.error("Error discarding event edits:", error);
      toast.error("Could not discard changes. Try again.");
    } finally {
      isDiscardingRef.current = false;
      if (isMounted.current) {
        setIsDiscarding(false);
      }
    }
  }, [
    readOnly,
    eventIdFromUrl,
    invalidateCache,
    refetch,
    resolvedServerData,
    form,
  ]);

  useEffect(() => {
    if (!eventIdFromUrl) return;

    const onRequest = (event: Event) => {
      const changedId = (event as CustomEvent<{ eventId?: string }>).detail
        ?.eventId;
      if (changedId && String(changedId) !== String(eventIdFromUrl)) return;
      void discardUnsavedEventEdits();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== `vendor-event-discard-ping:${eventIdFromUrl}`) return;
      void discardUnsavedEventEdits();
    };

    window.addEventListener(VENDOR_EVENT_DISCARD_REQUESTED, onRequest);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(VENDOR_EVENT_DISCARD_REQUESTED, onRequest);
      window.removeEventListener("storage", onStorage);
    };
  }, [eventIdFromUrl, discardUnsavedEventEdits]);

  // Custom function to set active step and save to localStorage and session
  const updateActiveStep = useCallback(
    async (step: number) => {
      setActiveStep(step);
      setActiveField(null);

      if (step > currentStep) {
        setLastCompletedStep(step);
      }
    },
    [currentStep],
  );

  // Use a separate useEffect for hydration safety
  useEffect(() => {
    // This ensures we're client-side before accessing localStorage or making network requests
    if (typeof window !== "undefined") {
      dataLoadAttempted.current = true;
    }
  }, []);

  // Set a timeout to ensure we don't get stuck in loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && !initialDataLoaded) {
        if (isMounted.current) {
          setInitialDataLoaded(true);
          setIsLoading(false);
        }
      }
    }, 3000); // 3 seconds max loading time

    return () => clearTimeout(timeout);
  }, [isLoading, initialDataLoaded]);

  const save = useCallback(async () => {
    if (isLoading) return;

    const stepKey = `step${activeStep}` as keyof EventSchemaType;
    setIsLoading(true);

    try {
      const isValid = await form.trigger(stepKey);
      if (!isValid) {
        toast.error("Please fill all required fields.");
        return;
      }

      await saveStepData();

      // Refresh data after saving
      await invalidateCache();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeStep, form, isLoading]);

  const next = useCallback(async () => {
    if (isLoading) return;

    const stepKey = `step${activeStep}` as keyof EventSchemaType;
    setIsLoading(true);

    try {
      // Validate the current step
      const isValid = await form.trigger(stepKey);
      if (!isValid) {
        toast.error("Please fill all required fields.");
        setIsLoading(false);
        return;
      }

      // Process all steps the same way - API calls are handled by individual step components
      const response = { success: true };

      if (response.success && activeStep < maxSteps) {
        const nextStep = activeStep + 1;
        await updateActiveStep(nextStep);

        // Update form state
        form.setValue("currentStep", nextStep);
      }
    } catch (error) {
      console.error("Error in next function:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeStep, form, isLoading, maxSteps, updateActiveStep]);

  const back = useCallback(async () => {
    if (isLoading || activeStep <= 1) return;

    const prevStep = activeStep - 1;

    await updateActiveStep(prevStep);
    form.setValue("currentStep", prevStep);
  }, [activeStep, form, isLoading, updateActiveStep]);

  const markEventFormSaved = useCallback(
    (completedStep?: number) => {
      const current = cloneEventFormSnapshot(form.getValues());
      setSavedBaseline((previous) => {
        if (!previous || completedStep == null) return current;
        const stepKey = (
          [
            "stepOne",
            "stepTwo",
            "stepThree",
            "stepFour",
            "stepFive",
            "stepSix",
            "stepSeven",
            "stepEight",
          ] as const
        )[completedStep - 1];
        if (!stepKey) return current;
        return {
          ...cloneEventFormSnapshot(previous),
          [stepKey]: current[stepKey],
        };
      });
    },
    [form],
  );

  const advanceStep = useCallback(
    async (completedStep?: number, updateResponse?: unknown) => {
      markEventFormSaved(completedStep ?? activeStep);
      const stepBase = completedStep ?? activeStep;
      const next = resolveWizardStepsAfterSave({
        updateCurrentStep: readVendorEventUpdateCurrentStep(updateResponse),
        updateCompletedStep: readVendorEventUpdateCompletedStep(updateResponse),
        savedStep: stepBase,
        previousUnlockStep: currentStep,
      });

      setActiveStep(next.activeStep);
      setActiveField(null);
      setLastCompletedStep(next.unlockStep);
      form.setValue("currentStep", next.activeStep);
    },
    [activeStep, currentStep, form, markEventFormSaved],
  );

  const contextValue = useMemo(
    () => ({
      form,
      activeStep,
      currentStep,
      activeField,
      setActiveField,
      setActiveStep: updateActiveStep,
      save,
      next,
      advanceStep,
      back,
      isLoading,
      finalizeBusy,
      setFinalizeBusy,
      persistedHydrated,
      readOnly,
      hasUnsavedEventEdits,
      isDiscarding,
      discardEpoch,
      discardUnsavedEventEdits,
      markEventFormSaved,
    }),
    [
      form,
      activeStep,
      currentStep,
      activeField,
      setActiveField,
      isLoading,
      finalizeBusy,
      persistedHydrated,
      updateActiveStep,
      save,
      next,
      advanceStep,
      back,
      readOnly,
      hasUnsavedEventEdits,
      isDiscarding,
      discardEpoch,
      discardUnsavedEventEdits,
      markEventFormSaved,
    ]
  );

  return (
    <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>
  );
}

export function useEventFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
}

