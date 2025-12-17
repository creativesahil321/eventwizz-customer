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
import { useSession } from "next-auth/react";
import { EventApiResponse } from "@/services/vendor/events/type";
import { useEventData } from "../../_lib/hooks/useEventData";
import { EventSchemaType, eventSchema } from "../tab-event-form/schema";
import { initialData } from "../tab-event-form/initialData";

interface EventFormContextType {
  form: UseFormReturn<EventSchemaType>;
  activeStep: number;
  currentStep: number;
  activeField: string | null;
  setActiveField: (fieldName: string | null) => void;
  setActiveStep: (step: number) => Promise<void>;
  save: () => Promise<void>;
  next: () => Promise<void>;
  back: () => Promise<void>;
  isLoading: boolean;
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
  console.log("serverData", serverData);

  // Get session data and update function
  const { data: session, update: updateSession } = useSession();

  // Get the invalidateCache function from useEventData
  // Get eventId from URL if available
  let eventIdFromUrl;
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    // Handle both URL patterns: /vendor/events/{id} and /vendor/events/create/{id}
    if (pathname.includes("/events/create/")) {
      eventIdFromUrl = pathname.split("/events/create/")[1];
    } else if (pathname.includes("/events/")) {
      const segment = pathname.split("/events/")[1];
      // Make sure we don't get "create" as an ID
      eventIdFromUrl = segment !== "create" ? segment : undefined;
    }
  }
  const { invalidateCache } = useEventData(eventIdFromUrl);

  // Get initial step after component mount
  const [activeStep, setActiveStep] = useState<number>(1); // Default to 1
  const [currentStep, setLastCompletedStep] = useState<number>(1); // Track last completed step
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const maxSteps = 8;
  const isMounted = useRef(true);
  const dataLoadAttempted = useRef(false);

  // Merge server data with default values
  const mergedDefaults = useMemo(() => {
    // First, check if we have server data
    if (serverData) {
      console.log("Raw server data:", serverData);

      // Handle the API response structure
      if (serverData.status && serverData.data) {
        // We have a successful API response with event data
        const eventData = serverData.data;

        // Map the event data to our form structure
        const eventDataAny = eventData as unknown as EventSchemaType; // Type cast to handle dynamic properties
        const mappedData: Partial<EventSchemaType> = {
          // Map all steps from the server data
          stepOne: eventDataAny.stepOne || initialData.stepOne,
          stepTwo: eventDataAny.stepTwo || initialData.stepTwo,
          stepThree: eventDataAny.stepThree || initialData.stepThree,
          stepFour: eventDataAny.stepFour || initialData.stepFour,
          stepFive: eventDataAny.stepFive || initialData.stepFive,
          stepSix: eventDataAny.stepSix || initialData.stepSix,
          stepSeven: eventDataAny.stepSeven || initialData.stepSeven,
          stepEight: eventDataAny.stepEight || initialData.stepEight,
        };

        return { ...initialData, ...mappedData };
      }
    }

    return initialData;
  }, [serverData]);

  // Initialize the form
  const form = useForm<EventSchemaType>({
    resolver: zodResolver(eventSchema) as unknown as Resolver<EventSchemaType>,
    defaultValues: useMemo(() => mergedDefaults, [mergedDefaults]),
    mode: "onChange",
  });

  // Reset form when server data changes - this is important for preserving state
  useEffect(() => {
    console.log("Server data in events-form-provider:", serverData);

    if (serverData && serverData.status && serverData.data) {
      console.log(
        "Server data structure:",
        JSON.stringify(serverData.data, null, 2)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventData = serverData.data as any; // Type cast to handle dynamic properties

      // Reset form with mapped data
      form.reset(mergedDefaults as EventSchemaType);

      // Set active step based on current_step from server data

      // Check different possible locations for current_step
      let currentStep = 1;

      // The API response structure might have current_step at the top level
      if (typeof eventData.current_step === "number") {
        currentStep = eventData.current_step;
      }
      // Or it might have currentStep (camelCase)
      else if (typeof eventData.currentStep === "number") {
        currentStep = eventData.currentStep;
      }
      // Or it might be nested in the data property
      else if (
        eventData.data &&
        typeof eventData.data.current_step === "number"
      ) {
        currentStep = eventData.data.current_step;
      }

      console.log("Extracted current step:", currentStep);

      if (currentStep > 0) {
        console.log("Setting active step to:", currentStep);
        setActiveStep(currentStep);
        setLastCompletedStep(currentStep);
      }
    }
  }, [serverData, form, mergedDefaults]);

  // Load active step from session when component mounts
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

        // Fall back to events service
        const step = 1;
        if (step && step > 0) {
          setActiveStep(step);
        }
      } catch (error) {
        console.error("Error loading initial step:", error);
      }
    };

    loadInitialStep();
  }, [session]);

  // Custom function to set active step and save to localStorage and session
  const updateActiveStep = useCallback(
    async (step: number) => {
      setActiveStep(step);
      setActiveField(null); // Reset active field when changing steps

      // Update last completed step if moving forward
      if (step > currentStep) {
        setLastCompletedStep(step);
      }

      // Update the session using NextAuth
      try {
        // Use the update function from the component scope
        await updateSession({
          on_boarding_step: step,
          last_completed_step: Math.max(currentStep, step),
        });
      } catch (error) {
        console.error("Failed to update session with step:", error);
      }
    },
    [setActiveStep, currentStep, updateSession]
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

  // Add auto-save functionality when fields change
  const debouncedSave = useCallback(
    debounce((data: EventSchemaType | unknown) => {
      console.log("Auto-saving form data:", data);
      // Implement your auto-save logic here
    }, 2000),
    []
  );

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
      toast.error("An error occurred while saving.");
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
    form.setValue("currentStep", prevStep);
  }, [activeStep, form, isLoading, updateActiveStep]);

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
      back,
      isLoading,
    }),
    [
      form,
      activeStep,
      currentStep,
      activeField,
      setActiveField,
      isLoading,
      updateActiveStep,
      save,
      next,
      back,
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

// Simple debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
