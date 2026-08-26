"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useForm, useFieldArray, Resolver, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormContext } from "../../form-provider";
import { toast } from "sonner";
import {
  OnboardingFieldGroupTitle,
  OnboardingTitle,
} from "@/components/ui/typography";
import { OnboardingCard } from "@/components/ui/card";
import { CardContent, CardHeader } from "@/components/ui/card";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getDefaultDate,
  stepFiveSchema,
  StepFiveType,
} from "../../form-provider/schema";
import { useSession } from "next-auth/react";
import { useFieldFocusHandler } from "../../form-preview/field-focus-handler";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { MultiSpaceHeader } from "../../rooms/multi-space-header";
import { useRoomScopeSync } from "../../rooms/use-room-scope-sync";
import {
  isRoomSectionComplete,
  canShowApplyToAllButton,
  useRoomManager,
} from "../../rooms/use-room-manager";
import { hasMeaningfulVendorDates } from "@/app/(protected)/vendor/events/_lib/vendor-step-three-rooms";
import { focusNextIncompleteOnboardingRoom } from "../../../_lib/onboarding-multi-room-progress";
import { EventDateInput } from "@/components/event-date-input";
import {
  hasEventDateOrderChanged,
  sortDateFieldArrayWithIds,
} from "@/lib/event-dates-sort";

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Helper function to format date consistently as DD-MM-YYYY
const formatDateDisplay = (dateString: string | undefined | null): string => {
  if (!dateString) return "New Date";

  try {
    // Noon local avoids timezone off-by-one for YYYY-MM-DD strings
    const date = new Date(`${dateString}T12:00:00`);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "New Date";
    }

    // Format as DD-MM-YYYY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "New Date";
  }
};

const hasMeaningfulDateData = (
  dates: StepFiveType["dates"] | undefined,
): boolean => {
  if (!dates || dates.length === 0) return false;
  const hasNonEmpty = (value: unknown) => String(value ?? "").trim().length > 0;
  return dates.some((date) => {
    const hasDate = hasNonEmpty(date?.event_date);
    const hasTickets =
      Array.isArray(date?.tickets) &&
      date.tickets.some(
        (ticket) =>
          hasNonEmpty(ticket?.title) ||
          hasNonEmpty(ticket?.description) ||
          hasNonEmpty(ticket?.total_capacity) ||
          hasNonEmpty(ticket?.price),
      );
    const hasTables =
      Array.isArray(date?.tables) &&
      date.tables.some(
        (table) =>
          hasNonEmpty(table?.min_persons) ||
          hasNonEmpty(table?.max_persons) ||
          hasNonEmpty(table?.price) ||
          hasNonEmpty(table?.total_tables),
      );
    const hasDepositData =
      hasNonEmpty(date?.deposit_value) || hasNonEmpty(date?.deposit_due_date);
    return hasDate || hasTickets || hasTables || hasDepositData;
  });
};

const normalizeDepositType = (value: unknown): "amount" | "percentage" => {
  return value === "percentage" ? "percentage" : "amount";
};

export default function StepFive() {
  const {
    form: globalForm,
    save,
    setActiveStep,
    persistedProgressHydrated,
  } = useFormContext();

  const stepFivePersistedApprovedSingle = useWatch({
    control: globalForm.control,
    name: "stepFive.isApproved",
  });
  const stepFiveScopedData = useWatch({
    control: globalForm.control,
    name: "stepFive",
  });
  const { handleFieldFocus, clearActiveField } = useFieldFocusHandler();
  const [loading, setLoading] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const prevDateFieldCountRef = useRef<number | undefined>(undefined);
  const { update: updateSession } = useSession();

  // Multi-room sync: when enabled, the active room's `dates` slot drives the form below and
  // saves go through the room-scoped endpoint. Single-room mode is unchanged.
  const roomScope = useRoomScopeSync("dates");
  const { currentRoomIndex, currentRoom, rooms, setCurrentRoomIndex } =
    useRoomManager();
  const stepFivePersistedApproved = roomScope.isMultiRoom
    ? roomScope.persistedApproved
    : stepFivePersistedApprovedSingle === true;
  const isRoomSwitchHydratingRef = useRef(false);
  const previousRoomIndexRef = useRef(currentRoomIndex);
  const lastHydratedRoomIndexRef = useRef<number | null>(null);
  const activeScopedDates = roomScope.isMultiRoom
    ? (rooms[currentRoomIndex]?.dates?.dates as
        | StepFiveType["dates"]
        | undefined)
    : (stepFiveScopedData?.dates as StepFiveType["dates"] | undefined);

  // Initialize form with combined step data
  const stepFiveDefaults = globalForm.getValues("stepFive");
  const eventId = useEventId(globalForm, "stepFive");

  // Clean up dates data - remove payment fields for tickets booking type
  const cleanDatesData = useCallback(
    (dates: StepFiveType["dates"] | undefined): StepFiveType["dates"] => {
      if (!dates || dates.length === 0) {
        return [getDefaultDate("tickets")];
      }

      return dates.map((date) => {
        // If booking type is tickets, remove payment-related fields
        if (date.booking_type === "tickets") {
          return {
            event_date: date.event_date,
            booking_type: date.booking_type,
            total_ticket_types: date.total_ticket_types ?? 0,
            tickets: date.tickets ?? [],
            total_table_types: 0,
            tables: [],
          };
        }

        // If payment type is full, clean deposit fields
        if (date.payment_type === "full" || date.payment_type === undefined) {
          return {
            ...date,
            is_deposit_enabled: false,
            deposit_type: undefined,
            deposit_value: undefined,
            deposit_due_date: undefined,
          };
        }

        return {
          ...date,
          is_deposit_enabled: true,
        };
      });
    },
    [],
  );

  // Setup form with the new schema structure
  const form = useForm<StepFiveType>({
    resolver: zodResolver(stepFiveSchema) as Resolver<StepFiveType>,
    defaultValues: {
      step: 5,
      event_id: eventId,
      // Each date now has its own booking_type
      dates: cleanDatesData(stepFiveDefaults?.dates),
    } as StepFiveType,
    mode: "onChange",
  });

  // Update form when eventId changes
  useEffect(() => {
    form.setValue("event_id", eventId);
  }, [eventId, form]);

  // Rehydrate local form from the active room-scoped step payload on room switch / API hydration.
  // Without this reset, Step 5 can keep stale local values even though `multiSpace.rooms[*].dates`
  // and `stepFive` were updated by `useRoomScopeSync`.
  useEffect(() => {
    if (!roomScope.isMultiRoom) return;
    const previousRoomIndex = previousRoomIndexRef.current;
    if (
      previousRoomIndex !== currentRoomIndex &&
      previousRoomIndex >= 0 &&
      previousRoomIndex < rooms.length
    ) {
      const localDates = cleanDatesData(form.getValues("dates"));
      const existingPreviousDates =
        (globalForm.getValues(
          `multiSpace.rooms.${previousRoomIndex}.dates.dates`,
        ) as StepFiveType["dates"] | undefined) ?? [];

      // Persist the outgoing room snapshot before hydrating the incoming room.
      // Guard: never store blank default rows on never-configured rooms.
      if (hasMeaningfulDateData(localDates)) {
        globalForm.setValue(
          `multiSpace.rooms.${previousRoomIndex}.dates`,
          { dates: localDates },
          { shouldValidate: false, shouldDirty: true },
        );
      } else if (!hasMeaningfulDateData(existingPreviousDates)) {
        globalForm.setValue(
          `multiSpace.rooms.${previousRoomIndex}.dates`,
          { dates: [] },
          { shouldValidate: false, shouldDirty: true },
        );
      }
    }
    isRoomSwitchHydratingRef.current = true;
    previousRoomIndexRef.current = currentRoomIndex;
  }, [roomScope.isMultiRoom, currentRoomIndex]);

  // Hydrate the local form only when switching rooms (or on first load).
  // Do NOT re-run when pushToGlobal updates `multiSpace.rooms[*].dates` — that was
  // Do NOT re-run when pushToGlobal updates `multiSpace.rooms[*].dates`.
  useEffect(() => {
    if (!roomScope.isMultiRoom) return;

    const shouldHydrateFromPersisted =
      persistedProgressHydrated && lastHydratedRoomIndexRef.current === null;
    const switchedRoom = lastHydratedRoomIndexRef.current !== currentRoomIndex;

    if (!shouldHydrateFromPersisted && !switchedRoom) {
      isRoomSwitchHydratingRef.current = false;
      return;
    }

    const incomingDates = cleanDatesData(
      rooms[currentRoomIndex]?.dates?.dates as
        | StepFiveType["dates"]
        | undefined,
    );
    const currentDates = form.getValues("dates");
    if (JSON.stringify(currentDates) === JSON.stringify(incomingDates)) {
      lastHydratedRoomIndexRef.current = currentRoomIndex;
      isRoomSwitchHydratingRef.current = false;
      return;
    }

    form.reset({
      step: 5,
      event_id: eventId,
      dates: incomingDates,
    });
    lastHydratedRoomIndexRef.current = currentRoomIndex;
    isRoomSwitchHydratingRef.current = false;
  }, [
    roomScope.isMultiRoom,
    currentRoomIndex,
    persistedProgressHydrated,
    rooms,
    eventId,
    cleanDatesData,
    form,
  ]);

  // Setup field array for dates
  const {
    fields: dateFields,
    append,
    remove,
    replace,
  } = useFieldArray({
    control: form.control,
    name: "dates",
  });
  const watchedDates = useWatch({
    control: form.control,
    name: "dates",
  });

  // Open newly added rows automatically (stable field.id keys).
  useEffect(() => {
    const len = dateFields.length;
    if (
      prevDateFieldCountRef.current !== undefined &&
      len > prevDateFieldCountRef.current
    ) {
      const lastField = dateFields[len - 1];
      if (lastField) {
        setOpenAccordions((prev) =>
          prev.includes(lastField.id) ? prev : [...prev, lastField.id],
        );
      }
    }
    prevDateFieldCountRef.current = len;
  }, [dateFields]);

  const canApplyToAllRooms = useMemo(() => {
    if (!roomScope.isMultiRoom || rooms.length < 2) return false;
    return hasMeaningfulVendorDates(watchedDates);
  }, [roomScope.isMultiRoom, rooms.length, watchedDates]);

  // Keep deposit defaults in sync with schema expectations.
  useEffect(() => {
    if (!Array.isArray(watchedDates)) return;
    watchedDates.forEach((date, index) => {
      if (!date) return;
      const bookingType = date.booking_type;
      if (bookingType !== "tables" && bookingType !== "both") return;

      if (!date.payment_type) {
        form.setValue(`dates.${index}.payment_type`, "full", {
          shouldValidate: false,
        });
      }

      if (date.payment_type !== "deposit") return;

      if (date.is_deposit_enabled !== true) {
        form.setValue(`dates.${index}.is_deposit_enabled`, true, {
          shouldValidate: false,
        });
      }

      const normalizedType = normalizeDepositType(date.deposit_type);
      if (date.deposit_type !== normalizedType) {
        form.setValue(`dates.${index}.deposit_type`, normalizedType, {
          shouldValidate: false,
        });
      }
    });
  }, [watchedDates, form]);

  const syncDatesFromFieldPaths = useCallback(
    (dates: StepFiveType["dates"] | undefined): StepFiveType["dates"] => {
      if (!dates || dates.length === 0) {
        return [getDefaultDate("tickets")];
      }

      return dates.map((fallbackDate, index) => {
        const dateEntry =
          (form.getValues(`dates.${index}`) as
            | StepFiveType["dates"][number]
            | undefined) ?? fallbackDate;
        const paymentType = form.getValues(`dates.${index}.payment_type`);
        const isDepositPayment = paymentType === "deposit";
        const depositType = form.getValues(`dates.${index}.deposit_type`);
        const depositValue =
          form.getValues(`dates.${index}.deposit_value`) ??
          dateEntry.deposit_value;
        const depositDueDate =
          form.getValues(`dates.${index}.deposit_due_date`) ??
          dateEntry.deposit_due_date;

        return {
          ...fallbackDate,
          ...dateEntry,
          payment_type: paymentType ?? dateEntry.payment_type,
          is_deposit_enabled: isDepositPayment,
          deposit_type: isDepositPayment
            ? normalizeDepositType(depositType ?? dateEntry.deposit_type)
            : undefined,
          deposit_value: isDepositPayment ? depositValue : undefined,
          deposit_due_date: isDepositPayment ? depositDueDate : undefined,
        };
      });
    },
    [form],
  );

  // Keep global onboarding form in sync so the split preview (FormPreview) updates live.
  // Previously stepFive was only written on Save & Next, so duplicate/add date never appeared in preview.
  useEffect(() => {
    const pushToGlobal = () => {
      if (roomScope.isMultiRoom && isRoomSwitchHydratingRef.current) {
        return;
      }

      const data = form.getValues();
      const syncedDates = syncDatesFromFieldPaths(data.dates);
      const localDates = cleanDatesData(syncedDates);
      const incomingDates = cleanDatesData(activeScopedDates);

      // Do not clobber hydrated room data with the temporary blank default on first mount.
      if (
        roomScope.isMultiRoom &&
        hasMeaningfulDateData(incomingDates) &&
        !hasMeaningfulDateData(localDates)
      ) {
        return;
      }

      const currentGlobalStepFive = globalForm.getValues("stepFive");
      const nextGlobalStepFive = {
        ...data,
        dates: syncedDates,
        event_id: eventId,
      };
      const shouldWriteStepFive =
        JSON.stringify(currentGlobalStepFive?.dates ?? []) !==
          JSON.stringify(nextGlobalStepFive.dates ?? []) ||
        Number(currentGlobalStepFive?.event_id ?? 0) !== Number(eventId);

      if (shouldWriteStepFive) {
        globalForm.setValue("stepFive", nextGlobalStepFive, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }

      if (roomScope.isMultiRoom) {
        const currentRoomDates = globalForm.getValues(
          `multiSpace.rooms.${currentRoomIndex}.dates`,
        ) as { dates?: StepFiveType["dates"] } | undefined;
        const roomDatesFromStore = currentRoomDates?.dates ?? [];
        const localHasData = hasMeaningfulDateData(syncedDates);
        const roomHasData = hasMeaningfulDateData(roomDatesFromStore);

        // Critical hydration guard:
        // on first mount after API hydrate, local form may still hold default blank rows.
        // Never overwrite real room data with those temporary blanks.
        if (roomHasData && !localHasData) {
          return;
        }

        if (!localHasData) {
          return;
        }

        const shouldWriteRoomDates =
          JSON.stringify(roomDatesFromStore ?? []) !==
          JSON.stringify(syncedDates);
        if (shouldWriteRoomDates) {
          globalForm.setValue(
            `multiSpace.rooms.${currentRoomIndex}.dates`,
            { dates: syncedDates },
            { shouldValidate: false, shouldDirty: true },
          );
        }
      } else {
        return;
      }
    };

    pushToGlobal();
    const subscription = form.watch(() => {
      pushToGlobal();
    });
    return () => subscription.unsubscribe();
  }, [
    form,
    globalForm,
    eventId,
    roomScope.isMultiRoom,
    currentRoomIndex,
    cleanDatesData,
    activeScopedDates,
    syncDatesFromFieldPaths,
  ]);

  // Update dates when booking type changes for a specific date
  const updateDate = useCallback(
    (dateIndex: number, bookingType: "tickets" | "tables" | "both") => {
      const currentDate = form.getValues(`dates.${dateIndex}`);

      // Update tickets/tables arrays based on the booking type
      if (bookingType === "tickets") {
        form.setValue(
          `dates.${dateIndex}.total_ticket_types`,
          currentDate.tickets?.length || 1,
        );
        form.setValue(`dates.${dateIndex}.total_table_types`, 0);

        // Make sure we have at least one ticket
        if (!currentDate.tickets || currentDate.tickets.length === 0) {
          form.setValue(`dates.${dateIndex}.tickets`, [
            {
              title: "",
              description: "",
              total_capacity: "",
              price: "",
              discount_type: "none",
              discount_value: "",
            },
          ]);
        }

        // Clear tables and payment fields for tickets-only
        form.setValue(`dates.${dateIndex}.tables`, []);
        form.setValue(`dates.${dateIndex}.payment_type`, undefined);
        form.setValue(`dates.${dateIndex}.is_deposit_enabled`, undefined);
        form.setValue(`dates.${dateIndex}.deposit_type`, undefined);
        form.setValue(`dates.${dateIndex}.deposit_value`, undefined);
        form.setValue(`dates.${dateIndex}.deposit_due_date`, undefined);
      } else if (bookingType === "tables") {
        form.setValue(`dates.${dateIndex}.total_ticket_types`, 0);
        form.setValue(
          `dates.${dateIndex}.total_table_types`,
          currentDate.tables?.length || 1,
        );

        // Make sure we have at least one table
        if (!currentDate.tables || currentDate.tables.length === 0) {
          form.setValue(`dates.${dateIndex}.tables`, [
            {
              min_persons: "",
              max_persons: "",
              price: "",
              total_tables: "",
              discount_type: "none",
              discount_value: "",
            },
          ]);
        }

        // Clear tickets and set default payment fields for tables
        form.setValue(`dates.${dateIndex}.tickets`, []);
        form.setValue(`dates.${dateIndex}.payment_type`, "full");
        form.setValue(`dates.${dateIndex}.is_deposit_enabled`, false);
        form.setValue(`dates.${dateIndex}.deposit_type`, undefined);
        form.setValue(`dates.${dateIndex}.deposit_value`, undefined);
        form.setValue(`dates.${dateIndex}.deposit_due_date`, undefined);
      } else {
        // both
        form.setValue(
          `dates.${dateIndex}.total_ticket_types`,
          currentDate.tickets?.length || 1,
        );
        form.setValue(
          `dates.${dateIndex}.total_table_types`,
          currentDate.tables?.length || 1,
        );

        // Make sure we have at least one ticket
        if (!currentDate.tickets || currentDate.tickets.length === 0) {
          form.setValue(`dates.${dateIndex}.tickets`, [
            {
              title: "",
              description: "",
              total_capacity: "",
              price: "",
              discount_type: "none",
              discount_value: "",
            },
          ]);
        }

        // Make sure we have at least one table
        if (!currentDate.tables || currentDate.tables.length === 0) {
          form.setValue(`dates.${dateIndex}.tables`, [
            {
              min_persons: "",
              max_persons: "",
              price: "",
              total_tables: "",
              discount_type: "none",
              discount_value: "",
            },
          ]);
        }

        // Set default payment fields for both
        form.setValue(`dates.${dateIndex}.payment_type`, "full");
        form.setValue(`dates.${dateIndex}.is_deposit_enabled`, false);
        form.setValue(`dates.${dateIndex}.deposit_type`, undefined);
        form.setValue(`dates.${dateIndex}.deposit_value`, undefined);
        form.setValue(`dates.${dateIndex}.deposit_due_date`, undefined);
      }
    },
    [form],
  );

  // Add date with default booking type of tickets
  const handleAddDate = useCallback(() => {
    append(getDefaultDate("tickets"));
  }, [append]);

  // Helper function to validate date uniqueness and order
  const validateDateUniqueness = useCallback(
    (dateIndex: number, newDate: string) => {
      const allDates = form.getValues("dates");
      const otherDates = allDates
        .map((date, index) => (index !== dateIndex ? date.event_date : null))
        .filter(Boolean);

      // Check for duplicate dates
      if (otherDates.includes(newDate)) {
        toast.error(
          "This date is already selected. Please choose a different date.",
        );
        return false;
      }

      return true;
    },
    [form],
  );

  const sortDatesStable = useCallback(() => {
    const currentDates = form.getValues("dates");
    if (!currentDates || currentDates.length <= 1) return;

    const sortedDates = sortDateFieldArrayWithIds(dateFields, currentDates);
    if (!hasEventDateOrderChanged(currentDates, sortedDates)) return;

    replace(sortedDates as StepFiveType["dates"]);
  }, [dateFields, form, replace]);

  const commitEventDate = useCallback(
    (dateIndex: number, newDate: string) => {
      if (newDate && !validateDateUniqueness(dateIndex, newDate)) {
        return false;
      }
      form.setValue(`dates.${dateIndex}.event_date`, newDate, {
        shouldValidate: true,
        shouldDirty: true,
      });
      sortDatesStable();
      return true;
    },
    [form, sortDatesStable, validateDateUniqueness],
  );

  // Create custom field arrays for tickets - now checks individual date's booking type
  const createTicketFields = useCallback(
    (dateIndex: number) => {
      const dateBookingType = form.watch(`dates.${dateIndex}.booking_type`);

      if (dateBookingType !== "tickets" && dateBookingType !== "both")
        return null;

      return (
        <>
          <OnboardingFieldGroupTitle>
            Ticket information
          </OnboardingFieldGroupTitle>
          <div className="mt-5 space-y-4 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tickets =
                    form.getValues(`dates.${dateIndex}.tickets`) || [];
                  form.setValue(`dates.${dateIndex}.tickets`, [
                    ...tickets,
                    {
                      title: "",
                      description: "",
                      total_capacity: "",
                      price: "",
                    },
                  ]);
                }}
                className="border-white/20 bg-white/[0.04] hover:bg-white/[0.08]"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Ticket
              </Button>
            </div>

            <div className="mt-2 space-y-3">
              {form
                .watch(`dates.${dateIndex}.tickets`)
                ?.map((_, ticketIndex) => (
                  <div
                    key={`ticket-${dateIndex}-${ticketIndex}`}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                  >
                    <FormField
                      control={form.control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.title`}
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 25;
                        return (
                          <FormItem>
                            <FormLabel className="text-md font-medium">
                              Ticket name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Standard Ticket"
                                {...field}
                                className="w-full h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus(
                                    `dates.${dateIndex}.tickets.${ticketIndex}.title`,
                                  )
                                }
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span
                                className={
                                  currentLength > maxLength
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {currentLength}/{maxLength} characters
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.description`}
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 160;
                        return (
                          <FormItem>
                            <FormLabel className="text-md font-medium">
                              Description
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Access to all areas"
                                {...field}
                                className="w-full h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus(
                                    `dates.${dateIndex}.tickets.${ticketIndex}.description`,
                                  )
                                }
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span
                                className={
                                  currentLength > maxLength
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {currentLength}/{maxLength} characters
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-md font-medium">
                            Total tickets
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100000"
                              step="1"
                              {...field}
                              placeholder="Enter number of tickets (max 100,000)"
                              value={field.value ?? ""}
                              className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange("");
                                } else {
                                  const numValue = parseInt(value, 10);
                                  if (!isNaN(numValue) && numValue >= 1) {
                                    // Cap at 100000
                                    if (numValue > 100000) {
                                      field.onChange(100000);
                                    } else {
                                      field.onChange(numValue);
                                    }
                                  }
                                }
                              }}
                              onFocus={() =>
                                handleFieldFocus(
                                  `dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`,
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-md font-medium">
                            Price / person
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="9999"
                              step="1"
                              {...field}
                              placeholder="Enter price (max 9,999)"
                              value={field.value ?? ""}
                              className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange("");
                                } else {
                                  const numValue = parseInt(value, 10);
                                  if (!isNaN(numValue) && numValue >= 1) {
                                    // Cap at 9999 (4 digits max)
                                    if (numValue > 9999) {
                                      field.onChange(9999);
                                    } else {
                                      field.onChange(numValue);
                                    }
                                  }
                                }
                              }}
                              onFocus={() =>
                                handleFieldFocus(
                                  `dates.${dateIndex}.tickets.${ticketIndex}.price`,
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Remove ticket button */}
                    <div className="col-span-1 md:col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        onClick={() => {
                          const tickets =
                            form.getValues(`dates.${dateIndex}.tickets`) || [];
                          if (tickets.length > 1) {
                            const updatedTickets = tickets.filter(
                              (_, i) => i !== ticketIndex,
                            );
                            form.setValue(
                              `dates.${dateIndex}.tickets`,
                              updatedTickets,
                            );
                            form.setValue(
                              `dates.${dateIndex}.total_ticket_types`,
                              updatedTickets.length,
                            );
                          } else {
                            toast.error("You must have at least one ticket");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Ticket
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      );
    },
    [form, handleFieldFocus],
  );

  // Create custom field arrays for tables - now checks individual date's booking type
  const createTableFields = useCallback(
    (dateIndex: number) => {
      const dateBookingType = form.watch(`dates.${dateIndex}.booking_type`);

      if (dateBookingType !== "tables" && dateBookingType !== "both")
        return null;

      return (
        <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <OnboardingFieldGroupTitle>
              Table information
            </OnboardingFieldGroupTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/[0.04] hover:bg-white/[0.08]"
              onClick={() => {
                const tables =
                  form.getValues(`dates.${dateIndex}.tables`) || [];
                form.setValue(`dates.${dateIndex}.tables`, [
                  ...tables,
                  {
                    min_persons: "",
                    max_persons: "",
                    price: "",
                    total_tables: "",
                  },
                ]);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>

          <div className="space-y-3">
            {form.watch(`dates.${dateIndex}.tables`)?.map((_, tableIndex) => (
              <div
                key={`table-${dateIndex}-${tableIndex}`}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 rounded-lg border border-white/10 bg-white/[0.03] p-4"
              >
                <FormField
                  control={form.control}
                  name={`dates.${dateIndex}.tables.${tableIndex}.min_persons`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-sm font-medium leading-snug"
                        title="Minimum number of people per table"
                      >
                        Min. people / table
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="500"
                          step="1"
                          {...field}
                          placeholder="Enter minimum people"
                          value={field.value ?? ""}
                          className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty value
                            if (value === "") {
                              field.onChange("");
                              return;
                            }

                            // Allow typing any numeric value - don't restrict during typing
                            const numValue = parseInt(value, 10);
                            if (!isNaN(numValue)) {
                              // Only cap at 500 if user types beyond limit
                              if (numValue > 500) {
                                field.onChange(500);
                              } else {
                                // Allow any number, even if temporarily invalid (e.g., typing "4" to get "43")
                                field.onChange(numValue);
                              }
                            } else {
                              // Allow the raw value if not a number (will be caught by schema)
                              field.onChange(value);
                            }
                          }}
                          onBlur={async () => {
                            // Validate cross-field comparison on blur
                            const currentMin = form.getValues(
                              `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                            );
                            const maxPersons = form.getValues(
                              `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                            );

                            if (
                              currentMin &&
                              maxPersons &&
                              currentMin > maxPersons
                            ) {
                              form.setError(
                                `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                                {
                                  type: "manual",
                                  message:
                                    "Minimum people cannot be greater than maximum people",
                                },
                              );
                            } else {
                              // Clear error if valid
                              await form.trigger(
                                `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                              );
                            }
                          }}
                          onFocus={() =>
                            handleFieldFocus(
                              `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`dates.${dateIndex}.tables.${tableIndex}.max_persons`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className="text-sm font-medium leading-snug"
                        title="Maximum number of people per table"
                      >
                        Max. people / table
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="500"
                          step="1"
                          {...field}
                          placeholder="Enter maximum people"
                          value={field.value ?? ""}
                          className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty value
                            if (value === "") {
                              field.onChange("");
                              return;
                            }

                            // Allow typing any numeric value - don't restrict during typing
                            const numValue = parseInt(value, 10);
                            if (!isNaN(numValue)) {
                              // Only cap at 500 if user types beyond limit
                              if (numValue > 500) {
                                field.onChange(500);
                              } else {
                                // Allow any number, even if temporarily invalid (e.g., typing "4" to get "43")
                                field.onChange(numValue);
                              }
                            } else {
                              // Allow the raw value if not a number (will be caught by schema)
                              field.onChange(value);
                            }
                          }}
                          onBlur={async () => {
                            // Validate cross-field comparison on blur
                            const minPersons = form.getValues(
                              `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                            );
                            const currentMax = form.getValues(
                              `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                            );

                            if (
                              minPersons &&
                              currentMax &&
                              currentMax < minPersons
                            ) {
                              form.setError(
                                `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                                {
                                  type: "manual",
                                  message:
                                    "Maximum people cannot be less than minimum people",
                                },
                              );
                            } else {
                              // Clear error if valid
                              await form.trigger(
                                `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                              );
                            }
                          }}
                          onFocus={() =>
                            handleFieldFocus(
                              `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`dates.${dateIndex}.tables.${tableIndex}.price`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Price / person
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="9999"
                          step="1"
                          {...field}
                          placeholder="Enter price (max 9,999)"
                          value={field.value ?? ""}
                          className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange("");
                            } else {
                              const numValue = parseInt(value, 10);
                              if (!isNaN(numValue) && numValue >= 0) {
                                // Cap at 9999 (4 digits max)
                                if (numValue > 9999) {
                                  field.onChange(9999);
                                } else {
                                  field.onChange(numValue);
                                }
                              }
                            }
                          }}
                          onFocus={() =>
                            handleFieldFocus(
                              `dates.${dateIndex}.tables.${tableIndex}.price`,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`dates.${dateIndex}.tables.${tableIndex}.total_tables`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Total tables
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="5000"
                          step="1"
                          {...field}
                          placeholder="Enter number of tables (max 5,000)"
                          value={field.value ?? ""}
                          className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange("");
                            } else {
                              const numValue = parseInt(value, 10);
                              if (!isNaN(numValue) && numValue >= 1) {
                                // Cap at 5000
                                if (numValue > 5000) {
                                  field.onChange(5000);
                                } else {
                                  field.onChange(numValue);
                                }
                              }
                            }
                          }}
                          onFocus={() =>
                            handleFieldFocus(
                              `dates.${dateIndex}.tables.${tableIndex}.total_tables`,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remove table button */}
                <div className="col-span-1 md:col-span-2 flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    onClick={() => {
                      const tables =
                        form.getValues(`dates.${dateIndex}.tables`) || [];
                      if (tables.length > 1) {
                        const updatedTables = tables.filter(
                          (_, i) => i !== tableIndex,
                        );
                        form.setValue(
                          `dates.${dateIndex}.tables`,
                          updatedTables,
                        );
                        form.setValue(
                          `dates.${dateIndex}.total_table_types`,
                          updatedTables.length,
                        );
                      } else {
                        toast.error("You must have at least one table");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Table
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },
    [form, handleFieldFocus],
  );

  const renderDateFields = useCallback(
    (dateIndex: number, dateRowId: string) => {
      const dateValue = form.watch(`dates.${dateIndex}.event_date`);
      const isOpen = openAccordions.includes(dateRowId);
      const safeDepositType = normalizeDepositType(
        form.watch(`dates.${dateIndex}.deposit_type`),
      );

      return (
        <div
          key={dateRowId}
          className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/15"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpenAccordions((prev) =>
                    isOpen
                      ? prev.filter((item) => item !== dateRowId)
                      : [...prev, dateRowId],
                  );
                }}
                className="flex min-w-0 items-center gap-2 text-left transition-colors hover:text-[var(--color-primary,#3b82f6)]"
              >
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <h3 className="text-base font-semibold sm:text-lg">
                  {formatDateDisplay(dateValue)}
                </h3>
              </button>
            </div>
            {dateFields.length > 1 && (
              <Button
                type="button"
                variant="destructive"
                className="text-destructive hover:text-white bg-destructive/10"
                size="sm"
                onClick={() => remove(dateIndex)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Date
              </Button>
            )}
          </div>

          {isOpen && (
            <div className="space-y-5 px-4 py-5 sm:px-5">
              <div className="grid grid-cols-1 gap-5">
                <FormField
                  control={form.control}
                  name={`dates.${dateIndex}.event_date`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-md font-medium">
                        Event date
                      </FormLabel>
                      <FormControl>
                        <div className="relative w-full">
                          <EventDateInput
                            placeholder="Select date"
                            name={field.name}
                            ref={field.ref}
                            value={field.value ?? ""}
                            min={getTodayDateString()}
                            className="w-full h-11 bg-white/5 border-white/10 focus:ring-2 focus:ring-blue-500"
                            onFocus={() =>
                              handleFieldFocus(`dates.${dateIndex}.event_date`)
                            }
                            onValueCommit={(newDate) =>
                              commitEventDate(dateIndex, newDate)
                            }
                          />
                          {!field.value && (
                            <span
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground sm:hidden"
                              aria-hidden
                            >
                              dd-mm-yyyy
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Booking type dropdown for each date */}
                <FormField
                  control={form.control}
                  name={`dates.${dateIndex}.booking_type`}
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-md font-medium">
                        Is it a ticketed or seated event?
                      </FormLabel>
                      <p className="text-xs text-muted-foreground mb-1">
                        Defaults to Tickets — switch to Tables or Both if guests
                        reserve seats.
                      </p>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(
                            value: "tickets" | "tables" | "both",
                          ) => {
                            field.onChange(value);
                            // Update the date structure based on the new booking type
                            updateDate(dateIndex, value);
                            handleFieldFocus(`dates.${dateIndex}.booking_type`);
                          }}
                          onOpenChange={() =>
                            handleFieldFocus(`dates.${dateIndex}.booking_type`)
                          }
                        >
                          <SelectTrigger className="w-full h-12 bg-white/5 border-white/10">
                            <SelectValue placeholder="Select booking type" />
                          </SelectTrigger>
                          <SelectContent className="w-full">
                            <SelectItem value="tickets">Tickets</SelectItem>
                            <SelectItem value="tables">Tables</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tickets/Tables based on booking type */}
              {createTicketFields(dateIndex)}
              {createTableFields(dateIndex)}

              {/* Payment & Display Settings section - only show for tables/both booking types */}
              {(form.watch(`dates.${dateIndex}.booking_type`) === "tables" ||
                form.watch(`dates.${dateIndex}.booking_type`) === "both") && (
                <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                  <OnboardingFieldGroupTitle>
                    Table payment settings
                  </OnboardingFieldGroupTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure payment options for table bookings (deposit or
                    full payment)
                  </p>
                  <div className="space-y-5 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                    {/* Payment Type */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`dates.${dateIndex}.payment_type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-md font-medium">
                              Payment type
                            </FormLabel>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={(value: "full" | "deposit") => {
                                  field.onChange(value);
                                  if (value === "full") {
                                    form.setValue(
                                      `dates.${dateIndex}.is_deposit_enabled`,
                                      false,
                                    );
                                    form.setValue(
                                      `dates.${dateIndex}.deposit_type`,
                                      undefined,
                                    );
                                    form.setValue(
                                      `dates.${dateIndex}.deposit_value`,
                                      undefined,
                                    );
                                    form.setValue(
                                      `dates.${dateIndex}.deposit_due_date`,
                                      undefined,
                                    );
                                  } else {
                                    form.setValue(
                                      `dates.${dateIndex}.is_deposit_enabled`,
                                      true,
                                    );
                                    form.setValue(
                                      `dates.${dateIndex}.deposit_type`,
                                      "amount",
                                      { shouldValidate: false },
                                    );
                                  }
                                  handleFieldFocus(
                                    `dates.${dateIndex}.payment_type`,
                                  );
                                }}
                                className="flex space-x-4 pt-2"
                              >
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <RadioGroupItem value="full" />
                                  <span className="text-sm font-normal">
                                    Full payment
                                  </span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <RadioGroupItem value="deposit" />
                                  <span className="text-sm font-normal">
                                    Deposit
                                  </span>
                                </label>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Conditional deposit fields */}
                    {form.watch(`dates.${dateIndex}.payment_type`) ===
                      "deposit" && (
                      <div className="space-y-4 border-t border-white/10 pt-4">
                        {/* Deposit Type Selection */}
                        <FormField
                          control={form.control}
                          name={`dates.${dateIndex}.deposit_type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-md font-medium">
                                Deposit type
                              </FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={safeDepositType}
                                  onValueChange={(
                                    value: "amount" | "percentage",
                                  ) => {
                                    field.onChange(value);
                                    handleFieldFocus(
                                      `dates.${dateIndex}.deposit_type`,
                                    );
                                    // Clear the deposit_value when switching type
                                    form.setValue(
                                      `dates.${dateIndex}.deposit_value`,
                                      "",
                                    );
                                  }}
                                  className="flex space-x-4 pt-2"
                                >
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <RadioGroupItem value="amount" />
                                    <span className="text-sm font-normal">
                                      Fixed Amount
                                    </span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <RadioGroupItem value="percentage" />
                                    <span className="text-sm font-normal">
                                      Percentage
                                    </span>
                                  </label>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Unified Deposit Value Field */}
                          <FormField
                            control={form.control}
                            name={`dates.${dateIndex}.deposit_value`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {safeDepositType === "amount"
                                    ? "Deposit Amount/Person"
                                    : "Deposit Percentage (%)"}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={
                                      safeDepositType === "percentage"
                                        ? "20"
                                        : "1"
                                    }
                                    max={
                                      safeDepositType === "percentage"
                                        ? "80"
                                        : undefined
                                    }
                                    step="1"
                                    placeholder={
                                      safeDepositType === "amount"
                                        ? "Enter deposit amount"
                                        : "Enter percentage (20-80)"
                                    }
                                    {...field}
                                    value={field.value ?? ""}
                                    className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const depositType = safeDepositType;

                                      // Allow empty value
                                      if (value === "") {
                                        field.onChange("");
                                        return;
                                      }

                                      // Remove any decimal points and non-numeric characters except digits
                                      const cleanedValue = value.replace(
                                        /[^\d]/g,
                                        "",
                                      );

                                      if (cleanedValue === "") {
                                        field.onChange("");
                                        return;
                                      }

                                      const numValue = parseInt(
                                        cleanedValue,
                                        10,
                                      );

                                      if (!isNaN(numValue) && numValue >= 0) {
                                        // For percentage: limit to 100
                                        if (depositType === "percentage") {
                                          if (numValue <= 100) {
                                            field.onChange(numValue);
                                          } else {
                                            field.onChange(100);
                                          }
                                        } else {
                                          // For amount: allow any positive integer
                                          field.onChange(numValue);
                                        }
                                      }
                                    }}
                                    onFocus={() =>
                                      handleFieldFocus(
                                        `dates.${dateIndex}.deposit_value`,
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Balance due date */}
                          <FormField
                            control={form.control}
                            name={`dates.${dateIndex}.deposit_due_date`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Balance due date</FormLabel>
                                <FormControl>
                                  <div className="relative w-full">
                                    <Input
                                      type="date"
                                      placeholder="Select due date"
                                      {...field}
                                      min={getTodayDateString()}
                                      className="w-full h-11 bg-white/5 border-white/10"
                                      onFocus={() =>
                                        handleFieldFocus(
                                          `dates.${dateIndex}.deposit_due_date`,
                                        )
                                      }
                                    />
                                    {!field.value && (
                                      <span
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground sm:hidden"
                                        aria-hidden
                                      >
                                        dd-mm-yyyy
                                      </span>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Duplicate Date Button */}
          <div className="mt-3 flex justify-end border-t border-white/10 px-4 pb-1 pt-3 sm:px-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-[color:var(--color-primary)] border-[color:var(--color-primary)] hover:bg-white/10"
              onClick={() => {
                const currentDate = form.getValues(`dates.${dateIndex}`);
                const newDate = {
                  ...currentDate,
                  event_date: "", // Reset date for new entry
                };
                append(newDate);
                toast.success("Date duplicated! Please set a new event date.");
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          </div>
        </div>
      );
    },
    [
      append,
      commitEventDate,
      createTableFields,
      createTicketFields,
      dateFields.length,
      form,
      handleFieldFocus,
      openAccordions,
      remove,
      updateDate,
    ],
  );

  const handleSubmit = async (applyToAllRooms = false) => {
    setLoading(true);
    try {
      const formData = form.getValues();
      const syncedDates = syncDatesFromFieldPaths(formData.dates);
      const validationPayload = {
        step: 5 as const,
        event_id: eventId,
        dates: syncedDates,
      };

      const validation = stepFiveSchema.safeParse(validationPayload);

      if (!validation.success) {
        form.clearErrors("dates");
        validation.error.issues.forEach((issue) => {
          if (issue.path[0] !== "dates") return;
          const fieldPath = issue.path.join(".");
          form.setError(fieldPath as never, {
            type: "manual",
            message: issue.message,
          });
        });

        const dateErrors: string[] = [];
        const FIELD_LABELS: Record<string, string> = {
          event_date: "event date",
          booking_type: "booking type",
          payment_type: "payment type",
          deposit_type: "deposit type",
          deposit_value: "deposit amount",
          deposit_due_date: "balance due date",
          tickets: "ticket info",
          tables: "table info",
        };

        validation.error.issues.forEach((issue) => {
          if (issue.path[0] !== "dates" || typeof issue.path[1] !== "number") {
            return;
          }
          const fieldKey = String(issue.path[2] ?? "general");
          const label = FIELD_LABELS[fieldKey] ?? fieldKey.replace(/_/g, " ");
          dateErrors.push(`Date ${issue.path[1] + 1}: ${label}`);
        });

        toast.error(
          dateErrors.length > 0
            ? `Please fix — ${Array.from(new Set(dateErrors)).join(" | ")}`
            : "Please complete all date entries before saving",
        );

        setLoading(false);
        return;
      }

      form.clearErrors("dates");
      form.setValue("dates", syncedDates, { shouldValidate: false });

      const data = {
        ...formData,
        event_id: eventId,
        dates: cleanDatesData(syncedDates),
      };

      globalForm.setValue("stepFive", data);

      // Branch on multi-room mode. In single-room mode this calls the existing endpoint
      // unchanged; in multi-room mode it dispatches to the room-scoped endpoint and mirrors
      // the saved data into `multiSpace.rooms[currentRoomIndex].dates`.
      const succeeded = await roomScope.saveSection({
        stepData: { ...data, isApproved: true } as StepFiveType,
        applyToAllRooms,
        singleRoomSave: async () => {
          const response = await onboardingService.storeStepFiveData({
            ...data,
            isApproved: true,
          });
          if (response && response.status) {
            globalForm.setValue("stepFive", { ...data, isApproved: true });
            return true;
          }
          console.error("API Error:", response);
          return false;
        },
      });

      if (succeeded) {
        if (roomScope.isMultiRoom && !applyToAllRooms) {
          const updatedRooms = (globalForm.getValues("multiSpace")?.rooms ??
            []) as typeof rooms;
          if (
            focusNextIncompleteOnboardingRoom(
              updatedRooms,
              "dates",
              currentRoomIndex,
              setCurrentRoomIndex,
            )
          ) {
            return;
          }
        }
        await save();
        clearActiveField();
        setActiveStep(6);
        updateSession({ on_boarding_step: 6 }).catch((error) => {
          console.error("Background save error:", error);
        });
      }
    } catch (error) {
      console.error("Error during step submission:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-8 px-4">
      <OnboardingCard className="w-full max-w-4xl mb-4">
        <CardHeader className="text-center pb-2">
          <OnboardingTitle>Tell us about your event booking</OnboardingTitle>
        </CardHeader>

        <CardContent className="px-6 py-4">
          {/* Per-room tab bar shown only when multi-space mode is enabled. */}
          <MultiSpaceHeader section="dates" />

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <input type="hidden" {...form.register("event_id")} />

              <WholeStepGuidedShell
                form={form}
                sectionId="step-five-booking"
                chipLabel="Event Dates & Pricing"
                chipDescription="Set dates, booking type, and pricing for each slot."
                persistenceHydrated={persistedProgressHydrated}
                persistedStepApproved={stepFivePersistedApproved}
                renderFooter={({ guided }) => (
                  <GuidedWholeStepBottomActions
                    guided={guided}
                    loading={loading}
                    alwaysShowReadyLabel={roomScope.isMultiRoom}
                    labelWhenReady={
                      roomScope.isMultiRoom
                        ? "Apply to this room only"
                        : "Save & continue"
                    }
                    onContinue={() => void handleSubmit()}
                    extraActions={
                      canShowApplyToAllButton(rooms, canApplyToAllRooms) ? (
                        <Button
                          variant="event-outline"
                          type="button"
                          onClick={() => void handleSubmit(true)}
                          className={guidedOnboardingSkipButtonClass}
                        >
                          Apply to all rooms
                        </Button>
                      ) : !roomScope.isMultiRoom ? (
                        <Button
                          variant="event-outline"
                          type="button"
                          onClick={() => setActiveStep(6)}
                          className={guidedOnboardingSkipButtonClass}
                        >
                          Skip
                        </Button>
                      ) : null
                    }
                  />
                )}
              >
                {() => (
                  <div className="w-full space-y-5">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Set your event dates, payment options, and pricing
                        details
                      </p>
                    </div>

                    {dateFields.map((field, index) =>
                      renderDateFields(index, field.id),
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="flex w-full items-center justify-center gap-2 border-white/20 bg-white/[0.03] hover:bg-white/[0.06]"
                      onClick={handleAddDate}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Another Date
                    </Button>
                  </div>
                )}
              </WholeStepGuidedShell>
            </form>
          </Form>
        </CardContent>
      </OnboardingCard>
    </div>
  );
}
