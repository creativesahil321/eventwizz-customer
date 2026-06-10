"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsService } from "@/services/vendor/events/events.service";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StepEightType, stepEightSchema } from "../schema";
import { useEventFormContext } from "../../events-form-provider";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { syncVendorLocationsCache } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useUpdateSessionWithLocation } from "@/services/common/auth/auth-session";
import { useEventData } from "../../../_lib/hooks/useEventData";
import { SavingState } from "../_components/saving-state";
import { DuplicateLocationFields } from "../_components/duplicate-location-fields";

// Days options for reminder emails
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const extraOptions = [
  { value: 60, label: "Before 2 Months" },
  { value: 90, label: "Before 3 Months" },
  { value: 120, label: "Before 4 Months" },
  { value: 180, label: "Before 6 Months" },
];

export default function PublishTab() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateSessionWithLocation = useUpdateSessionWithLocation();
  const {
    form: globalForm,
    advanceStep,
    setActiveField,
    readOnly,
  } = useEventFormContext();

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  // Create local form instance
  const form = useForm<StepEightType>({
    resolver: zodResolver(stepEightSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      step: 8,
      event_id: getEventId() || 0,
      reminder_email_before_days:
        globalForm.getValues().stepEight?.reminder_email_before_days || 10,
      submit_type: "draft",
      is_duplicate: false,
      duplicate_target_type:
        globalForm.getValues().stepEight?.duplicate_target_type || "existing",
      vendor_location_id: globalForm.getValues().stepEight?.vendor_location_id,
      city: globalForm.getValues().stepEight?.city || "",
      address: globalForm.getValues().stepEight?.address || "",
      contact_number: globalForm.getValues().stepEight?.contact_number || "",
    },
  });

  const { control, watch } = form;

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField],
  );

  // Sync local form with global form
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        globalForm.setValue("stepEight", value as StepEightType);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm]);

  // Watch reminder email configuration state
  // const showReminderDays = watch("reminder_email_before_days") !== undefined;
  const isDuplicate = watch("is_duplicate") || false;
  const eventLocationId = globalForm.watch("stepOne.vendor_location_id");

  useEffect(() => {
    if (!isDuplicate) {
      return;
    }

    void syncVendorLocationsCache(queryClient);
  }, [isDuplicate, queryClient]);

  const params = useParams<{ eventID: string }>();
  const eventId = Array.isArray(params?.eventID)
    ? params?.eventID[0]
    : params?.eventID;
  const { invalidateCache, eventData } = useEventData(eventId, false);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepEightType) => {
      setIsLoading(true);

      try {
        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

        // If form is not valid, only highlight fields - no toast
        if (!isValid) {
          // Get all validation errors
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          // Find the first error field and scroll to it
          if (errorFields.length > 0) {
            setActiveField(errorFields[0]);

            // Try to find and focus the field with an error
            const errorElement = document.querySelector(
              `[name="${errorFields[0]}"]`,
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

        // Prepare data for submission - exclude location fields if not duplicating
        const submissionData: StepEightType = {
          step: data.step,
          event_id: data.event_id,
          reminder_email_before_days: data.reminder_email_before_days,
          submit_type: data.submit_type,
          is_duplicate: data.is_duplicate,
          ...(data.is_duplicate && {
            duplicate_target_type: data.duplicate_target_type,
            vendor_location_id: data.vendor_location_id,
            city: data.city,
            address: data.address,
            contact_number: data.contact_number,
          }),
        };

        // Update global form with all fields
        globalForm.setValue("stepEight", {
          ...globalForm.getValues().stepEight,
          ...data,
        });

        // Call the API directly using eventsService
        const response = await eventsService.storeStepEightData(submissionData);

        if (response && response.status) {
          await advanceStep(8);
          await invalidateCache?.();
          if (data.is_duplicate) {
            // Fetch fresh locations (backend has now created the new location)
            const syncedLocations = await syncVendorLocationsCache(queryClient);
            if (syncedLocations?.default_venue_location?.id) {
              await updateSessionWithLocation({
                vendor_location_id: syncedLocations.default_venue_location.id,
              });
            }
            // Mark stale so next mount triggers a background refetch (belt + suspenders)
            void queryClient.invalidateQueries({ queryKey: ["locations"] });
          }
          router.push("/vendor/events");
        } else {
          console.error("Error saving publish settings:", response);
        }
      } catch (error) {
        console.error("Error saving publish settings:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      form,
      globalForm,
      advanceStep,
      setActiveField,
      invalidateCache,
      queryClient,
      updateSessionWithLocation,
      router,
    ],
  );

  // Check if event is cancelled
  const isEventCancelled =
    eventData?.data &&
    typeof eventData.data === "object" &&
    "status" in eventData.data &&
    typeof eventData.data.status === "string"
      ? (eventData.data as { status: string }).status === "cancelled"
      : false;

  return (
    <div className="space-y-8">
      {/* Warning message for cancelled events */}
      {isEventCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <h3 className="text-sm font-medium text-red-800">
              Event is Cancelled
            </h3>
          </div>
          <p className="text-sm text-red-700 mt-1">
            This event has been cancelled and cannot be reactivated or drafted.
            You can only view the event details or create a new event.
          </p>
        </div>
      )}

      {isLoading ? (
        <SavingState
          title="Saving your event..."
          description="We're securing your publish settings and updating the event. You'll be redirected when complete."
        />
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8"
          >
            {/* Reminder Email Section */}
            <div className="space-y-6 border-b border-gray-200 pb-6">
              <div className="space-y-4">
                <h2 className="text-xl font-bold title-header">
                  Reminder Email Settings
                </h2>
                <p className="text-sm text-gray-500">
                  Configure when reminder emails should be sent to attendees
                </p>

                <FormField
                  control={control}
                  name="reminder_email_before_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Send Reminder Email
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                          }}
                          onOpenChange={() => field.onBlur()}
                        >
                          <SelectTrigger className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB]">
                            <SelectValue placeholder="Select reminder timing" />
                          </SelectTrigger>
                          <SelectContent>
                            {days.map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day} day{day !== 1 ? "s" : ""} before
                              </SelectItem>
                            ))}
                            {extraOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value.toString()}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Type Section */}
            <div className="space-y-6 border-b border-gray-200 pb-6">
              <div className="space-y-4">
                <h2 className="text-xl font-bold title-header">
                  Event Submission Type
                </h2>
                <p className="text-sm text-gray-500">
                  Choose how you want to handle this event
                </p>

                <FormField
                  control={control}
                  name="submit_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Submission Type
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                value="active"
                                disabled={isEventCancelled || readOnly}
                              />
                            </FormControl>
                            <FormLabel
                              className={`font-normal ${
                                isEventCancelled ? "text-gray-400" : ""
                              }`}
                            >
                              Submit Event (Publish immediately)
                              {isEventCancelled && (
                                <span className="block text-xs text-red-500 mt-1">
                                  Cannot reactivate cancelled events
                                </span>
                              )}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem
                                value="draft"
                                disabled={isEventCancelled || readOnly}
                              />
                            </FormControl>
                            <FormLabel
                              className={`font-normal ${
                                isEventCancelled ? "text-gray-400" : ""
                              }`}
                            >
                              Save as Draft (Save for later editing)
                              {isEventCancelled && (
                                <span className="block text-xs text-red-500 mt-1">
                                  Cannot draft cancelled events
                                </span>
                              )}
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="is_duplicate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Want to Duplicate this event for another location?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) =>
                            field.onChange(value === "true")
                          }
                          defaultValue={field.value ? "true" : "false"}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="false" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              No i want to create new event
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="true" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Yes i want to duplicate this event for another
                              location
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Location Details Section (only show for duplicate) */}
            {isDuplicate && (
              <div className="space-y-6 border-b border-gray-200 pb-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-bold title-header">
                    Location Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose an existing location or add a new one for the
                    duplicated event
                  </p>
                  <DuplicateLocationFields
                    form={form}
                    eventLocationId={eventLocationId}
                    onFieldFocus={handleFieldFocus}
                    readOnly={readOnly}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || isEventCancelled || readOnly}
                variant="event-primary"
                title={
                  readOnly
                    ? "View only"
                    : isEventCancelled
                      ? "Cannot submit cancelled events"
                      : ""
                }
              >
                {readOnly
                  ? "View only"
                  : isLoading
                    ? "Saving..."
                    : "Submit Event"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
