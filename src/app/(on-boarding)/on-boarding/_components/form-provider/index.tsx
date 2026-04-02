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
import {
  OnboardingFormData,
  onboardingSchema,
  normalizeStepOneFromApi,
  coerceHasMultipleLocationsFromApi,
} from "./schema";
import { defaultValues } from "./defaultValues";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { OnboardingFormSkeleton } from "@/components/ui/onboarding-skeleton";
import { ApiResponse } from "@/services/vendor/onboarding/type";
import { useOnboardingData } from "../../_lib/hooks/useOnboardingData";

interface FormContextType {
  form: UseFormReturn<OnboardingFormData>;
  activeStep: number;
  lastCompletedStep: number; // Add lastCompletedStep
  /** True after persistence GET was merged into the form (per-step `isApproved` is reliable). */
  persistedProgressHydrated: boolean;
  activeField: string | null;
  setActiveField: (fieldName: string | null) => void;
  setActiveStep: (
    step: number,
    options?: { skipSessionSync?: boolean },
  ) => Promise<void>;
  save: () => Promise<void>;
  next: () => Promise<void>;
  back: () => Promise<void>;
  isLoading: boolean;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

function getStepElevenRecord(
  data: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const raw = data.stepEleven ?? data.step_eleven ?? data.step11;
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Hydrates `stepOne.has_multiple_locations` from persisted GET data.
 * Priority: root → stepOne → step 11 (API often stores the flag only on `stepEleven`).
 */
function patchOnboardingPayloadFromApi(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const dataAny = { ...raw };
  const rootFlag = coerceHasMultipleLocationsFromApi(
    dataAny.has_multiple_locations ?? dataAny.hasMultipleLocations,
  );

  const stepElevenRaw = getStepElevenRecord(dataAny);
  const stepElevenFlag = coerceHasMultipleLocationsFromApi(
    stepElevenRaw?.has_multiple_locations ??
      stepElevenRaw?.hasMultipleLocations,
  );

  const normalizedStepOne = normalizeStepOneFromApi(dataAny.stepOne);
  const stepOneSelfFlag = coerceHasMultipleLocationsFromApi(
    normalizedStepOne.has_multiple_locations,
  );

  const persistedMulti =
    rootFlag ?? stepOneSelfFlag ?? stepElevenFlag;

  if (
    dataAny.stepOne !== undefined ||
    rootFlag !== undefined ||
    stepElevenFlag !== undefined
  ) {
    dataAny.stepOne = {
      ...defaultValues.stepOne,
      ...(typeof dataAny.stepOne === "object" && dataAny.stepOne !== null
        ? (dataAny.stepOne as object)
        : {}),
      ...normalizedStepOne,
      ...(persistedMulti !== undefined
        ? { has_multiple_locations: persistedMulti }
        : {}),
    };
  }

  return dataAny;
}

function parseLastCompletedStepFromPayload(
  dataAny: Record<string, unknown>,
  stepFromData: number,
): number {
  const raw = dataAny.last_completed_step ?? dataAny.lastCompletedStep;
  if (raw !== undefined && raw !== null && raw !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  if (stepFromData > 0) return Math.max(stepFromData, 1);
  return 1;
}

// Simplified saveStepData function
const saveStepData = async (): Promise<{ success: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true }), 500);
  });
};

export function FormProvider({
  children,
  serverData,
  mode,
}: {
  children: ReactNode;
  serverData: ApiResponse | null;
  mode?: "ai" | "manual";
}) {
  // Get session data and update function
  const { data: session, update: updateSession } = useSession();

  // Get the invalidateCache function from useOnboardingData
  const { invalidateCache } = useOnboardingData();

  // Get initial step after component mount
  const [activeStep, setActiveStep] = useState<number>(1); // Default to 1
  const [lastCompletedStep, setLastCompletedStep] = useState<number>(1); // Track last completed step
  const [persistedProgressHydrated, setPersistedProgressHydrated] =
    useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const maxSteps = 11;
  const isMounted = useRef(true);
  const dataLoadAttempted = useRef(false);

  // Merge server data with default values
  const mergedDefaults = useMemo(() => {
    // First, check if we have server data
    if (serverData) {
      console.log("Raw server data:", serverData);

      // Determine what structure we're dealing with
      const formData = serverData.data || serverData;

      if (formData && typeof formData === "object") {
        return patchOnboardingPayloadFromApi({
          ...(formData as object),
        } as Record<string, unknown>) as unknown as OnboardingFormData;
      }
    }

    return defaultValues;
  }, [serverData]);

  // Initialize the form
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(
      onboardingSchema,
    ) as unknown as Resolver<OnboardingFormData>,
    defaultValues: useMemo(() => mergedDefaults, [mergedDefaults]),
    mode: "onChange",
  });

  // Reset form when server data changes - this is important for preserving state
  useEffect(() => {
    if (serverData) {
      const formData = serverData.data || serverData;

      if (formData && Object.keys(formData).length > 0) {
        const dataAny = patchOnboardingPayloadFromApi({
          ...(formData as object),
        } as Record<string, unknown>);
        form.reset(dataAny as unknown as OnboardingFormData);
        setPersistedProgressHydrated(true);

        // Update active step if available
        const stepFromData =
          Number(dataAny.active_step) ||
          Number(dataAny.activeStep) ||
          Number(dataAny.step) ||
          Number(dataAny.current_step);

        if (stepFromData && stepFromData > 0) {
          setActiveStep(stepFromData);
        }

        const lastCompleted = parseLastCompletedStepFromPayload(
          dataAny,
          stepFromData,
        );
        setLastCompletedStep(lastCompleted >= 0 ? lastCompleted : 1);
      }
    }
  }, [serverData, form]);

  // Load active step from session when component mounts (only once)
  useEffect(() => {
    const loadInitialStep = async () => {
      try {
        // First check session data (most authoritative source)
        if (session?.user?.on_boarding_step) {
          const stepFromSession = Number(session.user.on_boarding_step);
          if (!isNaN(stepFromSession) && stepFromSession > 0) {
            setActiveStep(stepFromSession);
            return;
          }
        }

        // Fall back to onboarding service
        const step = await onboardingService.getCurrentStep();
        if (step && step > 0) {
          setActiveStep(step);
        }
      } catch (error) {
        console.error("Error loading initial step:", error);
      }
    };

    loadInitialStep();
  }, []); // Remove session dependency to prevent reversion on tab switch

  // Custom function to set active step and update session - instant with no delay
  const updateActiveStep = useCallback(
    async (step: number, options?: { skipSessionSync?: boolean }) => {
      setActiveField(null); // Reset active field when changing steps

      // Update step immediately - no delay, no blank screen
      setActiveStep(step);

      // Update last completed step if moving forward
      if (step > lastCompletedStep) {
        setLastCompletedStep(step);
      }

      if (options?.skipSessionSync) {
        return;
      }

      // Update the session using NextAuth (async in background)
      try {
        await updateSession({
          on_boarding_step: step,
          last_completed_step: Math.max(lastCompletedStep, step),
        });
      } catch (error) {
        console.error("Failed to update session with step:", error);
      }
    },
    [setActiveStep, lastCompletedStep, updateSession],
  );

  // Use a separate useEffect for hydration safety
  useEffect(() => {
    // This ensures we're client-side before making network requests
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

  // Add auto-save functionality when fields change
  const autoSave = useCallback((data: OnboardingFormData | unknown) => {
    console.log("Auto-saving form data:", data);
    // Implement your auto-save logic here
    // e.g., onboardingService.saveStepData(activeStep, data[`step${activeStep}`])
  }, []);

  const debouncedSave = useMemo(() => debounce(autoSave, 2000), [autoSave]);

  // Watch form changes for auto-save
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (form.formState.isDirty) {
        debouncedSave(data);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, form.watch, debouncedSave]);

  const save = useCallback(async () => {
    if (isLoading) return;

    const stepKey = `step${activeStep}` as keyof OnboardingFormData;
    setIsLoading(true);

    try {
      const isValid = await form.trigger(stepKey);
      if (!isValid) {
        toast.error("Please fill all required fields.");
        return;
      }

      await saveStepData();

      // Refresh data after saving
      invalidateCache();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("An error occurred while saving.");
    } finally {
      setIsLoading(false);
    }
  }, [activeStep, form, isLoading, invalidateCache]);

  const next = useCallback(async () => {
    if (isLoading) return;

    const stepKey = `step${activeStep}` as keyof OnboardingFormData;
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
        form.setValue("activeStep", nextStep);
      } else if (response.success) {
        toast.info("Reached final step.");
      } else {
        toast.error("Failed to save changes.");
      }
    } catch (error) {
      console.error("Error in next function:", error);
      toast.error("An error occurred while saving.");
    } finally {
      setIsLoading(false);
    }
  }, [activeStep, form, isLoading, maxSteps, updateActiveStep]);

  const back = useCallback(async () => {
    if (isLoading || activeStep <= 1) return;

    const prevStep = activeStep - 1;

    await updateActiveStep(prevStep);
    form.setValue("activeStep", prevStep);
  }, [activeStep, form, isLoading, updateActiveStep]);

  const contextValue = useMemo(
    () => ({
      form,
      activeStep,
      lastCompletedStep,
      persistedProgressHydrated,
      activeField,
      setActiveField,
      setActiveStep: updateActiveStep,
      save,
      next,
      back,
      isLoading,
    }),
    [
      form,
      activeStep,
      lastCompletedStep,
      persistedProgressHydrated,
      activeField,
      setActiveField,
      isLoading,
      updateActiveStep,
      save,
      next,
      back,
    ],
  );

  // Determine the layout type for the skeleton based on the active step
  const getSkeletonLayout = () => {
    const splitLayoutSteps = new Set([2, 3, 4, 5, 6, 7, 8, 9]);
    const centeredSteps = new Set([6, 11, 10, 12]);

    if (splitLayoutSteps.has(activeStep)) {
      return "split";
    } else if (centeredSteps.has(activeStep)) {
      return "centered";
    } else {
      return "full";
    }
  };

  if (isLoading) {
    return (
      <OnboardingFormSkeleton
        layout={mode === "ai" ? "ai" : getSkeletonLayout()}
      />
    );
  }

  return (
    <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>
  );
}

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
}

// Simple debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
