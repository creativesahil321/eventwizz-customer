"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsService } from "@/services/vendor/events/events.service";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StepThreeType, stepThreeSchema } from "../schema";
import { useEventFormContext } from "../../events-form-provider";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  bookingType: "tickets" | "tables" | "both" = "tickets"
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
  const [isLoading, setIsLoading] = useState(false);
  const { form: globalForm, save } = useEventFormContext();

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  // Initialize form with combined step data
  const stepThreeDefaults = globalForm.getValues().stepThree;
  const eventId = getEventId();

  // Setup form with the new schema structure
  const form = useForm<StepThreeType>({
    resolver: zodResolver(stepThreeSchema) as Resolver<StepThreeType>,
    defaultValues: {
      step: 3,
      event_id: eventId,
      dates:
        stepThreeDefaults?.dates && stepThreeDefaults.dates.length > 0
          ? stepThreeDefaults.dates
          : [getDefaultDate("tickets")],
    } as StepThreeType,
    mode: "onChange",
  });

  // Update form when eventId changes
  useEffect(() => {
    form.setValue("event_id", eventId);
  }, [eventId, form]);

  const { control, watch, setValue, setError, trigger } = form;

  // Setup field array for dates
  const {
    fields: dateFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "dates",
  });

  // Update dates when booking type changes for a specific date
  const updateDate = useCallback(
    (dateIndex: number, bookingType: "tickets" | "tables" | "both") => {
      const currentDate = watch(`dates.${dateIndex}`);

      // Update tickets/tables arrays based on the booking type
      if (bookingType === "tickets") {
        setValue(
          `dates.${dateIndex}.total_ticket_types`,
          currentDate.tickets?.length || 1
        );
        setValue(`dates.${dateIndex}.total_table_types`, 0);

        // Make sure we have at least one ticket
        if (!currentDate.tickets || currentDate.tickets.length === 0) {
          setValue(`dates.${dateIndex}.tickets`, [
            { title: "", description: "", total_capacity: "", price: "" },
          ]);
        }

        // Clear tables and payment fields for tickets-only
        setValue(`dates.${dateIndex}.tables`, []);
        setValue(`dates.${dateIndex}.payment_type`, undefined);
        setValue(`dates.${dateIndex}.is_deposit_enabled`, undefined);
        setValue(`dates.${dateIndex}.deposit_type`, undefined);
        setValue(`dates.${dateIndex}.deposit_value`, undefined);
        setValue(`dates.${dateIndex}.deposit_due_date`, undefined);
      } else if (bookingType === "tables") {
        setValue(`dates.${dateIndex}.total_ticket_types`, 0);
        setValue(
          `dates.${dateIndex}.total_table_types`,
          currentDate.tables?.length || 1
        );

        // Make sure we have at least one table
        if (!currentDate.tables || currentDate.tables.length === 0) {
          setValue(`dates.${dateIndex}.tables`, [
            { min_persons: "", max_persons: "", price: "", total_tables: "" },
          ]);
        }

        // Clear tickets and set default payment fields for tables
        setValue(`dates.${dateIndex}.tickets`, []);
        setValue(`dates.${dateIndex}.payment_type`, "full");
        setValue(`dates.${dateIndex}.is_deposit_enabled`, false);
        setValue(`dates.${dateIndex}.deposit_type`, "amount");
        setValue(`dates.${dateIndex}.deposit_value`, "");
        setValue(`dates.${dateIndex}.deposit_due_date`, "");
      } else {
        // both
        setValue(
          `dates.${dateIndex}.total_ticket_types`,
          currentDate.tickets?.length || 1
        );
        setValue(
          `dates.${dateIndex}.total_table_types`,
          currentDate.tables?.length || 1
        );

        // Make sure we have at least one ticket
        if (!currentDate.tickets || currentDate.tickets.length === 0) {
          setValue(`dates.${dateIndex}.tickets`, [
            { title: "", description: "", total_capacity: "", price: "" },
          ]);
        }

        // Make sure we have at least one table
        if (!currentDate.tables || currentDate.tables.length === 0) {
          setValue(`dates.${dateIndex}.tables`, [
            { min_persons: "", max_persons: "", price: "", total_tables: "" },
          ]);
        }

        // Set default payment fields for both
        setValue(`dates.${dateIndex}.payment_type`, "full");
        setValue(`dates.${dateIndex}.is_deposit_enabled`, false);
        setValue(`dates.${dateIndex}.deposit_type`, "amount");
        setValue(`dates.${dateIndex}.deposit_value`, "");
        setValue(`dates.${dateIndex}.deposit_due_date`, "");
      }
    },
    [watch, setValue]
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
    [watch]
  );

  // Sort dates in ascending order whenever dates change
  const sortDates = useCallback(() => {
    const currentDates = form.getValues("dates");
    if (currentDates && currentDates.length > 1) {
      const sortedDates = [...currentDates].sort((a, b) => {
        const dateA = new Date(a.event_date);
        const dateB = new Date(b.event_date);
        return dateA.getTime() - dateB.getTime();
      });

      // Only update if order actually changed
      const hasChanged = sortedDates.some(
        (date, index) => date.event_date !== currentDates[index]?.event_date
      );

      if (hasChanged) {
        form.setValue("dates", sortedDates);
      }
    }
  }, [form]);

  // Watch for date changes and sort automatically
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("dates.") && name.includes("event_date")) {
        // Only sort dates - validation is handled in onChange
        const timeoutId = setTimeout(sortDates, 300);
        return () => clearTimeout(timeoutId);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, sortDates]);

  // Create custom field arrays for tickets - now checks individual date's booking type
  const createTicketFields = useCallback(
    (dateIndex: number) => {
      const dateBookingType = watch(`dates.${dateIndex}.booking_type`);

      if (dateBookingType !== "tickets" && dateBookingType !== "both")
        return null;

      return (
        <>
          <div className="text-lg font-semibold mb-4">Ticket Information</div>
          <div className="mt-6 bg-gray-50 rounded-lg p-4 sm:p-5">
            <div className="flex justify-end items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
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
                                  className="data-[state=checked]:bg-green-500"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          const tickets =
                            watch(`dates.${dateIndex}.tickets`) || [];
                          if (tickets.length > 1) {
                            const updatedTickets = tickets.filter(
                              (_: unknown, i: number) => i !== ticketIndex
                            );
                            setValue(
                              `dates.${dateIndex}.tickets`,
                              updatedTickets
                            );
                            setValue(
                              `dates.${dateIndex}.total_ticket_types`,
                              updatedTickets.length
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
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
                          `dates.${dateIndex}.tickets.${ticketIndex}`
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
                                  (Min: {soldTickets} sold)
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
                                          }
                                        );
                                      } else {
                                        // Clear error if valid
                                        trigger(
                                          `dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`
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
                                    `dates.${dateIndex}.tickets.${ticketIndex}.total_capacity`
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
                )
              )}
            </div>
          </div>
        </>
      );
    },
    [control, watch, setValue, setError, trigger]
  );

  // Create custom field arrays for tables - now checks individual date's booking type
  const createTableFields = useCallback(
    (dateIndex: number) => {
      const dateBookingType = watch(`dates.${dateIndex}.booking_type`);

      if (dateBookingType !== "tables" && dateBookingType !== "both")
        return null;

      return (
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="text-lg font-semibold">Table Information</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
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
                                className="data-[state=checked]:bg-green-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const tables = watch(`dates.${dateIndex}.tables`) || [];
                        if (tables.length > 1) {
                          const updatedTables = tables.filter(
                            (_: unknown, i: number) => i !== tableIndex
                          );
                          setValue(`dates.${dateIndex}.tables`, updatedTables);
                          setValue(
                            `dates.${dateIndex}.total_table_types`,
                            updatedTables.length
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>

                  <FormField
                    control={control}
                    name={`dates.${dateIndex}.tables.${tableIndex}.min_persons`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min People/Table</FormLabel>
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
                                `dates.${dateIndex}.tables.${tableIndex}.min_persons`
                              );
                              const maxPersons = watch(
                                `dates.${dateIndex}.tables.${tableIndex}.max_persons`
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
                                  }
                                );
                              } else {
                                // Clear error if valid
                                await trigger(
                                  `dates.${dateIndex}.tables.${tableIndex}.min_persons`
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
                        <FormLabel>Max People/Table</FormLabel>
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
                                `dates.${dateIndex}.tables.${tableIndex}.min_persons`
                              );
                              const currentMax = watch(
                                `dates.${dateIndex}.tables.${tableIndex}.max_persons`
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
                                  }
                                );
                              } else {
                                // Clear error if valid
                                await trigger(
                                  `dates.${dateIndex}.tables.${tableIndex}.max_persons`
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
                        <FormLabel>Price/Person</FormLabel>
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
                        `dates.${dateIndex}.tables.${tableIndex}`
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
                                (Min: {soldTables} sold)
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
                                        }
                                      );
                                    } else {
                                      // Clear error if valid
                                      trigger(
                                        `dates.${dateIndex}.tables.${tableIndex}.total_tables`
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
                                  `dates.${dateIndex}.tables.${tableIndex}.total_tables`
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
              )
            )}
          </div>
        </div>
      );
    },
    [control, watch, setValue, setError, trigger]
  );

  const renderDateFields = useCallback(
    (dateIndex: number) => {
      return (
        <div
          key={`date-${dateIndex}`}
          className="border-2 border-gray-200 rounded-lg p-4 sm:p-5 mb-6 bg-white shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <h3 className="text-lg font-semibold truncate flex-1 min-w-0">
              {formatDateDisplay(watch(`dates.${dateIndex}.event_date`))}
            </h3>
            {dateFields.length > 1 && (
              <Button
                type="button"
                variant="destructive"
                className="text-destructive hover:text-white bg-destructive/10 w-full sm:w-auto"
                size="sm"
                onClick={() => remove(dateIndex)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Remove Date</span>
                <span className="sm:hidden">Remove</span>
              </Button>
            )}
          </div>

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
                    <Input
                      type="date"
                      placeholder="Select date"
                      {...field}
                      min={getTodayDateString()} // Add min attribute to prevent past dates
                      className="w-full h-10 sm:h-11 bg-[#F9FAFB] border-[#E5E7EB] focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Booking type dropdown for each date */}
            <FormField
              control={control}
              name={`dates.${dateIndex}.booking_type`}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="text-sm sm:text-md font-medium">
                    Is it a ticketed or seated event?
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value: "tickets" | "tables" | "both") => {
                        field.onChange(value);
                        // Update the date structure based on the new booking type
                        updateDate(dateIndex, value);
                      }}
                    >
                      <SelectTrigger className="w-full h-10 sm:h-12 bg-[#F9FAFB] border-[#E5E7EB] text-sm sm:text-base">
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
          {(watch(`dates.${dateIndex}.booking_type`) === "tables" ||
            watch(`dates.${dateIndex}.booking_type`) === "both") && (
            <>
              <div className="text-base sm:text-lg font-semibold mt-6 mb-2">
                Table Payment Settings
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Configure payment options for table bookings (deposit or full
                payment)
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
                              onValueChange={(value: "full" | "deposit") => {
                                field.onChange(value);
                                // Update is_deposit_enabled based on payment type
                                if (value === "full") {
                                  setValue(
                                    `dates.${dateIndex}.is_deposit_enabled`,
                                    false
                                  );
                                } else if (value === "deposit") {
                                  setValue(
                                    `dates.${dateIndex}.is_deposit_enabled`,
                                    true
                                  );
                                }
                              }}
                              className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 pt-2"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="full" />
                                </FormControl>
                                <Label className="font-normal cursor-pointer">
                                  Full Payment
                                </Label>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="deposit" />
                                </FormControl>
                                <Label className="font-normal cursor-pointer">
                                  Deposit
                                </Label>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conditional deposit fields */}
                  {watch(`dates.${dateIndex}.payment_type`) === "deposit" && (
                    <div className="space-y-4 mb-5 p-3 sm:p-4 bg-white rounded-md border border-gray-100">
                      {/* Enable/Disable Deposit Toggle */}
                      <FormField
                        control={control}
                        name={`dates.${dateIndex}.is_deposit_enabled`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4 shadow-sm gap-3">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <FormLabel className="text-sm sm:text-base">
                                Enable Deposit
                              </FormLabel>
                              <div className="text-xs sm:text-sm text-gray-500">
                                Allow customers to pay deposit for this date
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value ?? true}
                                onCheckedChange={field.onChange}
                                className="flex-shrink-0"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Only show deposit fields if enabled */}
                      {watch(`dates.${dateIndex}.is_deposit_enabled`) && (
                        <>
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
                                    onValueChange={(
                                      value: "amount" | "percentage"
                                    ) => {
                                      field.onChange(value);
                                      // Clear the other field when switching type
                                      if (value === "amount") {
                                        setValue(
                                          `dates.${dateIndex}.deposit_value`,
                                          ""
                                        );
                                      }
                                    }}
                                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 pt-2"
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
                              control={control}
                              name={`dates.${dateIndex}.deposit_value`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {watch(
                                      `dates.${dateIndex}.deposit_type`
                                    ) === "amount"
                                      ? "Deposit Amount/Person"
                                      : "Deposit Percentage (%)"}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={
                                        watch(
                                          `dates.${dateIndex}.deposit_type`
                                        ) === "percentage"
                                          ? "20"
                                          : "1"
                                      }
                                      max={
                                        watch(
                                          `dates.${dateIndex}.deposit_type`
                                        ) === "percentage"
                                          ? "80"
                                          : undefined
                                      }
                                      step="1"
                                      placeholder={
                                        watch(
                                          `dates.${dateIndex}.deposit_type`
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

                            {/* Deposit Due Date */}
                            <FormField
                              control={control}
                              name={`dates.${dateIndex}.deposit_due_date`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Deposit Due Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      placeholder="Select due date"
                                      {...field}
                                      min={getTodayDateString()}
                                      className="w-full"
                                    />
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
            </>
          )}

          {/* Duplicate Date Button */}
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50 w-full sm:w-auto"
              onClick={() => {
                const currentDate = watch(`dates.${dateIndex}`);
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
      control,
      dateFields,
      remove,
      append,
      createTicketFields,
      createTableFields,
      watch,
      updateDate,
      validateDateUniqueness,
      setValue,
    ]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepThreeType) => {
      setIsLoading(true);

      try {
        // Clean up payment fields for tickets booking type and deposit fields when payment is full
        const cleanedData = {
          ...data,
          dates: data.dates.map((date) => {
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

            // If payment type is full or deposit is disabled, clean deposit fields
            if (
              date.payment_type === "full" ||
              date.is_deposit_enabled === false
            ) {
              return {
                ...date,
                is_deposit_enabled: false,
                deposit_type: undefined,
                deposit_value: undefined,
                deposit_due_date: undefined,
              };
            }

            return date;
          }),
        };

        // Update form with cleaned data before validation
        form.reset(cleanedData);

        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

        // Check for any errors in the form state (including manual errors)
        const hasErrors = Object.keys(form.formState.errors).length > 0;

        // If form is not valid or has manual errors, stop submission
        if (!isValid || hasErrors) {
          // Get all validation errors
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          // Find the first error field and scroll to it
          if (errorFields.length > 0) {
            // Try to find and focus the field with an error
            const errorElement = document.querySelector(
              `[name="${errorFields[0]}"]`
            );
            if (errorElement) {
              (errorElement as HTMLElement).focus();
              errorElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }

          setIsLoading(false);
          return;
        }

        // Update global form with cleaned data
        globalForm.setValue("stepThree", {
          ...globalForm.getValues().stepThree,
          ...cleanedData,
        } as StepThreeType);

        // Call the API directly using eventsService
        const response = await eventsService.storeStepThreeData(cleanedData);

        if (response && response.status) {
          // Move to the next step
          await save();
        } else {
          const errorMessage =
            response?.message ||
            "Failed to save event dates. Please try again.";
          toast.error("Error saving event dates", {
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error saving event dates:", error);
        toast.error("Failed to save event dates");
      } finally {
        setIsLoading(false);
      }
    },
    [form, globalForm, save]
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            // Check for manual errors before triggering React Hook Form validation
            const hasManualErrors =
              Object.keys(form.formState.errors).length > 0;
            if (hasManualErrors) {
              setIsLoading(false);
              return;
            }

            // Let React Hook Form handle validation and call our handler
            await form.handleSubmit(handleSubmit)(e);
          }}
          className="space-y-8"
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

          {dateFields.map((field, index) => renderDateFields(index))}

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center gap-2 justify-center"
            onClick={handleAddDate}
          >
            <PlusCircle className="h-4 w-4" />
            Add Another Date
          </Button>

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              variant="event-primary"
              className="w-full sm:w-auto"
            >
              {isLoading ? "Saving..." : "Save & Next"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
