"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventsService,
  type StepThreeSavePayload,
} from "@/services/vendor/events/events.service";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StepThreeType, stepThreeSchema } from "../schema";
import { useEventFormContext } from "../../events-form-provider";
import {
  capEventRoomList,
  normalizeVendorStepTwoRooms,
} from "@/lib/event-form-limits";
import {
  cleanVendorStepThreeDatesForForm,
  cloneDateRowForDuplicate,
  findStepThreeDatesForRoom,
  hasMeaningfulVendorDates,
  isVendorDateCancelled,
  isVendorDateReadonlyCancelled,
  normalizeVendorStepThreeRooms,
  shouldUseCancelDateAction,
  syncStepThreeRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-three-rooms";
import { eventKeys as vendorEventDetailKeys } from "../../../_lib/hooks/useEventData";
import { eventKeys as vendorEventsListKeys } from "../../../_lib/queries";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlusCircle,
  Trash2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// Helper function to format date consistently as DD-MM-YYYY (matches onboarding step-5)
const formatDateDisplay = (dateString: string | undefined | null): string => {
  if (!dateString) return "New Date";

  try {
    // Handle YYYY-MM-DD format (from date input)
    const date = new Date(dateString + "T00:00:00"); // Add time to avoid timezone issues

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

// Helper function to get default date structure
const getDefaultDate = (
  bookingType: "tickets" | "tables" | "both" = "tickets",
) => {
  const baseDate = {
    event_date: "",
    booking_type: bookingType,
  };

  switch (bookingType) {
    case "tickets":
      return {
        ...baseDate,
        total_ticket_types: 1,
        tickets: [
          {
            title: "",
            description: "",
            total_capacity: "",
            price: "",
            status: true,
          },
        ],
        total_table_types: 0,
        tables: [],
      };
    case "tables":
      return {
        ...baseDate,
        payment_type: "full" as const,
        is_deposit_enabled: false,
        deposit_type: "amount" as const,
        deposit_value: "",
        deposit_due_date: "",
        total_table_types: 1,
        tables: [
          {
            min_persons: 1,
            max_persons: 1,
            price: 10,
            total_tables: 1,
            status: true,
          },
        ],
        total_ticket_types: 0,
        tickets: [],
      };
    case "both":
      return {
        ...baseDate,
        payment_type: "full" as const,
        is_deposit_enabled: false,
        deposit_type: "amount" as const,
        deposit_value: "",
        deposit_due_date: "",
        total_table_types: 1,
        tables: [
          {
            min_persons: 1,
            max_persons: 1,
            price: 10,
            total_tables: 1,
            status: true,
          },
        ],
        total_ticket_types: 1,
        tickets: [
          {
            title: "",
            description: "",
            total_capacity: 1,
            price: 10,
            status: true,
          },
        ],
      };
  }
};

export default function DatesTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [emptyDatesConfirmOpen, setEmptyDatesConfirmOpen] = useState(false);
  const [cancelReasonDialogOpen, setCancelReasonDialogOpen] = useState(false);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState<string | null>(
    null,
  );
  const [targetCancelDateIndex, setTargetCancelDateIndex] = useState<
    number | null
  >(null);
  const skipEmptyDatesConfirmRef = useRef(false);
  const prevDateFieldCountRef = useRef<number | undefined>(undefined);
  const previousRoomIndexRef = useRef<number | null>(null);
  const lastHydratedRoomIndexRef = useRef<number | null>(null);
  /** Row open state keyed by useFieldArray `field.id` (same collapse pattern as onboarding step 5). */
  const [openDateRowIds, setOpenDateRowIds] = useState<string[]>([]);
  const { form: globalForm, advanceStep, markEventFormSaved, readOnly } = useEventFormContext();

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  const isRoomsEnabled = globalForm.watch("stepTwo.is_rooms") === 1;
  const activeRoomIndex = globalForm.watch("stepTwo.active_room_index") ?? 0;
  const watchedStepTwoRooms = useWatch({
    control: globalForm.control,
    name: "stepTwo.rooms",
  });
  const stepTwoRooms = useMemo(
    () => capEventRoomList(normalizeVendorStepTwoRooms(watchedStepTwoRooms)),
    [watchedStepTwoRooms],
  );
  const resolvedRoomIndex =
    stepTwoRooms.length > 0
      ? Math.min(
          Math.max(activeRoomIndex, 0),
          Math.max(stepTwoRooms.length - 1, 0),
        )
      : 0;
  const activeRoomId = Number(stepTwoRooms[resolvedRoomIndex]?.room_id) || 0;

  const resolveInitialDates = (): StepThreeType["dates"] => {
    const stepThreeDefaults = globalForm.getValues().stepThree;
    if (isRoomsEnabled && activeRoomId > 0) {
      const syncedRooms = syncStepThreeRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepThreeRooms(stepThreeDefaults?.rooms),
      );
      const roomDates = findStepThreeDatesForRoom(syncedRooms, activeRoomId);
      if (roomDates.length > 0) {
        return cleanVendorStepThreeDatesForForm(roomDates);
      }
      return [getDefaultDate("tickets")];
    }
    if (stepThreeDefaults?.dates && stepThreeDefaults.dates.length > 0) {
      return cleanVendorStepThreeDatesForForm(stepThreeDefaults.dates);
    }
    return [getDefaultDate("tickets")];
  };

  // Initialize form with combined step data
  const stepThreeDefaults = globalForm.getValues().stepThree;
  const eventId = getEventId();

  // Setup form with the new schema structure
  const stepOneLocationId = globalForm.getValues().stepOne?.vendor_location_id;

  const form = useForm<StepThreeType>({
    resolver: zodResolver(stepThreeSchema) as Resolver<StepThreeType>,
    defaultValues: {
      step: 3,
      event_id: eventId,
      vendor_location_id:
        stepThreeDefaults?.vendor_location_id ??
        (stepOneLocationId && stepOneLocationId >= 1
          ? stepOneLocationId
          : undefined),
      is_rooms: isRoomsEnabled ? 1 : 0,
      dates: resolveInitialDates(),
      rooms: syncStepThreeRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepThreeRooms(stepThreeDefaults?.rooms),
      ),
    } as StepThreeType,
    mode: "onChange",
  });

  // Update form when eventId changes
  useEffect(() => {
    form.setValue("event_id", eventId);
  }, [eventId, form]);

  const watchedStepOneLocation = globalForm.watch("stepOne.vendor_location_id");
  useEffect(() => {
    const locationId = Number(watchedStepOneLocation);
    if (Number.isFinite(locationId) && locationId >= 1) {
      form.setValue("vendor_location_id", locationId);
    }
  }, [watchedStepOneLocation, form]);

  const { control, watch, setValue, setError, clearErrors, trigger, getValues, reset } =
    form;

  const watchedDates = useWatch({
    control: form.control,
    name: "dates",
  });

  const canApplyToAllRooms = useMemo(() => {
    if (!isRoomsEnabled || stepTwoRooms.length < 2) return false;
    return hasMeaningfulVendorDates(watchedDates);
  }, [isRoomsEnabled, stepTwoRooms.length, watchedDates]);

  const persistActiveRoomDatesToGlobal = useCallback(
    (roomIndex: number, dates: StepThreeType["dates"]) => {
      if (!isRoomsEnabled || stepTwoRooms.length === 0) return;
      const existing = syncStepThreeRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepThreeRooms(globalForm.getValues().stepThree?.rooms),
      );
      const roomId = Number(stepTwoRooms[roomIndex]?.room_id);
      if (!roomId) return;
      const cleaned = cleanVendorStepThreeDatesForForm(dates);
      const nextRooms = existing.map((entry) =>
        entry.room_id === roomId
          ? {
              ...entry,
              dates: hasMeaningfulVendorDates(cleaned) ? cleaned : [],
            }
          : entry,
      );
      globalForm.setValue("stepThree.rooms", nextRooms, {
        shouldDirty: true,
        shouldValidate: false,
      });
    },
    [globalForm, isRoomsEnabled, stepTwoRooms],
  );

  // Rehydrate local dates when switching rooms in room system mode.
  useEffect(() => {
    if (!isRoomsEnabled || stepTwoRooms.length === 0) {
      previousRoomIndexRef.current = null;
      lastHydratedRoomIndexRef.current = null;
      return;
    }

    const prevIndex = previousRoomIndexRef.current;
    if (
      prevIndex !== null &&
      prevIndex >= 0 &&
      prevIndex < stepTwoRooms.length &&
      prevIndex !== resolvedRoomIndex
    ) {
      persistActiveRoomDatesToGlobal(prevIndex, getValues("dates"));
    }

    const shouldHydrate =
      lastHydratedRoomIndexRef.current === null ||
      lastHydratedRoomIndexRef.current !== resolvedRoomIndex;

    if (shouldHydrate) {
      const syncedRooms = syncStepThreeRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepThreeRooms(globalForm.getValues().stepThree?.rooms),
      );
      const incoming = findStepThreeDatesForRoom(
        syncedRooms,
        Number(stepTwoRooms[resolvedRoomIndex]?.room_id),
      );
      const nextDates =
        incoming.length > 0
          ? cleanVendorStepThreeDatesForForm(incoming)
          : [getDefaultDate("tickets")];
      reset({
        ...getValues(),
        is_rooms: 1,
        dates: nextDates,
        rooms: syncedRooms,
      });
      lastHydratedRoomIndexRef.current = resolvedRoomIndex;
    }

    previousRoomIndexRef.current = resolvedRoomIndex;
  }, [
    getValues,
    globalForm,
    isRoomsEnabled,
    persistActiveRoomDatesToGlobal,
    reset,
    resolvedRoomIndex,
    stepTwoRooms,
  ]);

  // Setup field array for dates
  const {
    fields: dateFields,
    append,
    remove,
    replace,
  } = useFieldArray({
    control,
    name: "dates",
  });

  // Open newly added / duplicated rows automatically (matches onboarding step 5 behavior).
  useEffect(() => {
    const len = dateFields.length;
    if (
      prevDateFieldCountRef.current !== undefined &&
      len > prevDateFieldCountRef.current
    ) {
      const lastField = dateFields[len - 1];
      if (lastField) {
        setOpenDateRowIds((prev) =>
          prev.includes(lastField.id) ? prev : [...prev, lastField.id],
        );
      }
    }
    prevDateFieldCountRef.current = len;
  }, [dateFields]);

  const requestCancelDate = useCallback(
    (dateIndex: number) => {
      if (readOnly) return;
      const dateRow = watch(`dates.${dateIndex}`);
      if (isVendorDateReadonlyCancelled(dateRow)) return;
      const existingReason = watch(`dates.${dateIndex}.cancel_reason`) || "";
      setTargetCancelDateIndex(dateIndex);
      setCancelReasonText(existingReason);
      setCancelReasonError(null);
      setCancelReasonDialogOpen(true);
    },
    [readOnly, watch],
  );

  const confirmCancelDate = useCallback(() => {
    if (targetCancelDateIndex === null) return;
    const reason = cancelReasonText.trim();
    if (!reason) {
      setCancelReasonError(
        "Please provide a reason before cancelling this date.",
      );
      return;
    }

    setValue(`dates.${targetCancelDateIndex}.cancelled`, true);
    setValue(`dates.${targetCancelDateIndex}.cancel_reason`, reason);
    setCancelReasonDialogOpen(false);
    setTargetCancelDateIndex(null);
    setCancelReasonText("");
    setCancelReasonError(null);
    toast.info("Date marked as cancelled. Save the form to apply.");
  }, [targetCancelDateIndex, cancelReasonText, setValue]);

  // Update the selected booking options without discarding the inactive option.
  const updateDate = useCallback(
    (dateIndex: number, bookingType: "tickets" | "tables" | "both") => {
      const currentDate = watch(`dates.${dateIndex}`);
      const ticketsEnabled = bookingType === "tickets" || bookingType === "both";
      const tablesEnabled = bookingType === "tables" || bookingType === "both";

      const currentTickets = currentDate.tickets ?? [];
      const currentTables = currentDate.tables ?? [];

      if (ticketsEnabled) {
        setValue(
          `dates.${dateIndex}.total_ticket_types`,
          currentTickets.length || 1,
        );

        if (currentTickets.length === 0) {
          setValue(`dates.${dateIndex}.tickets`, [
            { title: "", description: "", total_capacity: "", price: "" },
          ]);
        }
      } else {
        setValue(`dates.${dateIndex}.total_ticket_types`, 0);
        clearErrors(`dates.${dateIndex}.tickets`);
      }

      if (tablesEnabled) {
        setValue(
          `dates.${dateIndex}.total_table_types`,
          currentTables.length || 1,
        );

        if (currentTables.length === 0) {
          setValue(`dates.${dateIndex}.tables`, [
            { min_persons: "", max_persons: "", price: "", total_tables: "" },
          ]);
        }

        if (!currentDate.payment_type) {
          setValue(`dates.${dateIndex}.payment_type`, "full");
          setValue(`dates.${dateIndex}.is_deposit_enabled`, false);
          setValue(`dates.${dateIndex}.deposit_type`, "amount");
          setValue(`dates.${dateIndex}.deposit_value`, "");
          setValue(`dates.${dateIndex}.deposit_due_date`, "");
        }
      } else {
        setValue(`dates.${dateIndex}.total_table_types`, 0);
        clearErrors(`dates.${dateIndex}.tables`);
      }
    },
    [watch, setValue, clearErrors],
  );

  // Add date with default booking type of tickets
  const handleAddDate = useCallback(() => {
    append(getDefaultDate("tickets"));
  }, [append]);

  // Helper function to validate date uniqueness and order
  const validateDateUniqueness = useCallback(
    (dateIndex: number, newDate: string) => {
      const allDates = watch("dates");
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
    [watch],
  );

  const sortDatesStable = useCallback(() => {
    const currentDates = getValues("dates");
    if (!currentDates || currentDates.length <= 1) return;

    const sortedDates = sortDateFieldArrayWithIds(dateFields, currentDates);
    if (!hasEventDateOrderChanged(currentDates, sortedDates)) return;

    replace(sortedDates as StepThreeType["dates"]);
  }, [dateFields, getValues, replace]);

  const commitEventDate = useCallback(
    (dateIndex: number, newDate: string) => {
      if (newDate && !validateDateUniqueness(dateIndex, newDate)) {
        return false;
      }
      setValue(`dates.${dateIndex}.event_date`, newDate, {
        shouldValidate: true,
        shouldDirty: true,
      });
      sortDatesStable();
      return true;
    },
    [setValue, sortDatesStable, validateDateUniqueness],
  );

  // Create custom field arrays for tickets - now checks individual date's booking type
  const createTicketFields = useCallback(
    (dateIndex: number, locked = false) => {
      const dateBookingType = watch(`dates.${dateIndex}.booking_type`);

      if (dateBookingType !== "tickets" && dateBookingType !== "both")
        return null;

      return (
        <>
          <div className="text-lg font-semibold mb-4">Ticket Information</div>
          <div className="mt-6 bg-gray-50 rounded-lg p-4 sm:p-5">
            {!locked && (
              <div className="flex justify-end items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnly}
                  onClick={() => {
                    const tickets = watch(`dates.${dateIndex}.tickets`) || [];
                    setValue(`dates.${dateIndex}.tickets`, [
                      ...tickets,
                      {
                        title: "",
                        description: "",
                        total_capacity: "",
                        price: "",
                        status: true,
                      },
                    ]);
                  }}
                  className="bg-white hover:bg-gray-100 w-full sm:w-auto"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Ticket
                </Button>
              </div>
            )}

            <div className="mt-4 space-y-4">
              {watch(`dates.${dateIndex}.tickets`)?.map(
                (ticket, ticketIndex: number) => (
                  <div
                    key={`ticket-${dateIndex}-${ticketIndex}`}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-white p-4 sm:p-5 rounded-lg border border-gray-200 shadow-sm relative"
                  >
                    <div className="md:col-span-2 flex justify-between items-center mb-2">
                      <div className="flex items-center gap-4">
                        {ticket && "id" in ticket && (
                          <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                            Sold:{" "}
                            {(ticket as { sold_tickets?: number })
                              .sold_tickets || 0}
                          </div>
                        )}
                        <FormField
                          control={control}
                          name={`dates.${dateIndex}.tickets.${ticketIndex}.status`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormLabel className="text-sm font-medium text-gray-600">
                                Active
                              </FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value ?? true}
                                  onCheckedChange={field.onChange}
                                  disabled={locked || readOnly}
                                  className="data-[state=checked]:bg-green-500"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      {!locked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={readOnly}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const tickets =
                              watch(`dates.${dateIndex}.tickets`) || [];
                            if (tickets.length > 1) {
                              const updatedTickets = tickets.filter(
                                (_: unknown, i: number) => i !== ticketIndex,
                              );
                              setValue(
                                `dates.${dateIndex}.tickets`,
                                updatedTickets,
                              );
                              setValue(
                                `dates.${dateIndex}.total_ticket_types`,
                                updatedTickets.length,
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Remove</span>
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-md font-medium">
                            Ticket Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Standard Ticket"
                              {...field}
                              className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-md font-medium">
                            Description
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Access to all areas"
                              {...field}
                              className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`}
                      render={({ field }) => {
                        const currentTicket = watch(
                          `dates.${dateIndex}.tickets.${ticketIndex}`,
                        );
                        const soldTickets =
                          currentTicket && "sold_tickets" in currentTicket
                            ? (currentTicket as { sold_tickets?: number })
                                .sold_tickets || 0
                            : 0;
                        const minValue = soldTickets > 0 ? soldTickets : 1;

                        return (
                          <FormItem>
                            <FormLabel className="text-md font-medium">
                              Total Tickets
                              {soldTickets > 0 && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (Minimum: {soldTickets} sold)
                                </span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={minValue}
                                max="100000"
                                step="1"
                                {...field}
                                placeholder="Enter number of tickets (max 100,000)"
                                value={field.value ?? ""}
                                className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    field.onChange("");
                                  } else {
                                    const numValue = parseInt(value, 10);
                                    if (!isNaN(numValue) && numValue >= 1) {
                                      // Validate against sold tickets
                                      if (
                                        soldTickets > 0 &&
                                        numValue < soldTickets
                                      ) {
                                        setError(
                                          `dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`,
                                          {
                                            type: "manual",
                                            message: `Total capacity cannot be less than sold tickets (${soldTickets})`,
                                          },
                                        );
                                      } else {
                                        // Clear error if valid
                                        trigger(
                                          `dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`,
                                        );
                                      }
                                      // Cap at 100000
                                      if (numValue > 100000) {
                                        field.onChange(100000);
                                      } else {
                                        field.onChange(numValue);
                                      }
                                    }
                                  }
                                }}
                                onBlur={async () => {
                                  field.onBlur();
                                  await trigger(
                                    `dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`,
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={control}
                      name={`dates.${dateIndex}.tickets.${ticketIndex}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-md font-medium">
                            Price per person
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
                              className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        </>
      );
    },
    [control, watch, setValue, setError, trigger, readOnly],
  );

  // Create custom field arrays for tables - now checks individual date's booking type
  const createTableFields = useCallback(
    (dateIndex: number, locked = false) => {
      const dateBookingType = watch(`dates.${dateIndex}.booking_type`);

      if (dateBookingType !== "tables" && dateBookingType !== "both")
        return null;

      return (
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="text-lg font-semibold">Table Information</div>
            {!locked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={readOnly}
                className="w-full sm:w-auto"
                onClick={() => {
                  const tables = watch(`dates.${dateIndex}.tables`) || [];
                  setValue(`dates.${dateIndex}.tables`, [
                    ...tables,
                    {
                      min_persons: "",
                      max_persons: "",
                      price: "",
                      total_tables: "",
                      status: true,
                    },
                  ]);
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Table
              </Button>
            )}
          </div>

          <div className="mt-4">
            {watch(`dates.${dateIndex}.tables`)?.map(
              (table, tableIndex: number) => (
                <div
                  key={`table-${dateIndex}-${tableIndex}`}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg relative"
                >
                  <div className="sm:col-span-2 lg:col-span-4 flex justify-between items-center mb-2">
                    <div className="flex items-center gap-4">
                      {table && "id" in table && (
                        <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                          Sold:{" "}
                          {(table as { sold_tables?: number }).sold_tables || 0}
                        </div>
                      )}
                      <FormField
                        control={control}
                        name={`dates.${dateIndex}.tables.${tableIndex}.status`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormLabel className="text-sm font-medium text-gray-600">
                              Active
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value ?? true}
                                onCheckedChange={field.onChange}
                                disabled={locked || readOnly}
                                className="data-[state=checked]:bg-green-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {!locked && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={readOnly}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const tables = watch(`dates.${dateIndex}.tables`) || [];
                          if (tables.length > 1) {
                            const updatedTables = tables.filter(
                              (_: unknown, i: number) => i !== tableIndex,
                            );
                            setValue(`dates.${dateIndex}.tables`, updatedTables);
                            setValue(
                              `dates.${dateIndex}.total_table_types`,
                              updatedTables.length,
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={control}
                    name={`dates.${dateIndex}.tables.${tableIndex}.min_persons`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum people per table</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="500"
                            step="1"
                            {...field}
                            placeholder="Enter minimum people"
                            value={field.value ?? ""}
                            className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                              const currentMin = watch(
                                `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                              );
                              const maxPersons = watch(
                                `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                              );

                              if (
                                currentMin &&
                                maxPersons &&
                                currentMin > maxPersons
                              ) {
                                setError(
                                  `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                                  {
                                    type: "manual",
                                    message:
                                      "Minimum people cannot be greater than maximum people",
                                  },
                                );
                              } else {
                                // Clear error if valid
                                await trigger(
                                  `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                                );
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`dates.${dateIndex}.tables.${tableIndex}.max_persons`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum people per table</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="500"
                            step="1"
                            {...field}
                            placeholder="Enter maximum people"
                            value={field.value ?? ""}
                            className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                              const minPersons = watch(
                                `dates.${dateIndex}.tables.${tableIndex}.min_persons`,
                              );
                              const currentMax = watch(
                                `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                              );

                              if (
                                minPersons &&
                                currentMax &&
                                currentMax < minPersons
                              ) {
                                setError(
                                  `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                                  {
                                    type: "manual",
                                    message:
                                      "Maximum people cannot be less than minimum people",
                                  },
                                );
                              } else {
                                // Clear error if valid
                                await trigger(
                                  `dates.${dateIndex}.tables.${tableIndex}.max_persons`,
                                );
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`dates.${dateIndex}.tables.${tableIndex}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per person</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="9999"
                            step="1"
                            {...field}
                            placeholder="Enter price (max 9,999)"
                            value={field.value ?? ""}
                            className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`dates.${dateIndex}.tables.${tableIndex}.total_tables`}
                    render={({ field }) => {
                      const currentTable = watch(
                        `dates.${dateIndex}.tables.${tableIndex}`,
                      );
                      const soldTables =
                        currentTable && "sold_tables" in currentTable
                          ? (currentTable as { sold_tables?: number })
                              .sold_tables || 0
                          : 0;
                      const minValue = soldTables > 0 ? soldTables : 1;

                      return (
                        <FormItem>
                          <FormLabel>
                            Total Tables
                            {soldTables > 0 && (
                              <span className="text-xs text-gray-500 ml-2">
                                (Minimum: {soldTables} sold)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={minValue}
                              max="5000"
                              step="1"
                              {...field}
                              placeholder="Enter number of tables (max 5,000)"
                              value={field.value ?? ""}
                              className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange("");
                                } else {
                                  const numValue = parseInt(value, 10);
                                  if (!isNaN(numValue) && numValue >= 1) {
                                    // Validate against sold tables
                                    if (
                                      soldTables > 0 &&
                                      numValue < soldTables
                                    ) {
                                      setError(
                                        `dates.${dateIndex}.tables.${tableIndex}.total_tables`,
                                        {
                                          type: "manual",
                                          message: `Total tables cannot be less than sold tables (${soldTables})`,
                                        },
                                      );
                                    } else {
                                      // Clear error if valid
                                      trigger(
                                        `dates.${dateIndex}.tables.${tableIndex}.total_tables`,
                                      );
                                    }
                                    // Cap at 5000
                                    if (numValue > 5000) {
                                      field.onChange(5000);
                                    } else {
                                      field.onChange(numValue);
                                    }
                                  }
                                }
                              }}
                              onBlur={async () => {
                                field.onBlur();
                                await trigger(
                                  `dates.${dateIndex}.tables.${tableIndex}.total_tables`,
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      );
    },
    [control, watch, setValue, setError, trigger, readOnly],
  );

  const renderDateFields = useCallback(
    (dateIndex: number, dateRowId: string) => {
      const isOpen = openDateRowIds.includes(dateRowId);
      const dateRow = watch(`dates.${dateIndex}`);
      const isCancelled = isVendorDateCancelled(dateRow);
      const isReadonlyCancelled = isVendorDateReadonlyCancelled(dateRow);
      const dateLocked = isCancelled || readOnly;
      const cancelReason = String(dateRow?.cancel_reason ?? "").trim();

      return (
        <div
          key={dateRowId}
          className={`border rounded-lg mb-6 bg-white shadow-sm hover:shadow-md transition-all ${
            isCancelled
              ? "border-red-200 bg-red-50/30"
              : "border-gray-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 p-4 sm:p-5 border-b border-gray-100">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpenDateRowIds((prev) =>
                    isOpen
                      ? prev.filter((id) => id !== dateRowId)
                      : [...prev, dateRowId],
                  );
                }}
                className="flex items-center gap-2 text-left hover:text-blue-600 transition-colors min-w-0 flex-1"
              >
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0" />
                )}
                <span className="text-lg font-semibold flex flex-wrap items-center gap-2 min-w-0">
                  <span className="truncate">
                    {formatDateDisplay(watch(`dates.${dateIndex}.event_date`))}
                  </span>
                  {isCancelled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 shrink-0">
                      Cancelled
                    </span>
                  )}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {(() => {
                // Persisted cancelled dates: no remove / cancel / reactivate.
                if (isReadonlyCancelled) {
                  return null;
                }

                if (shouldUseCancelDateAction(dateRow)) {
                  return (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={readOnly}
                      className={
                        isCancelled
                          ? "border-gray-400 text-gray-500 hover:bg-gray-50 w-full sm:w-auto"
                          : "border-red-500 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                      }
                      size="sm"
                      onClick={() => {
                        if (!isCancelled) {
                          requestCancelDate(dateIndex);
                          return;
                        }
                        // Pending cancel only — never reactivate server-cancelled dates.
                        setValue(`dates.${dateIndex}.cancelled`, false);
                        setValue(`dates.${dateIndex}.cancel_reason`, "");
                        toast.info("Date cancellation undone.");
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      <span>
                        {isCancelled ? "Undo cancellation" : "Cancel date"}
                      </span>
                    </Button>
                  );
                }

                return (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={readOnly || isCancelled}
                    className="text-destructive hover:text-white bg-destructive/10 w-full sm:w-auto"
                    size="sm"
                    onClick={() => {
                      remove(dateIndex);
                      setOpenDateRowIds((prev) =>
                        prev.filter((id) => id !== dateRowId),
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Remove Date</span>
                    <span className="sm:hidden">Remove</span>
                  </Button>
                );
              })()}
            </div>
          </div>

          {isCancelled && cancelReason && (
            <div className="px-4 sm:px-5 pt-3 text-sm text-red-700/90">
              Reason: {cancelReason}
            </div>
          )}

          {isOpen && (
            <fieldset
              disabled={dateLocked}
              className="p-4 sm:p-5 disabled:opacity-80 min-w-0 border-0 m-0"
            >
              <div className="grid grid-cols-1 gap-4 sm:gap-5 mb-4">
                <FormField
                  control={control}
                  name={`dates.${dateIndex}.event_date`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-md font-medium">
                        Event Date
                      </FormLabel>
                      <FormControl>
                        <div className="relative w-full">
                          <EventDateInput
                            placeholder="Select date"
                            name={field.name}
                            ref={field.ref}
                            value={field.value ?? ""}
                            min={getTodayDateString()}
                            disabled={dateLocked}
                            className="w-full h-10 sm:h-11 bg-[#F9FAFB] border-[#E5E7EB] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                            onValueCommit={(newDate) =>
                              commitEventDate(dateIndex, newDate)
                            }
                          />
                          {!field.value && (
                            <span
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 sm:hidden"
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

                {/* Booking options for each date */}
                <FormField
                  control={control}
                  name={`dates.${dateIndex}.booking_type`}
                  render={({ field }) => {
                    const ticketsSelected =
                      field.value === "tickets" || field.value === "both";
                    const tablesSelected =
                      field.value === "tables" || field.value === "both";
                    const soldTickets = (dateRow.tickets ?? []).reduce(
                      (total, ticket) => total + Number(ticket.sold_tickets ?? 0),
                      0,
                    );
                    const soldTables = (dateRow.tables ?? []).reduce(
                      (total, table) => total + Number(table.sold_tables ?? 0),
                      0,
                    );

                    const toggleBookingOption = (
                      option: "tickets" | "tables",
                      checked: boolean,
                    ) => {
                      const nextTicketsSelected =
                        option === "tickets" ? checked : ticketsSelected;
                      const nextTablesSelected =
                        option === "tables" ? checked : tablesSelected;

                      if (!nextTicketsSelected && !nextTablesSelected) {
                        toast.error(
                          "Select Tickets, Tables, or both booking options.",
                        );
                        return;
                      }

                      const nextBookingType =
                        nextTicketsSelected && nextTablesSelected
                          ? "both"
                          : nextTicketsSelected
                            ? "tickets"
                            : "tables";
                      field.onChange(nextBookingType);
                      updateDate(dateIndex, nextBookingType);
                    };

                    return (
                      <FormItem className="w-full">
                        <FormLabel className="text-sm sm:text-md font-medium">
                          Booking options
                        </FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                              {
                                id: `booking-tickets-${dateIndex}`,
                                label: "Tickets",
                                description: "Sell individual guest tickets",
                                checked: ticketsSelected,
                                soldCount: soldTickets,
                                option: "tickets" as const,
                              },
                              {
                                id: `booking-tables-${dateIndex}`,
                                label: "Tables",
                                description: "Sell table bookings",
                                checked: tablesSelected,
                                soldCount: soldTables,
                                option: "tables" as const,
                              },
                            ].map((bookingOption) => (
                              <label
                                key={bookingOption.option}
                                htmlFor={bookingOption.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                  bookingOption.checked
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 bg-white hover:border-blue-300"
                                } ${
                                  dateLocked
                                    ? "cursor-not-allowed opacity-70"
                                    : ""
                                }`}
                              >
                                <Checkbox
                                  id={bookingOption.id}
                                  checked={bookingOption.checked}
                                  disabled={dateLocked}
                                  onCheckedChange={(checked) =>
                                    toggleBookingOption(
                                      bookingOption.option,
                                      checked === true,
                                    )
                                  }
                                  aria-label={bookingOption.label}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-gray-800">
                                    {bookingOption.label}
                                  </span>
                                  <span className="block text-xs text-gray-500">
                                    {bookingOption.description}
                                  </span>
                                  {bookingOption.soldCount > 0 && (
                                    <span className="mt-1 block text-xs font-medium text-amber-700">
                                      {bookingOption.soldCount} already booked
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        {(soldTickets > 0 || soldTables > 0) && (
                          <p className="text-xs text-amber-700">
                            Existing bookings are preserved when you change
                            visibility. Check the selected option before
                            saving a live event.
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Select one or both. Existing ticket and table settings
                          are preserved when you change these options.
                        </p>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              {/* Tickets/Tables based on booking type */}
              {createTicketFields(dateIndex, isCancelled)}
              {createTableFields(dateIndex, isCancelled)}

              {/* Payment & Display Settings section - only show for tables/both booking types */}
              {(watch(`dates.${dateIndex}.booking_type`) === "tables" ||
                watch(`dates.${dateIndex}.booking_type`) === "both") && (
                <>
                  <div className="text-base sm:text-lg font-semibold mt-6 mb-2">
                    Table Payment Settings
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Configure payment options for table bookings (deposit or
                    full payment)
                  </p>
                  <div className="mt-6 bg-gray-50 rounded-lg p-4 sm:p-5">
                    <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
                      {/* Payment Type */}
                      <div className="mb-5">
                        <FormField
                          control={control}
                          name={`dates.${dateIndex}.payment_type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm sm:text-md font-medium text-gray-700">
                                Payment Type
                              </FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  disabled={dateLocked}
                                  onValueChange={(
                                    value: "full" | "deposit",
                                  ) => {
                                    field.onChange(value);
                                    // Update is_deposit_enabled based on payment type
                                    if (value === "full") {
                                      setValue(
                                        `dates.${dateIndex}.is_deposit_enabled`,
                                        false,
                                      );
                                    } else if (value === "deposit") {
                                      setValue(
                                        `dates.${dateIndex}.is_deposit_enabled`,
                                        true,
                                      );
                                    }
                                  }}
                                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 pt-2"
                                >
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <RadioGroupItem value="full" />
                                    <span className="font-normal">Full payment</span>
                                  </label>
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <RadioGroupItem value="deposit" />
                                    <span className="font-normal">Deposit</span>
                                  </label>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Deposit fields when Payment Type is Deposit */}
                      {watch(`dates.${dateIndex}.payment_type`) ===
                        "deposit" && (
                        <div className="space-y-4 mb-5 p-3 sm:p-4 bg-white rounded-md border border-gray-100">
                          {/* Deposit Type Selection */}
                          <FormField
                            control={control}
                            name={`dates.${dateIndex}.deposit_type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm sm:text-md font-medium">
                                  Deposit Type
                                </FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    value={field.value ?? "amount"}
                                    disabled={dateLocked}
                                    onValueChange={(
                                      value: "amount" | "percentage",
                                    ) => {
                                      field.onChange(value);
                                      // Clear the other field when switching type
                                      if (value === "amount") {
                                        setValue(
                                          `dates.${dateIndex}.deposit_value`,
                                          "",
                                        );
                                      }
                                    }}
                                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 pt-2"
                                  >
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <RadioGroupItem value="amount" />
                                      <span className="font-normal">Fixed amount</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <RadioGroupItem value="percentage" />
                                      <span className="font-normal">Percentage</span>
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
                              control={control}
                              name={`dates.${dateIndex}.deposit_value`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {watch(
                                      `dates.${dateIndex}.deposit_type`,
                                    ) === "amount"
                                      ? "Deposit amount per person"
                                      : "Deposit percentage (%)"}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={
                                        watch(
                                          `dates.${dateIndex}.deposit_type`,
                                        ) === "percentage"
                                          ? "20"
                                          : "1"
                                      }
                                      max={
                                        watch(
                                          `dates.${dateIndex}.deposit_type`,
                                        ) === "percentage"
                                          ? "80"
                                          : undefined
                                      }
                                      step="1"
                                      placeholder={
                                        watch(
                                          `dates.${dateIndex}.deposit_type`,
                                        ) === "amount"
                                          ? "Enter deposit amount"
                                          : "Enter percentage (20-80)"
                                      }
                                      {...field}
                                      value={field.value ?? ""}
                                      className="w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const depositType = watch(
                                          `dates.${dateIndex}.deposit_type`,
                                        );

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
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Balance due date */}
                            <FormField
                              control={control}
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
                                        className="w-full"
                                      />
                                      {!field.value && (
                                        <span
                                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 sm:hidden"
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
                </>
              )}

              {/* Duplicate Date Button — not for cancelled dates */}
              {!isCancelled && (
                <div className="flex justify-end mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={readOnly}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50 w-full sm:w-auto"
                    onClick={() => {
                      append(
                        cloneDateRowForDuplicate(watch(`dates.${dateIndex}`)),
                      );
                      toast.success(
                        "Date duplicated. Please set a new event date.",
                      );
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Duplicate
                  </Button>
                </div>
              )}
            </fieldset>
          )}
        </div>
      );
    },
    [
      control,
      remove,
      append,
      createTicketFields,
      createTableFields,
      watch,
      updateDate,
      commitEventDate,
      setValue,
      requestCancelDate,
      readOnly,
      openDateRowIds,
    ],
  );

  const cloneDatesForRooms = (dates: StepThreeType["dates"]) =>
    JSON.parse(JSON.stringify(dates)) as StepThreeType["dates"];

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepThreeType, options?: { applyToAllRooms?: boolean }) => {
      const applyToAllRooms = options?.applyToAllRooms === true;
      if (data.dates.length === 0 && !skipEmptyDatesConfirmRef.current) {
        setEmptyDatesConfirmOpen(true);
        return;
      }
      skipEmptyDatesConfirmRef.current = false;

      const vendor_location_id =
        data.vendor_location_id ??
        globalForm.getValues().stepOne?.vendor_location_id;
      if (!vendor_location_id || vendor_location_id < 1) {
        toast.error(
          "Select a venue location in the Event name step before saving dates.",
        );
        return;
      }

      setIsLoading(true);

      try {
        const latestDates = form.getValues("dates");
        const cleanedDates = latestDates.map((date) => {
          // Clear payment fields for tickets-only booking type
          if (date.booking_type === "tickets") {
            return {
              ...date,
              payment_type: undefined,
              is_deposit_enabled: undefined,
              deposit_type: undefined,
              deposit_value: undefined,
              deposit_due_date: undefined,
            };
          }

          if (date.payment_type === "full") {
            return {
              ...date,
              is_deposit_enabled: false,
              deposit_type: undefined,
              deposit_value: undefined,
              deposit_due_date: undefined,
            };
          }

          if (date.payment_type === "deposit") {
            return {
              ...date,
              is_deposit_enabled: true,
            };
          }

          return date;
        });

        const roomsEnabled = globalForm.getValues().stepTwo?.is_rooms === 1;
        const stepTwoRoomsForSave = capEventRoomList(
          normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
        );

        let cleanedData: StepThreeSavePayload;
        let mergedRoomsGlobal: ReturnType<
          typeof syncStepThreeRoomsFromStepTwo
        > = [];

        if (roomsEnabled && stepTwoRoomsForSave.length > 0) {
          persistActiveRoomDatesToGlobal(resolvedRoomIndex, cleanedDates);
          mergedRoomsGlobal = syncStepThreeRoomsFromStepTwo(
            stepTwoRoomsForSave,
            normalizeVendorStepThreeRooms(
              globalForm.getValues().stepThree?.rooms,
            ),
          ).map((entry, roomIndex) =>
            applyToAllRooms || roomIndex === resolvedRoomIndex
              ? { ...entry, dates: cloneDatesForRooms(cleanedDates) }
              : entry,
          );

          const activeRoomIdForSave = Number(
            stepTwoRoomsForSave[resolvedRoomIndex]?.room_id,
          );
          const roomsForApi = applyToAllRooms
            ? mergedRoomsGlobal
            : mergedRoomsGlobal.filter(
                (entry) => entry.room_id === activeRoomIdForSave,
              );

          cleanedData = {
            step: 3,
            event_id: data.event_id,
            vendor_location_id,
            is_rooms: 1,
            rooms: roomsForApi,
            dates: cleanedDates,
          };
        } else {
          cleanedData = {
            ...data,
            vendor_location_id,
            is_rooms: 0,
            dates: cleanedDates,
          };
        }

        globalForm.setValue("stepThree", {
          ...globalForm.getValues().stepThree,
          ...cleanedData,
          ...(cleanedData.is_rooms === 1
            ? { rooms: mergedRoomsGlobal, dates: cleanedDates }
            : { dates: cleanedDates }),
        } as StepThreeType);

        const response = await eventsService.storeStepThreeData(cleanedData);

        if (response && response.status) {
          const resData = response.data as
            | { event_deleted?: boolean }
            | undefined;
          if (resData?.event_deleted) {
            const removedId = String(cleanedData.event_id);
            queryClient.removeQueries({
              queryKey: vendorEventDetailKeys.data(removedId),
            });
            void queryClient.invalidateQueries({
              queryKey: vendorEventsListKeys.lists(),
            });
            try {
              localStorage.removeItem("event_id");
            } catch {
              /* ignore */
            }
            router.push("/vendor/events");
            return;
          }

          if (
            roomsEnabled &&
            stepTwoRoomsForSave.length > 0 &&
            !applyToAllRooms
          ) {
            const nextUnfilledIndex = stepTwoRoomsForSave.findIndex(
              (room, index) =>
                index !== resolvedRoomIndex &&
                !hasMeaningfulVendorDates(
                  findStepThreeDatesForRoom(
                    mergedRoomsGlobal,
                    Number(room.room_id),
                  ),
                ),
            );
            if (nextUnfilledIndex !== -1) {
              globalForm.setValue(
                "stepTwo.active_room_index",
                nextUnfilledIndex,
                {
                  shouldDirty: false,
                  shouldTouch: false,
                },
              );
              toast.info("Saved. Continue with the next room.");
              markEventFormSaved(3);
              return;
            }
          }

          await advanceStep(3, response);
        } else {
          console.error("Error saving event dates:", response);
        }
      } catch (error) {
        console.error("Error saving event dates:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      globalForm,
      persistActiveRoomDatesToGlobal,
      queryClient,
      form,
      resolvedRoomIndex,
      router,
      advanceStep,
      markEventFormSaved,
    ],
  );

  const focusFirstDateValidationError = useCallback(() => {
    const errors = form.formState.errors;
    const messages: string[] = [];
    const walk = (node: unknown, prefix: string) => {
      if (!node || typeof node !== "object") return;
      const err = node as { message?: string; [key: string]: unknown };
      if (typeof err.message === "string" && err.message.trim()) {
        messages.push(err.message);
      }
      for (const [key, value] of Object.entries(err)) {
        if (key === "message" || key === "type" || key === "ref") continue;
        walk(value, prefix ? `${prefix}.${key}` : key);
      }
    };
    walk(errors.dates, "dates");
    if (messages.length === 0) {
      walk(errors, "");
    }
    if (messages.length > 0) {
      toast.error(messages.slice(0, 3).join("; "));
    } else {
      toast.error("Please complete all required fields for this room's dates.");
    }

    const firstPath = (() => {
      const stack: Array<{ node: unknown; path: string }> = [
        { node: errors.dates ?? errors, path: errors.dates ? "dates" : "" },
      ];
      while (stack.length > 0) {
        const { node, path } = stack.shift()!;
        if (!node || typeof node !== "object") continue;
        const err = node as { message?: string; [key: string]: unknown };
        if (typeof err.message === "string") return path;
        for (const [key, value] of Object.entries(err)) {
          if (key === "message" || key === "type" || key === "ref") continue;
          stack.push({ node: value, path: `${path}.${key}` });
        }
      }
      return null;
    })();

    if (firstPath) {
      const errorElement = document.querySelector(`[name="${firstPath}"]`);
      if (errorElement) {
        (errorElement as HTMLElement).focus();
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [form.formState.errors]);

  const attemptSubmit = useCallback(
    async (applyToAllRooms: boolean) => {
      const isValid = isRoomsEnabled
        ? await form.trigger("dates")
        : await form.trigger();
      if (!isValid) {
        focusFirstDateValidationError();
        return;
      }
      await handleSubmit(getValues(), { applyToAllRooms });
    },
    [
      focusFirstDateValidationError,
      form,
      getValues,
      handleSubmit,
      isRoomsEnabled,
    ],
  );

  return (
    <div className="space-y-8">
      <AlertDialog
        open={emptyDatesConfirmOpen}
        onOpenChange={setEmptyDatesConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save with no event dates?</AlertDialogTitle>
            <AlertDialogDescription>
              This event doesn&apos;t have any dates scheduled. If you save now,
              the event may be removed from your dashboard. To keep it, add at
              least one date first, or use Go back to return to the form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                skipEmptyDatesConfirmRef.current = true;
                setEmptyDatesConfirmOpen(false);
                void attemptSubmit(false);
              }}
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelReasonDialogOpen}
        onOpenChange={(open) => {
          setCancelReasonDialogOpen(open);
          if (!open) {
            setCancelReasonError(null);
            setTargetCancelDateIndex(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm date cancellation</AlertDialogTitle>
            <AlertDialogDescription>
              Cancelled dates may impact your bookings and customer
              communication. Please provide a clear reason before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-black">
            <Label htmlFor="cancel-date-reason">Cancellation reason</Label>
            <Textarea
              id="cancel-date-reason"
              value={cancelReasonText}
              onChange={(e) => {
                setCancelReasonText(e.target.value);
                if (cancelReasonError) {
                  setCancelReasonError(null);
                }
              }}
              placeholder="Example: Venue maintenance, weather warning, or operational constraint."
              rows={4}
              disabled={readOnly}
            />
            {cancelReasonError && (
              <p className="text-sm text-destructive">{cancelReasonError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <Button
              type="button"
              variant="event-primary"
              onClick={() => confirmCancelDate()}
            >
              Confirm cancel date
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const hasManualErrors =
              Object.keys(form.formState.errors).length > 0;
            if (hasManualErrors) return;
            void attemptSubmit(false);
          }}
          className="space-y-8"
          noValidate
        >
          {/* Event Dates & Pricing Section */}
          <div className="mt-6 sm:mt-8">
            <h2 className="text-lg sm:text-xl font-bold title-header">
              Event Dates & Pricing
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-2">
              Set your event dates, payment options, and pricing details
            </p>
            <p className="text-xs text-blue-600 mb-4 flex items-center gap-1 flex-wrap">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Dates will be automatically sorted in ascending order • Each date
              must be unique
            </p>
          </div>

          {dateFields.map((field, index) => renderDateFields(index, field.id))}

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center gap-2 justify-center"
            disabled={readOnly}
            onClick={handleAddDate}
          >
            <PlusCircle className="h-4 w-4" />
            Add Another Date
          </Button>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            {canApplyToAllRooms && (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || readOnly}
                className="w-full sm:w-auto"
                onClick={() => void attemptSubmit(true)}
              >
                {isLoading ? "Saving..." : "Apply to all rooms"}
              </Button>
            )}
            <Button
              type={isRoomsEnabled ? "button" : "submit"}
              disabled={isLoading || readOnly}
              variant="event-primary"
              className="w-full sm:w-auto"
              onClick={
                isRoomsEnabled ? () => void attemptSubmit(false) : undefined
              }
            >
              {readOnly
                ? "View only"
                : isLoading
                  ? "Saving..."
                  : isRoomsEnabled
                    ? "Apply to this room only"
                    : "Save & Next"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
