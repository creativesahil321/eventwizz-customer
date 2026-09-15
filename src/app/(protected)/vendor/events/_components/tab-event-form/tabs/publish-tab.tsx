"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsService } from "@/services/vendor/events/events.service";
import { Form } from "@/components/ui/form";
import { StepEightType, stepEightSchema } from "../schema";
import { useEventFormContext } from "../../events-form-provider";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getVendorPublishCopy,
  resolveVendorEventLifecycle,
} from "../../../_lib/vendor-event-lifecycle";
import { getVendorDatesPublishIssue } from "../../../_lib/vendor-dates-publish";
import {
  EVENT_REMINDER_DEFAULT_DAYS,
  EVENT_REMINDER_WEEK_OPTIONS,
  reminderDaysToSelectValue,
} from "@/lib/event-reminder-weeks";
import { Input } from "@/components/ui/input";
import {
  MENU_CHOICES_REMINDER_DEFAULT_DAYS,
  MENU_CHOICES_REMINDER_MIN_DAYS,
  hydrateMenuChoicesReminderDays,
  serializeMenuChoicesReminderDays,
} from "@/app/(protected)/vendor/events/_lib/menu-choices-reminder-days";

function ChoiceOption({
  selected,
  title,
  description,
  disabled,
}: {
  selected: boolean;
  title: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-start gap-3 rounded-lg border p-3 text-left transition-colors sm:p-4",
        selected
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-input hover:border-[var(--color-primary)]/40 hover:bg-muted/40",
        disabled && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-xs",
          selected && "border-[var(--color-primary)]",
        )}
      >
        {selected ? (
          <span className="size-2 rounded-full bg-[var(--color-primary,#009ead)]" />
        ) : null}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function PublishTab() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateSessionWithLocation = useUpdateSessionWithLocation();
  const {
    form: globalForm,
    advanceStep,
    setActiveField,
    setActiveStep,
    setFinalizeBusy,
    readOnly,
  } = useEventFormContext();

  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  const savedStepEight = globalForm.getValues().stepEight;

  const form = useForm<StepEightType>({
    resolver: zodResolver(stepEightSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      step: 8,
      event_id: getEventId() || 0,
      reminder_email_before_days:
        savedStepEight?.reminder_email_before_days ||
        EVENT_REMINDER_DEFAULT_DAYS,
      reminder_menu_choices_before_days: hydrateMenuChoicesReminderDays(
        savedStepEight?.reminder_menu_choices_before_days,
      ),
      generate_qr_code: savedStepEight?.generate_qr_code === true,
      submit_type: savedStepEight?.submit_type || "draft",
      is_duplicate: savedStepEight?.is_duplicate ?? false,
      duplicate_target_type: savedStepEight?.duplicate_target_type || "existing",
      vendor_location_id: savedStepEight?.vendor_location_id,
      city: savedStepEight?.city || "",
      address: savedStepEight?.address || "",
      contact_number: savedStepEight?.contact_number || "",
    },
  });

  const { control, watch } = form;
  const submitType = watch("submit_type") || "draft";
  const isDuplicate = watch("is_duplicate") || false;
  const eventLocationId = globalForm.watch("stepOne.vendor_location_id");

  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField],
  );

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        globalForm.setValue("stepEight", value as StepEightType);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm]);

  useEffect(() => {
    setFinalizeBusy(isLoading);
    return () => setFinalizeBusy(false);
  }, [isLoading, setFinalizeBusy]);

  useEffect(() => {
    if (!isDuplicate) return;
    void syncVendorLocationsCache(queryClient);
  }, [isDuplicate, queryClient]);

  const params = useParams<{ eventID: string }>();
  const eventId = Array.isArray(params?.eventID)
    ? params?.eventID[0]
    : params?.eventID;
  const { invalidateCache, eventData } = useEventData(eventId, false);
  const isLiveEvent =
    resolveVendorEventLifecycle({
      is_live: globalForm.watch("is_live"),
      has_bookings: globalForm.watch("has_bookings"),
    }).isLive || resolveVendorEventLifecycle(eventData).isLive;
  const publishCopy = getVendorPublishCopy(isLiveEvent);

  useEffect(() => {
    const next = globalForm.getValues("stepEight.submit_type");
    if (!next) return;
    if (form.getValues("submit_type") !== next) {
      form.setValue("submit_type", next);
    }
  }, [form, globalForm, isLiveEvent]);

  const handleSubmit = useCallback(
    async (data: StepEightType) => {
      setIsLoading(true);

      try {
        const datesIssue = getVendorDatesPublishIssue(globalForm.getValues());
        if (datesIssue) {
          toast.error(datesIssue.message);
          if (typeof datesIssue.roomIndex === "number") {
            globalForm.setValue(
              "stepTwo.active_room_index",
              datesIssue.roomIndex,
            );
          }
          await setActiveStep(3);
          setIsLoading(false);
          return;
        }

        const isValid = await form.trigger();

        if (!isValid) {
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          if (errorFields.length > 0) {
            setActiveField(errorFields[0]);
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

          toast.error("Please complete the required fields below.");
          setIsLoading(false);
          return;
        }

        const submissionData: StepEightType = {
          step: data.step,
          event_id: data.event_id,
          reminder_email_before_days: data.reminder_email_before_days,
          reminder_menu_choices_before_days:
            serializeMenuChoicesReminderDays(
              data.reminder_menu_choices_before_days,
            ),
          generate_qr_code: data.generate_qr_code === true,
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

        globalForm.setValue("stepEight", {
          ...globalForm.getValues().stepEight,
          ...data,
        });

        const response = await eventsService.storeStepEightData(submissionData);

        if (response && response.status) {
          await advanceStep(8, response);
          await invalidateCache?.();
          if (data.is_duplicate) {
            const syncedLocations = await syncVendorLocationsCache(queryClient);
            if (syncedLocations?.default_venue_location?.id) {
              await updateSessionWithLocation({
                vendor_location_id: syncedLocations.default_venue_location.id,
              });
            }
            void queryClient.invalidateQueries({ queryKey: ["locations"] });
          }
          toast.success(
            data.submit_type === "active"
              ? publishCopy.toastActive
              : publishCopy.toastDraft,
          );
          router.push("/vendor/events");
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
      setActiveStep,
      invalidateCache,
      queryClient,
      updateSessionWithLocation,
      router,
      publishCopy.toastActive,
      publishCopy.toastDraft,
    ],
  );

  const isEventCancelled =
    eventData?.data &&
    typeof eventData.data === "object" &&
    "status" in eventData.data &&
    typeof eventData.data.status === "string"
      ? (eventData.data as { status: string }).status === "cancelled"
      : false;

  return (
    <div className="space-y-6">
      {isEventCancelled && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-medium">This event is cancelled</p>
          <p className="mt-0.5 text-red-900/90">
            Cancelled events cannot be published or saved as draft. You can
            review the details or create a new event.
          </p>
        </div>
      )}

      {isLoading && (
        <SavingState
          title={
            submitType === "active"
              ? publishCopy.savingActive
              : publishCopy.savingDraft
          }
          description="We are updating your settings. You will be redirected when this is complete."
        />
      )}

      <Form {...form}>
        <form
          id="vendor-event-publish-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className={isLoading ? "hidden" : "space-y-8"}
          aria-busy={isLoading}
        >
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold title-header">
                {publishCopy.statusTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {publishCopy.statusDescription}
              </p>
            </div>

            <FormField
              control={control}
              name="submit_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid gap-3"
                      disabled={isEventCancelled || readOnly || isLoading}
                    >
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="active"
                            disabled={isEventCancelled || readOnly}
                            className="sr-only"
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            "block cursor-pointer font-normal",
                            (isEventCancelled || readOnly) &&
                              "cursor-not-allowed",
                          )}
                          onClick={() => {
                            if (!isEventCancelled && !readOnly) {
                              field.onChange("active");
                            }
                          }}
                        >
                          <ChoiceOption
                            selected={field.value === "active"}
                            disabled={isEventCancelled || readOnly}
                            title={publishCopy.activeTitle}
                            description={publishCopy.activeDescription}
                          />
                        </FormLabel>
                      </FormItem>
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="draft"
                            disabled={isEventCancelled || readOnly}
                            className="sr-only"
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            "block cursor-pointer font-normal",
                            (isEventCancelled || readOnly) &&
                              "cursor-not-allowed",
                          )}
                          onClick={() => {
                            if (!isEventCancelled && !readOnly) {
                              field.onChange("draft");
                            }
                          }}
                        >
                          <ChoiceOption
                            selected={field.value === "draft"}
                            disabled={isEventCancelled || readOnly}
                            title={publishCopy.draftTitle}
                            description={publishCopy.draftDescription}
                          />
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  {isEventCancelled ? (
                    <p className="text-xs text-red-600">
                      Cancelled events cannot be published or saved as a draft
                      again.
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold title-header">
                Door entry QR
              </h2>
              <p className="text-sm text-muted-foreground">
                After a guest books, they receive a booking invoice. You can
                print a unique QR code on that invoice so door staff can scan
                it from Door Scan and let them into the venue.
              </p>
            </div>

            <FormField
              control={control}
              name="generate_qr_code"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-medium">
                    Show a QR scanner code on the booking invoice?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) =>
                        field.onChange(value === "true")
                      }
                      value={field.value === true ? "true" : "false"}
                      className="grid gap-3"
                      disabled={readOnly || isLoading}
                    >
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="false"
                            className="sr-only"
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            "block cursor-pointer font-normal",
                            readOnly && "cursor-not-allowed",
                          )}
                          onClick={() => {
                            if (!readOnly) field.onChange(false);
                          }}
                        >
                          <ChoiceOption
                            selected={field.value !== true}
                            disabled={readOnly}
                            title="No — invoice only, no door QR"
                            description="The invoice stays a receipt. Guests will need another check-in method at the entrance."
                          />
                        </FormLabel>
                      </FormItem>
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="true"
                            className="sr-only"
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            "block cursor-pointer font-normal",
                            readOnly && "cursor-not-allowed",
                          )}
                          onClick={() => {
                            if (!readOnly) field.onChange(true);
                          }}
                        >
                          <ChoiceOption
                            selected={field.value === true}
                            disabled={readOnly}
                            title="Yes — show the door-entry QR"
                            description="Each invoice includes a unique QR code. Scan it at the door to confirm the booking and welcome the guest in."
                          />
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold title-header">
                Duplicate location
              </h2>
              <p className="text-sm text-muted-foreground">
                Optional. Copy this event to another venue after you save.
              </p>
            </div>

            <FormField
              control={control}
              name="is_duplicate"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) =>
                        field.onChange(value === "true")
                      }
                      value={field.value ? "true" : "false"}
                      className="grid gap-3"
                      disabled={readOnly || isLoading}
                    >
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="false"
                            className="sr-only"
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            "block cursor-pointer font-normal",
                            readOnly && "cursor-not-allowed",
                          )}
                          onClick={() => {
                            if (!readOnly) field.onChange(false);
                          }}
                        >
                          <ChoiceOption
                            selected={!field.value}
                            disabled={readOnly}
                            title={publishCopy.duplicateKeepTitle}
                            description={publishCopy.duplicateKeepDescription}
                          />
                        </FormLabel>
                      </FormItem>
                      <FormItem className="space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="true"
                            className="sr-only"
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormLabel
                          className={cn(
                            "block cursor-pointer font-normal",
                            readOnly && "cursor-not-allowed",
                          )}
                          onClick={() => {
                            if (!readOnly) field.onChange(true);
                          }}
                        >
                          <ChoiceOption
                            selected={Boolean(field.value)}
                            disabled={readOnly}
                            title="Yes, copy to another location"
                            description="Create a copy at an existing venue or a new location."
                          />
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {isDuplicate && (
            <section className="space-y-4">
              <DuplicateLocationFields
                form={form}
                eventLocationId={eventLocationId}
                onFieldFocus={handleFieldFocus}
                readOnly={readOnly}
              />
            </section>
          )}

          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold title-header">
                Reminder email
              </h2>
              <p className="text-sm text-muted-foreground">
                When should booked customers get a reminder?
              </p>
            </div>

            <FormField
              control={control}
              name="reminder_email_before_days"
              render={({ field }) => (
                <FormItem className="max-w-md">
                  <FormLabel className="text-sm font-medium">
                    Send reminder
                  </FormLabel>
                  <FormControl>
                      <Select
                      value={reminderDaysToSelectValue(field.value)}
                      onValueChange={(value) => {
                        field.onChange(Number(value));
                      }}
                      onOpenChange={() => field.onBlur()}
                      disabled={isLoading || readOnly}
                    >
                      <SelectTrigger className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB]">
                        <SelectValue placeholder="Select reminder timing" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_REMINDER_WEEK_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.days}
                            value={option.days.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Reminder emails go to customers who have booked this event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold title-header">
                Menu choices reminder
              </h2>
              <p className="text-sm text-muted-foreground">
                When should booked customers be reminded to submit menu choices?
              </p>
            </div>

            <FormField
              control={control}
              name="reminder_menu_choices_before_days"
              render={({ field }) => (
                <FormItem className="max-w-md">
                  <FormLabel className="text-sm font-medium">
                    Send menu choices reminder X days before event
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={MENU_CHOICES_REMINDER_MIN_DAYS}
                      step={1}
                      placeholder={String(MENU_CHOICES_REMINDER_DEFAULT_DAYS)}
                      disabled={isLoading || readOnly}
                      className="w-full h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                      name={field.name}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "") {
                          field.onChange(null);
                          return;
                        }
                        const parsed = Number.parseInt(value, 10);
                        field.onChange(Number.isNaN(parsed) ? value : parsed);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Default {MENU_CHOICES_REMINDER_DEFAULT_DAYS} days. Minimum{" "}
                    {MENU_CHOICES_REMINDER_MIN_DAYS} days. Leave empty to use
                    the default.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
        </form>
      </Form>
    </div>
  );
}
