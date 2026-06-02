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
import { OnboardingFormData, onboardingSchema } from "./schema";
import { patchOnboardingPayloadFromApi } from "./hydrate-onboarding-from-api";
import { defaultValues } from "./defaultValues";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { OnboardingFormSkeleton } from "@/components/ui/onboarding-skeleton";
import { ApiResponse } from "@/services/vendor/onboarding/type";
import { useOnboardingData } from "../../_lib/hooks/useOnboardingData";
import type { ThemeSchema } from "@/types/theme.types";
import {
  extractOnboardingPreviewTheme,
  ONBOARDING_DEFAULT_THEME,
} from "../../_lib/onboarding-default-theme";

interface FormContextType {
  form: UseFormReturn<OnboardingFormData>;
  activeStep: number;
  lastCompletedStep: number; // Add lastCompletedStep
  /** True after persistence GET was merged into the form (per-step `isApproved` is reliable). */
  persistedProgressHydrated: boolean;
  /** Vendor-site preview theme from persistence `default_theme` (Clean White fallback). */
  previewTheme: ThemeSchema;
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

/** Positive onboarding step from API fields, or 0 if unknown (never NaN). */
function coercePositiveStep(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(11, Math.floor(n)) : 0;
}

/**
 * Furthest completed step for the stepper. Uses root `last_completed_step` when present,
 * and always considers `default_venue_location.onboarding_step` (Laravel often keeps the
 * canonical cursor there). Without that merge, AI flows can lose `last_completed_step` on
 * the client while `explicitActive` stays at 2 — locking steps 3+ even though work through 9 exists.
 */
function parseLastCompletedStepFromPayload(
  dataAny: Record<string, unknown>,
  stepFromDataRaw: unknown,
): number {
  const stepFromData = coercePositiveStep(stepFromDataRaw);

  const def = dataAny.default_venue_location ?? dataAny.defaultVenueLocation;
  const venueStep =
    def && typeof def === "object"
      ? coercePositiveStep(
          (def as Record<string, unknown>).onboarding_step ??
            (def as Record<string, unknown>).on_boarding_step,
        )
      : 0;

  const raw = dataAny.last_completed_step ?? dataAny.lastCompletedStep;
  let n = venueStep;
  if (raw !== undefined && raw !== null && raw !== "") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      n = Math.max(n, parsed);
    }
  }
  n = Math.max(n, stepFromData);

  if (n > 0) {
    return Math.min(11, Math.floor(n));
  }
  if (stepFromData > 0) return Math.max(stepFromData, 1);
  return 1;
}

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
  /** Step save/next only; initial shell is gated by the parent onboarding query, not another artificial delay. */
  const [isLoading, setIsLoading] = useState(false);

  const maxSteps = 11;
  const dataLoadAttempted = useRef(false);
  const didInitActiveStepFromServer = useRef(false);

  // Merge server data with default values
  const mergedDefaults = useMemo(() => {
    if (serverData) {
      const formData = serverData.data || serverData;

      if (formData && typeof formData === "object") {
        return patchOnboardingPayloadFromApi({
          ...(formData as object),
        } as Record<string, unknown>) as unknown as OnboardingFormData;
      }
    }

    return defaultValues;
  }, [serverData]);

  const previewTheme = useMemo((): ThemeSchema => {
    if (!serverData) return ONBOARDING_DEFAULT_THEME;
    const formData = serverData.data || serverData;
    if (formData && typeof formData === "object") {
      return extractOnboardingPreviewTheme(formData as Record<string, unknown>);
    }
    return ONBOARDING_DEFAULT_THEME;
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

        // Only trust explicit “current step” keys — not `default_venue_location.onboarding_step`,
        // which tracks furthest progress and would yank users off a step they opened to review.
        const explicitActive =
          coercePositiveStep(dataAny.active_step) ||
          coercePositiveStep(dataAny.activeStep) ||
          coercePositiveStep(dataAny.step) ||
          coercePositiveStep(dataAny.current_step);

        // IMPORTANT: only initialize `activeStep` from persistence once.
        // After that, refetches caused by "Save" must not snap the UI back to a stale `active_step`
        // (AI onboarding commonly returns 2 even when the user is progressing through later steps).
        if (!didInitActiveStepFromServer.current && explicitActive > 0) {
          didInitActiveStepFromServer.current = true;
          // Never allow first hydration to regress a newer in-memory step.
          setActiveStep((prev) => Math.max(prev, explicitActive));
        }

        const lastCompleted = parseLastCompletedStepFromPayload(
          dataAny,
          explicitActive,
        );
        const safeLastCompleted =
          Number.isFinite(lastCompleted) && lastCompleted >= 1
            ? Math.min(11, Math.floor(lastCompleted))
            : 1;
        // Never drop below API progress; session bootstrap may run later with only the *viewing* step.
        setLastCompletedStep((prev) => Math.max(prev, safeLastCompleted));
      }
    }
  }, [serverData, form]);

  // Load active step from session when component mounts (only once)
  useEffect(() => {
    const loadInitialStep = async () => {
      try {
        // First check session data (most authoritative source)
        if (session?.user?.on_boarding_step) {
          const stepFromSession = coercePositiveStep(session.user.on_boarding_step);
          if (stepFromSession > 0) {
            // Never regress an already-advanced in-memory step (common with late async resolution in prod).
            setActiveStep((prev) => Math.max(prev, stepFromSession));
            // Never overwrite a higher `lastCompletedStep` already set from GET (e.g. user refreshed on step 2 while API says 9).
            setLastCompletedStep((prev) => {
              const sessionLastCompleted = session.user.last_completed_step
                ? coercePositiveStep(session.user.last_completed_step)
                : stepFromSession;
              const safeFromSession =
                sessionLastCompleted > 0
                  ? Math.max(sessionLastCompleted, stepFromSession)
                  : stepFromSession;
              return Math.max(prev, safeFromSession);
            });
            return;
          }
        }

        // Fall back to onboarding service
        const step = await onboardingService.getCurrentStep();
        if (step && step > 0) {
          // Same guard for service fallback; this request may resolve after user already clicked next.
          setActiveStep((prev) => Math.max(prev, step));
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
      // Once user/code drives navigation, don't let later refetches re-init from stale payloads.
      didInitActiveStepFromServer.current = true;

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

  // Keep RHF state aligned with provider state so any watcher-based logic sees the same step.
  useEffect(() => {
    form.setValue("activeStep", activeStep);
  }, [form, activeStep]);

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

      // Global `save()` is a no-op persistence placeholder; step components call APIs directly.
      await Promise.resolve();

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
      previewTheme,
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
      previewTheme,
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
