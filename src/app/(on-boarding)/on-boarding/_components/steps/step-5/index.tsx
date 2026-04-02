"use client";
import React, { useState, useEffect, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Helper function to format date consistently as DD-MM-YYYY
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

export default function StepFive() {
  const {
    form: globalForm,
    save,
    setActiveStep,
    persistedProgressHydrated,
  } = useFormContext();

  const stepFivePersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepFive.isApproved",
  });
  const { handleFieldFocus, clearActiveField } = useFieldFocusHandler();
  const [loading, setLoading] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const { update: updateSession } = useSession();

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

        // If payment type is full or deposit is disabled, clean deposit fields
        if (date.payment_type === "full" || date.is_deposit_enabled === false) {
          return {
            ...date,
            is_deposit_enabled: false,
            deposit_type: undefined,
            deposit_value: undefined,
            deposit_due_date: undefined,
          };
        }

        return date;
      });
    },
    []
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

  // Clean up dates when stepFiveDefaults change (e.g., when loading from API)
  // This ensures payment fields are removed for tickets booking type
  useEffect(() => {
    if (stepFiveDefaults?.dates && stepFiveDefaults.dates.length > 0) {
      const cleanedDates = cleanDatesData(stepFiveDefaults.dates);
      // Only update if dates have actually changed to avoid infinite loops
      const currentDates = form.getValues("dates");
      const datesChanged =
        JSON.stringify(currentDates) !== JSON.stringify(cleanedDates);
      if (datesChanged) {
        form.setValue("dates", cleanedDates, { shouldValidate: false });
      }
    }
  }, [stepFiveDefaults?.dates, cleanDatesData, form]);

  // Setup field array for dates
  const {
    fields: dateFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "dates",
  });

  // Keep global onboarding form in sync so the split preview (FormPreview) updates live.
  // Previously stepFive was only written on Save & Next, so duplicate/add date never appeared in preview.
  useEffect(() => {
    const pushToGlobal = () => {
      const data = form.getValues();
      globalForm.setValue(
        "stepFive",
        {
          ...data,
          event_id: eventId,
        },
        { shouldValidate: false, shouldDirty: true },
      );
    };

    pushToGlobal();
    const subscription = form.watch(() => {
      pushToGlobal();
    });
    return () => subscription.unsubscribe();
  }, [form, globalForm, eventId]);

  // Update dates when booking type changes for a specific date
  const updateDate = useCallback(
    (dateIndex: number, bookingType: "tickets" | "tables" | "both") => {
      const currentDate = form.getValues(`dates.${dateIndex}`);

      // Update tickets/tables arrays based on the booking type
      if (bookingType === "tickets") {
        form.setValue(
          `dates.${dateIndex}.total_ticket_types`,
          currentDate.tickets?.length || 1
        );
        form.setValue(`dates.${dateIndex}.total_table_types`, 0);

        // Make sure we have at least one ticket
        if (!currentDate.tickets || currentDate.tickets.length === 0) {
          form.setValue(`dates.${dateIndex}.tickets`, [
            { title: "", description: "", total_capacity: "", price: "", discount_type: "none", discount_value: "" },
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
          currentDate.tables?.length || 1
        );

        // Make sure we have at least one table
        if (!currentDate.tables || currentDate.tables.length === 0) {
          form.setValue(`dates.${dateIndex}.tables`, [
            { min_persons: "", max_persons: "", price: "", total_tables: "", discount_type: "none", discount_value: "" },
          ]);
        }

        // Clear tickets and set default payment fields for tables
        form.setValue(`dates.${dateIndex}.tickets`, []);
        form.setValue(`dates.${dateIndex}.payment_type`, "full");
        form.setValue(`dates.${dateIndex}.is_deposit_enabled`, false);
        form.setValue(`dates.${dateIndex}.deposit_type`, "amount");
        form.setValue(`dates.${dateIndex}.deposit_value`, "");
        form.setValue(`dates.${dateIndex}.deposit_due_date`, "");
      } else {
        // both
        form.setValue(
          `dates.${dateIndex}.total_ticket_types`,
          currentDate.tickets?.length || 1
        );
        form.setValue(
          `dates.${dateIndex}.total_table_types`,
          currentDate.tables?.length || 1
        );

        // Make sure we have at least one ticket
        if (!currentDate.tickets || currentDate.tickets.length === 0) {
          form.setValue(`dates.${dateIndex}.tickets`, [
            { title: "", description: "", total_capacity: "", price: "", discount_type: "none", discount_value: "" },
          ]);
        }

        // Make sure we have at least one table
        if (!currentDate.tables || currentDate.tables.length === 0) {
          form.setValue(`dates.${dateIndex}.tables`, [
            { min_persons: "", max_persons: "", price: "", total_tables: "", discount_type: "none", discount_value: "" },
          ]);
        }

        // Set default payment fields for both
        form.setValue(`dates.${dateIndex}.payment_type`, "full");
        form.setValue(`dates.${dateIndex}.is_deposit_enabled`, false);
        form.setValue(`dates.${dateIndex}.deposit_type`, "amount");
        form.setValue(`dates.${dateIndex}.deposit_value`, "");
        form.setValue(`dates.${dateIndex}.deposit_due_date`, "");
      }
    },
    [form]
  );

  // Add date with default booking type of tickets
  const handleAddDate = useCallback(() => {
    const newIndex = dateFields.length;
    append(getDefaultDate("tickets"));
    // Automatically open the new accordion
    setOpenAccordions((prev) => [...prev, `date-${newIndex}`]);
  }, [append, dateFields.length]);

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
          "This date is already selected. Please choose a different date."
        );
        return false;
      }

      // Check if dates are in ascending order
      const sortedDates = [...otherDates, newDate].sort();
      const currentOrder = [...otherDates, newDate];

      if (JSON.stringify(sortedDates) !== JSON.stringify(currentOrder)) {
        toast.warning(
          "Dates should be in ascending order. Please arrange them chronologically."
        );
        return false;
      }

      return true;
    },
    [form]
  );

  // Create custom field arrays for tickets - now checks individual date's booking type
  const createTicketFields = useCallback(
    (dateIndex: number) => {
      const dateBookingType = form.watch(`dates.${dateIndex}.booking_type`);

      if (dateBookingType !== "tickets" && dateBookingType !== "both")
        return null;

      return (
        <>
          <OnboardingFieldGroupTitle>Ticket Information</OnboardingFieldGroupTitle>
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
                              Ticket Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Standard Ticket"
                                {...field}
                                className="w-full h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus(
                                    `dates.${dateIndex}.tickets.${ticketIndex}.title`
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
                                placeholder="e.g., Access to all areas"
                                {...field}
                                className="w-full h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus(
                                    `dates.${dateIndex}.tickets.${ticketIndex}.description`
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
                            Total Tickets
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
                                  `dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`
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
                            Price/Person
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
                                  `dates.${dateIndex}.tickets.${ticketIndex}.price`
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
                              (_, i) => i !== ticketIndex
                            );
                            form.setValue(
                              `dates.${dateIndex}.tickets`,
                              updatedTickets
                            );
                            form.setValue(
                              `dates.${dateIndex}.total_ticket_types`,
                              updatedTickets.length
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
    [form, handleFieldFocus]
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
              Table Information
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
                              `dates.${dateIndex}.tables.${tableIndex}.min_persons`
                            );
                            const maxPersons = form.getValues(
                              `dates.${dateIndex}.tables.${tableIndex}.max_persons`
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
                                }
                              );
                            } else {
                              // Clear error if valid
                              await form.trigger(
                                `dates.${dateIndex}.tables.${tableIndex}.min_persons`
                              );
                            }
                          }}
                          onFocus={() =>
                            handleFieldFocus(
                              `dates.${dateIndex}.tables.${tableIndex}.min_persons`
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
                              `dates.${dateIndex}.tables.${tableIndex}.min_persons`
                            );
                            const currentMax = form.getValues(
                              `dates.${dateIndex}.tables.${tableIndex}.max_persons`
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
                                }
                              );
                            } else {
                              // Clear error if valid
                              await form.trigger(
                                `dates.${dateIndex}.tables.${tableIndex}.max_persons`
                              );
                            }
                          }}
                          onFocus={() =>
                            handleFieldFocus(
                              `dates.${dateIndex}.tables.${tableIndex}.max_persons`
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
                              `dates.${dateIndex}.tables.${tableIndex}.price`
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
                              `dates.${dateIndex}.tables.${tableIndex}.total_tables`
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
                          (_, i) => i !== tableIndex
                        );
                        form.setValue(
                          `dates.${dateIndex}.tables`,
                          updatedTables
                        );
                        form.setValue(
                          `dates.${dateIndex}.total_table_types`,
                          updatedTables.length
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
    [form, handleFieldFocus]
  );

  const renderDateFields = useCallback(
    (dateIndex: number) => {
      const dateValue = form.watch(`dates.${dateIndex}.event_date`);
      const accordionValue = `date-${dateIndex}`;
      const isOpen = openAccordions.includes(accordionValue);

      return (
        <div
          key={`date-${dateIndex}`}
          className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/15"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpenAccordions((prev) =>
                    isOpen
                      ? prev.filter((item) => item !== accordionValue)
                      : [...prev, accordionValue]
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
                        Event Date
                      </FormLabel>
                      <FormControl>
                        <div className="relative w-full">
                          <Input
                            type="date"
                            placeholder="Select date"
                            {...field}
                            min={getTodayDateString()} // Add min attribute to prevent past dates
                            className="w-full h-11 bg-white/5 border-white/10 focus:ring-2 focus:ring-blue-500"
                            onFocus={() =>
                              handleFieldFocus(`dates.${dateIndex}.event_date`)
                            }
                            onChange={(e) => {
                              const newDate = e.target.value;
                              if (
                                newDate &&
                                !validateDateUniqueness(dateIndex, newDate)
                              ) {
                                return; // Don't update if validation fails
                              }
                              field.onChange(newDate);
                            }}
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
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(
                            value: "tickets" | "tables" | "both"
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
                    Table Payment Settings
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
                                Payment Type
                              </FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={(
                                    value: "full" | "deposit"
                                  ) => {
                                    field.onChange(value);
                                    // Update is_deposit_enabled based on payment type
                                    if (value === "full") {
                                      form.setValue(
                                        `dates.${dateIndex}.is_deposit_enabled`,
                                        false
                                      );
                                    } else if (value === "deposit") {
                                      form.setValue(
                                        `dates.${dateIndex}.is_deposit_enabled`,
                                        true
                                      );
                                    }
                                    handleFieldFocus(
                                      `dates.${dateIndex}.payment_type`
                                    );
                                  }}
                                  className="flex space-x-4 pt-2"
                                >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="full" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      Full Payment
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="deposit" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      Deposit
                                    </FormLabel>
                                  </FormItem>
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
                          {/* Enable/Disable Deposit Toggle */}
                          <FormField
                            control={form.control}
                            name={`dates.${dateIndex}.is_deposit_enabled`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                                <div className="space-y-0.5">
                                  <FormLabel>Enable Deposit</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    Allow customers to pay deposit for this date
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value ?? true}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {/* Only show deposit fields if enabled */}
                          {form.watch(
                            `dates.${dateIndex}.is_deposit_enabled`
                          ) && (
                            <>
                              {/* Deposit Type Selection */}
                                <FormField
                                  control={form.control}
                                  name={`dates.${dateIndex}.deposit_type`}
                                  render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-md font-medium">
                                      Deposit Type
                                    </FormLabel>
                                    <FormControl>
                                      <RadioGroup
                                        value={field.value ?? "amount"}
                                        onValueChange={(
                                          value: "amount" | "percentage"
                                        ) => {
                                          field.onChange(value);
                                          handleFieldFocus(
                                            `dates.${dateIndex}.deposit_type`
                                          );
                                          // Clear the deposit_value when switching type
                                          form.setValue(
                                            `dates.${dateIndex}.deposit_value`,
                                            ""
                                          );
                                        }}
                                        className="flex space-x-4 pt-2"
                                      >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem value="amount" />
                                          </FormControl>
                                          <Label className="font-normal cursor-pointer">
                                            Fixed Amount
                                          </Label>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem value="percentage" />
                                          </FormControl>
                                          <Label className="font-normal cursor-pointer">
                                            Percentage
                                          </Label>
                                        </FormItem>
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
                                        {form.watch(
                                          `dates.${dateIndex}.deposit_type`
                                        ) === "amount"
                                          ? "Deposit Amount/Person"
                                          : "Deposit Percentage (%)"}
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={
                                            form.watch(
                                              `dates.${dateIndex}.deposit_type`
                                            ) === "percentage"
                                              ? "20"
                                              : "1"
                                          }
                                          max={
                                            form.watch(
                                              `dates.${dateIndex}.deposit_type`
                                            ) === "percentage"
                                              ? "80"
                                              : undefined
                                          }
                                          step="1"
                                          placeholder={
                                            form.watch(
                                              `dates.${dateIndex}.deposit_type`
                                            ) === "amount"
                                              ? "Enter deposit amount"
                                              : "Enter percentage (20-80)"
                                          }
                                          {...field}
                                          value={field.value ?? ""}
                                          className="w-full h-11 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            const depositType = form.watch(
                                              `dates.${dateIndex}.deposit_type`
                                            );

                                            // Allow empty value
                                            if (value === "") {
                                              field.onChange("");
                                              return;
                                            }

                                            // Remove any decimal points and non-numeric characters except digits
                                            const cleanedValue = value.replace(
                                              /[^\d]/g,
                                              ""
                                            );

                                            if (cleanedValue === "") {
                                              field.onChange("");
                                              return;
                                            }

                                            const numValue = parseInt(
                                              cleanedValue,
                                              10
                                            );

                                            if (
                                              !isNaN(numValue) &&
                                              numValue >= 0
                                            ) {
                                              // For percentage: limit to 100
                                              if (
                                                depositType === "percentage"
                                              ) {
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
                                              `dates.${dateIndex}.deposit_value`
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
                                                `dates.${dateIndex}.deposit_due_date`
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
                            </>
                          )}
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
      createTableFields,
      createTicketFields,
      dateFields.length,
      form,
      handleFieldFocus,
      openAccordions,
      remove,
      updateDate,
      validateDateUniqueness,
    ]
  );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Get form data
      const formData = form.getValues();

      // Clean up payment fields for tickets booking type and deposit fields when payment is full
      const data = {
        ...formData,
        dates: cleanDatesData(formData.dates),
      };

      // Update form with cleaned data
      form.setValue("dates", data.dates, { shouldValidate: false });

      // Ensure we're using the latest event_id
      data.event_id = eventId;

      // Update global form
      globalForm.setValue("stepFive", data);

      // Validate the form after cleaning
      const isValid = await form.trigger();

      // Check for any errors in the form state (including manual errors)
      const hasErrors = Object.keys(form.formState.errors).length > 0;

      if (!isValid || hasErrors) {
        const errors = form.formState.errors;

        // Handle validation errors - consolidate into single toast
        const errorMessages: string[] = [];

        if (errors.dates) {
          const dateErrors: string[] = [];

          // Check if dates has array errors
          if (Array.isArray(errors.dates)) {
            errors.dates.forEach((dateError, index) => {
              if (dateError) {
                // Get all field errors in this date
                Object.keys(dateError).forEach((fieldName) => {
                  dateErrors.push(
                    `Date ${index + 1}: ${fieldName.replace("_", " ")}`
                  );
                });
              }
            });
          }

          // If there are specific date field errors, add them
          if (dateErrors.length > 0) {
            errorMessages.push(
              `Please fix the following: ${dateErrors.join(", ")}`
            );
          } else {
            // Generic dates error
            errorMessages.push(
              "Please check all date entries and ensure they are complete"
            );
          }
        }

        // Add other top-level field errors
        const otherErrorFields = Object.keys(errors).filter(
          (key) => key !== "dates"
        );
        if (otherErrorFields.length > 0) {
          errorMessages.push(
            `Please correct the highlighted fields: ${otherErrorFields.join(
              ", "
            )}`
          );
        }

        // Show single consolidated error message
        if (errorMessages.length > 0) {
          toast.error(errorMessages.join("; "));
        }

        setLoading(false);
        return;
      }

      // Make API call to store the data
      const response = await onboardingService.storeStepFiveData({
        ...data,
        isApproved: true,
      });

      if (response && response.status) {
        globalForm.setValue("stepFive", { ...data, isApproved: true });
        // Update global form with the returned data if needed
        if (response.data) {
          // Session update will handle event_id persistence
        }

        // Save to local storage
        await save();

        clearActiveField();

        // INSTANT TRANSITION: Set active step FIRST for smooth UX
        setActiveStep(6);

        // Then handle async operations in background
        updateSession({ on_boarding_step: 6 }).catch((error) => {
          console.error("Background save error:", error);
        });
      } else {
        console.error("API Error:", response);
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
          <OnboardingTitle>Tell Us About Your Event Booking</OnboardingTitle>
        </CardHeader>

        <CardContent className="px-6 py-4">
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <input type="hidden" {...form.register("event_id")} />

              <WholeStepGuidedShell
                form={form}
                sectionId="step-five-booking"
                chipLabel="Event Dates & Pricing"
                chipDescription="Set dates, booking type, and pricing for each slot."
                persistenceHydrated={persistedProgressHydrated}
                persistedStepApproved={stepFivePersistedApproved === true}
                renderFooter={({ guided }) => (
                  <GuidedWholeStepBottomActions
                    guided={guided}
                    loading={loading}
                    labelWhenReady="Save & continue"
                    onContinue={() => void handleSubmit()}
                    extraActions={
                      <Button
                        variant="event-outline"
                        type="button"
                        onClick={() => setActiveStep(6)}
                        className={guidedOnboardingSkipButtonClass}
                      >
                        Skip
                      </Button>
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

                    {dateFields.map((field, index) => renderDateFields(index))}

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
