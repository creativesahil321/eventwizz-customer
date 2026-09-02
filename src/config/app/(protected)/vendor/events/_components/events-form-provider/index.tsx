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
  coercePositiveEventStep,
  hasPersistedStepOneData,
  patchEventPayloadFromApi,
} from "../../_lib/hydrate-event-from-api";
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
  advanceStep: (completedStep?: number) => Promise<void>;
  back: () => Promise<void>;
  isLoading: boolean;
  /** True while Finalize (step 8) publish/draft save is in flight. */
  finalizeBusy: boolean;
  setFinalizeBusy: (busy: boolean) => void;
  /** True after persistence GET was merged into the global form. */
  persistedHydrated: boolean;
  /** When true, user can only view (read-event); Save/Submit and edits are disabled */
  readOnly: boolean;
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

  const hasServerDataProp = Boolean(
    serverData?.status && serverData.data,
  );
  const { eventData, isLoading: eventQueryLoading, invalidateCache } =
    useEventData(eventIdFromUrl, false, {
      enabled: !hasServerDataProp && Boolean(eventIdFromUrl),
    });

  const resolvedServerData = useMemo((): EventApiResponse | null => {
    if (serverData?.status && serverData.data) return serverData;
    if (eventData?.status && eventData.data) {
      return eventData as EventApiResponse;
    }
    return null;
  }, [serverData, eventData]);

  // Get initial step after component mount
  const [activeStep, setActiveStep] = useState<number>(1); // Default to 1
  const [currentStep, setLastCompletedStep] = useState<number>(1); // Track last completed step
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [finalizeBusy, setFinalizeBusy] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [persistedHydrated, setPersistedHydrated] = useState(false);

  const maxSteps = 8;
  const isMounted = useRef(true);
  const dataLoadAttempted = useRef(false);
  const didInitActiveStepFromServer = useRef(false);

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

  // Hydrate global form when persistence GET returns (same pattern as onboarding).
  useEffect(() => {
    if (!resolvedServerData?.status || !resolvedServerData.data) return;

    form.reset(mergedDefaults);

    if (hasPersistedStepOneData(mergedDefaults)) {
      setPersistedHydrated(true);
    }

    const explicitActive = coercePositiveEventStep(
      (resolvedServerData.data as { current_step?: number }).current_step,
    );

    if (!didInitActiveStepFromServer.current && explicitActive > 0) {
      didInitActiveStepFromServer.current = true;
      setActiveStep((prev) => Math.max(prev, explicitActive));
      setLastCompletedStep((prev) => Math.max(prev, explicitActive));
    }

    setInitialDataLoaded(true);
    setIsLoading(false);
  }, [resolvedServerData, mergedDefaults, form]);

  useEffect(() => {
    if (!eventIdFromUrl && !eventQueryLoading) {
      setIsLoading(false);
      setInitialDataLoaded(true);
      setPersistedHydrated(false);
    }
  }, [eventIdFromUrl, eventQueryLoading]);

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

  const advanceStep = useCallback(
    async (completedStep?: number) => {
      const stepBase = completedStep ?? activeStep;
      // Already on the last step (e.g. publish save) — nothing further to unlock.
      if (stepBase >= maxSteps) {
        return;
      }

      const nextStep = stepBase + 1;
      // Only bump progress when completing the furthest step — re-saving an earlier
      // step must not unlock tabs ahead (e.g. saving step 2 again after step 3 is open).
      if (nextStep > currentStep) {
        await updateActiveStep(nextStep);
        form.setValue("currentStep", nextStep);
      }
    },
    [activeStep, currentStep, form, maxSteps, updateActiveStep],
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

