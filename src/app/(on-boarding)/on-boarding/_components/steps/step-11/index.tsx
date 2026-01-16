"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardContent, CardHeader, OnboardingCard } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFormContext } from "../../form-provider";
import { stepElevenSchema, StepElevenType } from "../../form-provider/schema";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import {
  OnboardingTitle,
  OnboardingSectionTitle,
  RadioButtonLabel,
} from "@/components/ui/typography";
import { LoaderCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GoogleLocationSearch from "./google-location-search";
import { fetchLocationDetails } from "./_lib/actions";
import { env } from "@/env";
import { useDomainSuggestions } from "./_lib/hooks/useDomainSuggestions";
import { Loader2, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEventId } from "../../../_lib/hooks/useEventId";

// Days options for reminder emails
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const extraOptions = [
  { value: 60, label: "Before 2 Months" },
  { value: 90, label: "Before 3 Months" },
  { value: 120, label: "Before 4 Months" },
  { value: 180, label: "Before 6 Months" },
];

export default function StepEleven() {
  const { form: globalForm, save } = useFormContext();
  const { update } = useSession();
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Domain suggestions
  const {
    suggestions,
    isLoading: isGeneratingSuggestions,
    error: suggestionsError,
    generateSuggestions,
    selectedDomain,
    setSelectedDomain,
  } = useDomainSuggestions();

  // Function to get a user-friendly error message
  const getErrorMessage = (error: string) => {
    if (
      error.includes("explicit") ||
      error.includes("cannotprovide") ||
      error.includes("content") ||
      error.includes("inappropriate")
    ) {
      return "This subdomain name may not be appropriate for a professional event venue. Please try a different name.";
    }
    if (error.includes("model") || error.includes("API")) {
      return "Unable to generate suggestions at the moment. Please try again.";
    }
    // Don't truncate error messages - let them display fully
    return error;
  };

  // Get venue info from global form
  const venueName = globalForm.getValues("stepOne.name") || "";
  const venueType = "event venue"; // Could be enhanced to get from form data
  const venueLocation = globalForm.getValues("stepOne.city") || "";

  // Collapsible section states
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(true);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const eventId = useEventId(globalForm, "stepEleven");

  const form = useForm<StepElevenType>({
    resolver: zodResolver(stepElevenSchema),
    defaultValues: {
      step: 11 as const,
      event_id: eventId,
      reminder_email_before_days:
        globalForm.getValues().stepEleven?.reminder_email_before_days || 10,
      submit_type: "submit",
      address: globalForm.getValues().stepEleven?.address || "",
      city: globalForm.getValues().stepEleven?.city || "",
      contact_number: globalForm.getValues().stepEleven?.contact_number || "",
      domain: globalForm.getValues().stepEleven?.domain || "",
      confirm_domain:
        globalForm.getValues().stepEleven?.confirm_domain || false,
    },
    mode: "onChange",
  });

  // Watch reminder email configuration state
  const showReminderDays =
    form.watch("reminder_email_before_days") !== undefined;

  // Submit handler for the form
  const onSubmit = async (values: StepElevenType) => {
    const data = values as StepElevenType;
    try {
      // Update global form with Step data
      globalForm.setValue("stepEleven", data);

      // Save form data
      await save();

      // Define the type for our payload
      type StepElevenPayload = {
        step: 11;
        event_id: number;
        submit_type: "duplicate" | "submit";
        address?: string;
        city?: string;
        contact_number?: string;
        reminder_email_before_days?: number;
        domain: string;
        confirm_domain: boolean;
      };

      // Prepare payload - only include what's needed
      const payload: StepElevenPayload = {
        step: 11,
        event_id: data.event_id,
        submit_type: data.submit_type,
        domain: data.domain,
        confirm_domain: data.confirm_domain,
      };

      // Only add address, city, and contact_number for duplicate
      if (data.submit_type === "duplicate") {
        payload.address = data.address;
        payload.city = data.city;
        payload.contact_number = data.contact_number;
      }

      // Add reminder days if configured
      if (showReminderDays) {
        payload.reminder_email_before_days =
          data.reminder_email_before_days || 10;
      }

      // Store Step data with API - backend now only returns success message
      const response = await onboardingService.storeStepElevenData(payload);

      // Update session if the API response is successful
      if (response.status) {
        // Update session with step completion
        await update({
          on_boarding_step: 11,
        });

        // Redirect to welcome page
        setTimeout(() => {
          window.location.href = "/welcome/select-location?onboarded=true";
        }, 1500);
      }

      // Handle publishing or just saving
      if (data.submit_type === "submit") {
        await handlePublish(
          showReminderDays ? data.reminder_email_before_days || 10 : undefined
        );
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      // Error toast is handled by axios interceptor
    }
  };

  // Publishing process simulation
  const handlePublish = async (reminderDays?: number) => {
    try {
      setPublishing(true);
      setProgress(0);
      setProgressMessage("Preparing your event for publishing...");

      // Simulate publishing process
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgress(20);
      setProgressMessage("Validating event details...");

      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress(40);
      setProgressMessage("Setting up your event page...");

      await new Promise((resolve) => setTimeout(resolve, 1200));
      setProgress(60);
      setProgressMessage("Uploading images and media...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgress(80);
      setProgressMessage("Almost done...");

      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgress(100);

      // Define the type for our payload
      type StepElevenPayload = {
        step: 11;
        event_id: number;
        submit_type: "duplicate" | "submit";
        address?: string;
        city?: string;
        contact_number?: string;
        reminder_email_before_days?: number;
        domain: string;
        confirm_domain: boolean;
      };

      // Prepare payload - only include what's needed
      const payload: StepElevenPayload = {
        step: 11,
        event_id: eventId,
        submit_type: "submit",
        domain: form.getValues().domain,
        confirm_domain: form.getValues().confirm_domain,
      };

      // Only add address, city, and contact_number for duplicate
      if (form.getValues().submit_type === "duplicate") {
        payload.address = form.getValues().address || "";
        payload.city = form.getValues().city || "";
        payload.contact_number = form.getValues().contact_number || "";
      }

      // Only add reminder days if configured
      if (reminderDays !== undefined) {
        payload.reminder_email_before_days = reminderDays;
      }

      // Actually submit the event via API - backend now only returns success message
      const publishResponse = await onboardingService.storeStepElevenData(
        payload
      );

      if (publishResponse && publishResponse.status) {
        // Update session with step completion
        await update({
          on_boarding_step: 11,
        });

        // Redirect to welcome page
        setTimeout(() => {
          window.location.href = "/welcome/select-location?onboarded=true";
        }, 1500);
      } else {
        throw new Error("Failed to submit event");
      }
    } catch (error) {
      console.error("Error during publishing:", error);
      // Error toast is handled by axios interceptor
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-transparent">
      <div className="w-full max-w-4xl mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              Almost Done! Let&apos;s Submit Your Event
            </OnboardingTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            {publishing ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-8">
                <div className="flex items-center space-x-2">
                  <LoaderCircle className="animate-spin text-primary h-8 w-8" />
                  <span className="text-lg font-medium">
                    {progressMessage || "Publishing your event..."}
                  </span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Hidden fields */}
                  <input type="hidden" {...form.register("step")} />
                  <input
                    type="hidden"
                    {...form.register("event_id", {
                      valueAsNumber: true,
                    })}
                  />

                  {/* Collapsible Sections */}
                  <div className="space-y-4">
                    {/* Domain Configuration Section */}
                    <Collapsible
                      open={isDomainOpen}
                      onOpenChange={setIsDomainOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex w-full justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">🌐</span>
                            <span className="font-medium">
                              Website Domain Configuration
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isDomainOpen ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="space-y-4 mt-4">
                          <OnboardingSectionTitle>
                            Choose Your Website Domain
                          </OnboardingSectionTitle>
                          <p className="text-sm text-gray-600">
                            Your website will be at:{" "}
                            <strong>
                              {(
                                selectedDomain ||
                                venueName ||
                                "Enter subdomain name"
                              ).replace(/\.com$|\.eventwizz\.com$/g, "")}
                              .eventwizz.com
                            </strong>
                          </p>

                          <div className="space-y-3">
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">
                                New subdomain:
                              </p>
                              <div className="relative">
                                <Input
                                  placeholder="Enter subdomain name"
                                  value={selectedDomain || ""}
                                  onChange={(e) => {
                                    const value = e.target.value
                                      .toLowerCase()
                                      .replace(/[^a-z0-9-]/g, "");
                                    setSelectedDomain(value);
                                    form.setValue("domain", value);

                                    // Generate suggestions based on typing
                                    if (value && value.length >= 3) {
                                      generateSuggestions(
                                        value, // Use the typed value
                                        venueType,
                                        venueLocation
                                      );
                                    }
                                  }}
                                  className="pr-20 h-9 bg-white border-gray-300 text-sm"
                                  maxLength={63}
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center text-sm text-gray-500">
                                  .eventwizz.com
                                </div>
                                {selectedDomain && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDomain("");
                                      form.setValue("domain", "");
                                    }}
                                    className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    title="Clear domain"
                                  >
                                    ✕
                                  </button>
                                )}
                                {isGeneratingSuggestions && (
                                  <div className="absolute right-20 top-1/2 transform -translate-y-1/2">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {suggestionsError && (
                              <div className="flex items-start gap-2 mt-2 w-full">
                                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-white text-xs font-bold">
                                    !
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 w-full">
                                  <p className="text-sm text-red-600 leading-relaxed break-words overflow-wrap-anywhere">
                                    {getErrorMessage(suggestionsError)}
                                  </p>
                                  {(suggestionsError.includes("explicit") ||
                                    suggestionsError.includes(
                                      "cannotprovide"
                                    ) ||
                                    suggestionsError.includes("content")) && (
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-500 mb-2">
                                        Try these alternatives:
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {[
                                          "venue",
                                          "events",
                                          "booking",
                                          "venue123",
                                          "myvenue",
                                        ].map((alt, index) => (
                                          <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                              setSelectedDomain(alt);
                                              form.setValue("domain", alt);
                                            }}
                                            className="px-3 py-1.5 text-sm rounded-full border bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
                                          >
                                            {alt}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {suggestions.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {suggestions.map((suggestion, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => {
                                        setSelectedDomain(suggestion.domain);
                                        form.setValue(
                                          "domain",
                                          suggestion.domain
                                        );
                                      }}
                                      className={`px-3 py-1.5 text-sm rounded-full border transition-all duration-200 hover:shadow-sm ${
                                        selectedDomain === suggestion.domain
                                          ? "bg-blue-100 border-blue-300 text-blue-700 shadow-sm"
                                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                                      }`}
                                    >
                                      {suggestion.domain.replace(
                                        /\.com$|\.eventwizz\.com$/g,
                                        ""
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Show message when no suggestions available but user is typing */}
                            {isGeneratingSuggestions &&
                              (selectedDomain || "").length >= 3 && (
                                <div className="flex items-center gap-2 text-xs text-blue-600 mt-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Finding suggestions...
                                </div>
                              )}

                            <FormField
                              control={form.control}
                              name="domain"
                              render={({ field }) => (
                                <FormItem className="hidden">
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="confirm_domain"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-start gap-3">
                                    <FormControl>
                                      <input
                                        type="checkbox"
                                        checked={field.value || false}
                                        onChange={(e) => {
                                          field.onChange(e.target.checked);
                                        }}
                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        disabled={!selectedDomain}
                                      />
                                    </FormControl>
                                    <div className="flex-1">
                                      <FormLabel className="text-sm font-medium cursor-pointer">
                                        I confirm this domain
                                      </FormLabel>
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Reminder Email Section */}
                    <Collapsible
                      open={isReminderOpen}
                      onOpenChange={setIsReminderOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex w-full justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-orange-600">📧</span>
                            <span className="font-medium">
                              Reminder Email Settings
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isReminderOpen ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="space-y-4 mt-4">
                          <FormField
                            control={form.control}
                            name="reminder_email_before_days"
                            render={({ field }) => (
                              <FormItem className="relative">
                                <OnboardingSectionTitle>
                                  Would You Like To Configure Reminder Emails?
                                </OnboardingSectionTitle>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={(value) => {
                                      if (value === "yes") {
                                        field.onChange(10);
                                      } else {
                                        field.onChange(undefined);
                                      }
                                    }}
                                    defaultValue={
                                      field.value !== undefined ? "yes" : "no"
                                    }
                                    className="flex items-center space-x-4 mt-4"
                                  >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem
                                          value="yes"
                                          className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                        />
                                      </FormControl>
                                      <RadioButtonLabel>
                                        Configure Now
                                      </RadioButtonLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem
                                          value="no"
                                          className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                        />
                                      </FormControl>
                                      <RadioButtonLabel>
                                        Configure Later
                                      </RadioButtonLabel>
                                    </FormItem>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {showReminderDays && (
                            <FormField
                              control={form.control}
                              name="reminder_email_before_days"
                              render={({ field }) => {
                                // Convert the value to string for the Select component
                                const defaultValue =
                                  field.value !== undefined
                                    ? field.value.toString()
                                    : "10";

                                return (
                                  <FormItem className="relative">
                                    <OnboardingSectionTitle>
                                      How Many Days Before The Event Do You Want
                                      To Remind Customers To Pay Their Balance?
                                    </OnboardingSectionTitle>
                                    <Select
                                      onValueChange={(value) => {
                                        const numValue = parseInt(value, 10);
                                        field.onChange(numValue);
                                      }}
                                      value={defaultValue}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="w-full h-10 bg-[#F9FAFB] border-[#E5E7EB] mt-4">
                                          <SelectValue placeholder="Days" />
                                        </SelectTrigger>
                                      </FormControl>

                                      <SelectContent className="w-full">
                                        {[
                                          ...days,
                                          ...extraOptions.map((o) => o.value),
                                        ].map((day) => {
                                          const extra = extraOptions.find(
                                            (o) => o.value === day
                                          );
                                          return (
                                            <SelectItem
                                              key={day}
                                              value={day.toString()}
                                            >
                                              {extra
                                                ? extra.label
                                                : `${day} ${
                                                    day === 1 ? "Day" : "Days"
                                                  }`}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Duplicate Event Section */}
                    <Collapsible
                      open={isDuplicateOpen}
                      onOpenChange={setIsDuplicateOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex w-full justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-purple-600">📋</span>
                            <span className="font-medium">
                              Event Duplication Options
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isDuplicateOpen ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="space-y-4 mt-4">
                          <FormField
                            control={form.control}
                            name="submit_type"
                            render={({ field }) => (
                              <FormItem className="relative">
                                <OnboardingSectionTitle>
                                  Would You Like To Duplicate The Event You Just
                                  Created And Add It To Another Location?{" "}
                                  <span className="text-red-500">*</span>{" "}
                                  Don&apos;t Worry It Can Be Edited In The
                                  Dashboard.
                                </OnboardingSectionTitle>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Force re-render by setting state directly
                                      form.setValue(
                                        "submit_type",
                                        value as "duplicate" | "submit"
                                      );
                                    }}
                                    defaultValue={field.value || "submit"}
                                    className="flex items-center space-x-4 mt-4"
                                  >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem
                                          value="duplicate"
                                          className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                        />
                                      </FormControl>
                                      <RadioButtonLabel>
                                        Yes Duplicate It
                                      </RadioButtonLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <RadioGroupItem
                                          value="submit"
                                          className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                        />
                                      </FormControl>
                                      <RadioButtonLabel>
                                        No Don&apos;t Duplicate It
                                      </RadioButtonLabel>
                                    </FormItem>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Location Fields Section - Only show when duplicating */}
                    {form.watch("submit_type") === "duplicate" && (
                      <Collapsible
                        open={isLocationOpen}
                        onOpenChange={setIsLocationOpen}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="flex w-full justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-green-600">📍</span>
                              <span className="font-medium">
                                Additional Location Details
                              </span>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isLocationOpen ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 border border-gray-200 rounded-lg bg-gray-50/50">
                          <div className="space-y-4 mt-4">
                            <FormField
                              control={form.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">
                                    Address{" "}
                                    <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <GoogleLocationSearch
                                      apiKey={
                                        env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                                      }
                                      value={field.value || ""}
                                      onChange={(value) =>
                                        field.onChange(value)
                                      }
                                      onSelect={(placeId) =>
                                        fetchLocationDetails(form, placeId)
                                      }
                                      placeholder="Search for a location..."
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">
                                    City <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter city"
                                      className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="contact_number"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">
                                    Contact Number{" "}
                                    <span className="text-red-500">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="tel"
                                      inputMode="numeric"
                                      placeholder="Enter contact number"
                                      className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                      onChange={(e) => {
                                        // Only allow numbers, spaces, +, -, and parentheses
                                        const value = e.target.value.replace(
                                          /[^0-9+\-() ]/g,
                                          ""
                                        );
                                        field.onChange(value);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>

                  {/* Submit Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        type="submit"
                        variant="event-primary"
                        className="rounded-full px-10 py-2 h-12"
                        disabled={
                          publishing ||
                          !selectedDomain ||
                          !form.watch("confirm_domain")
                        }
                      >
                        {publishing ? (
                          <>
                            <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            {form.watch("submit_type") === "duplicate"
                              ? "Duplicate & Submit"
                              : "Submit"}
                          </>
                        )}
                      </Button>
                      {!selectedDomain && (
                        <p className="text-sm text-gray-500 whitespace-nowrap">
                          Please select a subdomain to continue
                        </p>
                      )}
                      {selectedDomain && !form.watch("confirm_domain") && (
                        <p className="text-sm text-gray-500 whitespace-nowrap">
                          Please confirm your selection
                        </p>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
}
